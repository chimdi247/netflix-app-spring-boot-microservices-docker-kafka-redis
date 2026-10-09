package com.netflix.authservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Only the BCrypt encoder from spring-security-crypto is used. There is deliberately no Spring Security
 * filter chain: requests are authorised at the edge (nginx auth_request -> /internal/auth/verify).
 */
@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // cost factor 10, the same as the seeded admin hash in docker/mysql/init/03-seed-admin-user.sql
        return new BCryptPasswordEncoder(10);
    }
}
