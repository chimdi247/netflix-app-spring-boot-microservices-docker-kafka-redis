package com.netflix.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required") @Size(max = 100, message = "Name is too long") String fullName,
        @NotBlank(message = "Email is required") @Email(message = "Email is not valid")
        @Size(max = 255, message = "Email is too long") String email,
        // BCrypt only uses the first 72 bytes of the password
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password) {
}
