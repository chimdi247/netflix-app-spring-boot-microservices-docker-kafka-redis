package com.netflix.authservice.model;

public enum Role {
    /** Can browse and watch, and manage the catalog (add movies, upload videos, delete). */
    ADMIN,
    /** Can browse and watch. */
    USER
}
