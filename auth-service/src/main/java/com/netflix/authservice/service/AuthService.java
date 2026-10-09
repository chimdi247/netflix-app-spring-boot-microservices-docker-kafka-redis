package com.netflix.authservice.service;

import com.netflix.authservice.dto.AuthResponse;
import com.netflix.authservice.dto.LoginRequest;
import com.netflix.authservice.dto.RegisterRequest;
import com.netflix.authservice.dto.UserResponse;
import com.netflix.authservice.exception.ApiException;
import com.netflix.authservice.metrics.AuthMetrics;
import com.netflix.authservice.model.Role;
import com.netflix.authservice.model.User;
import com.netflix.authservice.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthMetrics metrics;

    /** Compared against when the email is unknown, so "no such user" costs the same time as "wrong password". */
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuthMetrics metrics) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.metrics = metrics;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setFullName(request.fullName().trim());
        user.setPasswordHash(encoder.encode(request.password()));
        user.setRole(Role.USER); // self-registration never creates admins
        user.setLastLoginAt(LocalDateTime.now());

        try {
            user = users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // two registrations for the same email raced past the exists check
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

        metrics.registration();
        log.info("User registered: id={} role={}", user.getId(), user.getRole());
        return toResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = users.findByEmailIgnoreCase(normalize(request.email())).orElse(null);

        boolean valid;
        if (user == null) {
            encoder.matches(request.password(), dummyHash);
            valid = false;
        } else {
            valid = encoder.matches(request.password(), user.getPasswordHash()) && user.isEnabled();
        }

        metrics.login(valid);
        if (!valid) {
            log.warn("Failed login attempt");
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        user.setLastLoginAt(LocalDateTime.now());
        users.save(user);
        log.info("User logged in: id={} role={}", user.getId(), user.getRole());
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me(long userId) {
        return users.findById(userId)
                .filter(User::isEnabled)
                .map(UserResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
    }

    private AuthResponse toResponse(User user) {
        return new AuthResponse(jwt.generate(user), "Bearer", jwt.ttlSeconds(), UserResponse.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
