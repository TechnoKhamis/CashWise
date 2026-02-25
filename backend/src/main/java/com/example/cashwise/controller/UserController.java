package com.example.cashwise.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping("/bank-card")
    public Map<String, String> saveBankCard(@RequestBody Map<String, String> cardData) {
        // TODO: Save card data to database
        String bankName = cardData.get("bankName");
        String stripePaymentMethodId = cardData.get("stripePaymentMethodId");
        
        // For now, just return success
        return Map.of("message", "Card saved successfully");
    }
}
