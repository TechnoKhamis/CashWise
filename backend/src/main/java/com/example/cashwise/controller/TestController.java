package com.example.cashwise.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TestController {
    
    @GetMapping("/hello")
    public String hello(Authentication authentication) {
        return "Hello! Your token is valid. Email: " + authentication.getName();
    }
}
