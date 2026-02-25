package com.example.cashwise.controller;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Balance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/stripe")
public class StripeController {
    
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;
    
    @GetMapping("/balance")
    public ResponseEntity<?> getBalance() {
        try {
            Stripe.apiKey = stripeSecretKey;
            Balance balance = Balance.retrieve();
            
            Map<String, Object> response = new HashMap<>();
            response.put("available", balance.getAvailable());
            response.put("pending", balance.getPending());
            response.put("currency", balance.getAvailable().get(0).getCurrency());
            
            return ResponseEntity.ok(response);
        } catch (StripeException e) {
            return ResponseEntity.badRequest().body("Error fetching balance: " + e.getMessage());
        }
    }
}
