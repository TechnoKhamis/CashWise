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
}