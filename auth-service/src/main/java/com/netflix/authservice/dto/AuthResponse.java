package com.netflix.authservice.dto;

/** @param expiresIn token lifetime in seconds */
public record AuthResponse(String token, String tokenType, long expiresIn, UserResponse user) {
}
