package com.example.cashwise.controller;

import com.stripe.Stripe;
import com.stripe.model.SetupIntent;
import com.stripe.param.SetupIntentCreateParams;
import com.example.cashwise.entity.User;
import com.example.cashwise.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private UserRepository userRepository;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    // Step 1 — frontend calls this to get clientSecret
    @PostMapping("/setup-intent")
    public ResponseEntity<?> createSetupIntent(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            Stripe.apiKey = stripeSecretKey;

            User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

            SetupIntentCreateParams params = SetupIntentCreateParams.builder()
                    .setCustomer(user.getStripeCustomerId())
                    .addPaymentMethodType("card")
                    .build();

            SetupIntent setupIntent = SetupIntent.create(params);

            return ResponseEntity.ok(Map.of("clientSecret", setupIntent.getClientSecret()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed: " + e.getMessage());
        }
    }

    // Step 2 — frontend calls this after stripe.confirmCardSetup() succeeds
    @PostMapping("/save-card")
    public ResponseEntity<?> saveCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        try {
            String paymentMethodId = body.get("stripePaymentMethodId");
            String bankName = body.get("bankName");

            User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
            user.setStripePaymentMethodId(paymentMethodId);
            // optional: user.setBankName(bankName); if you have that field
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Card saved successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed: " + e.getMessage());
        }
    }

    // Step 3 — Charge the user's saved payment method and optionally transfer to recipient
    @PostMapping("/charge")
    public ResponseEntity<?> chargePayment(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        try {
            Stripe.apiKey = stripeSecretKey;

            User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
            
            if (user.getStripePaymentMethodId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "No payment method saved"));
            }

            // Get amount and convert to cents (Stripe uses smallest currency unit)
            Double amount = ((Number) body.get("amount")).doubleValue();
            String userCurrency = (String) body.getOrDefault("currency", "BHD");
            
            // Map unsupported currencies to USD for Stripe
            String stripeCurrency = "usd";
            long amountInCents;
            
            switch (userCurrency.toUpperCase()) {
                case "BHD":
                    // Convert BHD to USD (approximate rate: 1 BHD = 2.65 USD)
                    stripeCurrency = "usd";
                    amountInCents = Math.round(amount * 2.65 * 100); // USD uses 2 decimal places
                    break;
                case "USD":
                    stripeCurrency = "usd";
                    amountInCents = Math.round(amount * 100);
                    break;
                case "EUR":
                    stripeCurrency = "eur";
                    amountInCents = Math.round(amount * 100);
                    break;
                case "SAR":
                    stripeCurrency = "sar";
                    amountInCents = Math.round(amount * 100);
                    break;
                case "AED":
                    stripeCurrency = "aed";
                    amountInCents = Math.round(amount * 100);
                    break;
                default:
                    // Default to USD
                    stripeCurrency = "usd";
                    amountInCents = Math.round(amount * 100);
            }
            
            String recipientStripeId = (String) body.get("recipientStripeId");

            // Create PaymentIntent
            com.stripe.param.PaymentIntentCreateParams.Builder paramsBuilder = 
                com.stripe.param.PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency(stripeCurrency)
                    .setCustomer(user.getStripeCustomerId())
                    .setPaymentMethod(user.getStripePaymentMethodId())
                    .setConfirm(true)
                    .setOffSession(true)
                    .setDescription((String) body.getOrDefault("description", "Transaction payment"));

            // If recipient is provided, use destination charge (for connected accounts)
            if (recipientStripeId != null && !recipientStripeId.isEmpty()) {
                // Check if it's a connected account (starts with acct_)
                if (recipientStripeId.startsWith("acct_")) {
                    paramsBuilder.setTransferData(
                        com.stripe.param.PaymentIntentCreateParams.TransferData.builder()
                            .setDestination(recipientStripeId)
                            .build()
                    );
                } else {
                    // For customer IDs, we'll create a transfer after the charge
                    // This is handled below
                }
            }

            com.stripe.model.PaymentIntent paymentIntent = com.stripe.model.PaymentIntent.create(paramsBuilder.build());

            // If recipient is a customer (not connected account), verify and record
            if (recipientStripeId != null && !recipientStripeId.isEmpty() && !recipientStripeId.startsWith("acct_")) {
                try {
                    // Verify recipient customer exists
                    com.stripe.model.Customer recipientCustomer = com.stripe.model.Customer.retrieve(recipientStripeId);
                    
                    // Payment is charged, funds are held in your platform
                    // In production, you would implement proper payout logic here
                    return ResponseEntity.ok(Map.of(
                        "success", true,
                        "paymentIntentId", paymentIntent.getId(),
                        "status", paymentIntent.getStatus(),
                        "amount", amount,
                        "originalCurrency", userCurrency,
                        "stripeCurrency", stripeCurrency,
                        "recipient", recipientStripeId,
                        "recipientName", recipientCustomer.getName() != null ? recipientCustomer.getName() : "Unknown",
                        "recipientEmail", recipientCustomer.getEmail() != null ? recipientCustomer.getEmail() : "Unknown",
                        "note", "Payment charged successfully for recipient: " + recipientCustomer.getName()
                    ));
                } catch (Exception recipientError) {
                    // If recipient lookup fails, still return success for the charge
                    return ResponseEntity.ok(Map.of(
                        "success", true,
                        "paymentIntentId", paymentIntent.getId(),
                        "status", paymentIntent.getStatus(),
                        "amount", amount,
                        "originalCurrency", userCurrency,
                        "stripeCurrency", stripeCurrency,
                        "recipient", recipientStripeId,
                        "warning", "Payment charged but recipient verification failed: " + recipientError.getMessage()
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                "success", true,
                "paymentIntentId", paymentIntent.getId(),
                "status", paymentIntent.getStatus(),
                "amount", amount,
                "originalCurrency", userCurrency,
                "stripeCurrency", stripeCurrency,
                "recipient", recipientStripeId != null ? recipientStripeId : "none"
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
}