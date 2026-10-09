package com.netflix.authservice.dto;

import com.netflix.authservice.model.Role;
import com.netflix.authservice.model.User;

public record UserResponse(Long id, String email, String fullName, Role role) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
    }
}
