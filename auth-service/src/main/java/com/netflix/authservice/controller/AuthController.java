package com.netflix.authservice.controller;

import com.netflix.authservice.dto.AuthResponse;
import com.netflix.authservice.dto.LoginRequest;
import com.netflix.authservice.dto.RegisterRequest;
import com.netflix.authservice.dto.UserResponse;
import com.netflix.authservice.exception.ApiException;
import com.netflix.authservice.service.AuthService;
import com.netflix.authservice.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    /** POST /api/v1/auth/login */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /** POST /api/v1/auth/register: creates a USER account and signs it in. */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    /** GET /api/v1/auth/me: the signed-in user, from the Bearer token. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }
        try {
            Claims claims = jwtService.parse(authorization.substring(7).trim());
            return ResponseEntity.ok(authService.me(Long.parseLong(claims.getSubject())));
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }
}
