package com.example.cashwise.controller;

import com.stripe.Stripe;
import com.stripe.model.Customer;
import com.stripe.param.CustomerCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.example.cashwise.dto.AuthRequest;
import com.example.cashwise.dto.AuthResponse;
import com.example.cashwise.dto.RegisterRequest;
import com.example.cashwise.entity.User;
import com.example.cashwise.repository.UserRepository;
import com.example.cashwise.security.JwtUtil;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            if (userRepository.existsByEmail(request.getEmail())) {
                return ResponseEntity.badRequest().body("Email already exists");
            }

            // Create Stripe customer (skip if test key not configured)
            String stripeCustomerId = null;
            if (stripeSecretKey != null && stripeSecretKey.startsWith("sk_test_") && !stripeSecretKey.contains("your_stripe")) {
                try {
                    Stripe.apiKey = stripeSecretKey; 

                    CustomerCreateParams params = CustomerCreateParams.builder()
                            .setName(request.getFullName())
                            .setEmail(request.getEmail())
                            .build();

                    Customer stripeCustomer = Customer.create(params);
                    stripeCustomerId = stripeCustomer.getId();
                } catch (Exception e) {
                    System.out.println("Stripe customer creation failed (continuing without): " + e.getMessage());
                    e.printStackTrace();
                }
            }

            // Save user with stripeCustomerId
            User user = new User(
                request.getFullName(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                stripeCustomerId
            );

            userRepository.save(user);

            String token = jwtUtil.generateToken(user.getEmail());
            return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getFullName()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
        }

        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getFullName()));
    }

    @GetMapping("/test/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }
    
    @PostMapping("/test/register")
    public ResponseEntity<?> testRegister(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // Save user without Stripe (for testing)
        User user = new User(
            request.getFullName(),
            request.getEmail(),
            passwordEncoder.encode(request.getPassword()),
            null
        );

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getFullName()));
    }
}