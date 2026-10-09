package com.netflix.authservice.controller;

import com.netflix.authservice.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Set;

/**
 * Forward-auth endpoint for the edge proxy.
 *
 * nginx calls it (auth_request) before it forwards a request to content, video or streaming service,
 * passing the original Authorization header, HTTP method and URI. The answer decides the request:
 *   200 = allowed (user identity is returned in X-User-* headers)
 *   401 = missing / invalid / expired token
 *   403 = valid token, but the role is not allowed to do this
 *
 * Rule: any non-read request on the catalog or on video upload needs the ADMIN role;
 * everything else just needs a valid token.
 *
 * This path is only reachable inside the Docker network (nginx marks its /_auth location "internal").
 */
@RestController
public class ForwardAuthController {

    private static final Set<String> READ_ONLY_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private static final String[] ADMIN_WRITE_PREFIXES = {"/api/v1/movies", "/api/v1/videos"};

    private final JwtService jwtService;

    public ForwardAuthController(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @GetMapping("/internal/auth/verify")
    public ResponseEntity<Void> verify(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-Original-Method", defaultValue = "GET") String method,
            @RequestHeader(value = "X-Original-URI", defaultValue = "/") String uri) {

        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Claims claims;
        try {
            claims = jwtService.parse(authorization.substring(7).trim());
        } catch (JwtException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String role = claims.get("role", String.class);
        if (requiresAdmin(method, uri) && !"ADMIN".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok()
                .header("X-User-Id", claims.getSubject())
                .header("X-User-Email", String.valueOf(claims.get("email")))
                .header("X-User-Role", String.valueOf(role))
                .build();
    }

    private static boolean requiresAdmin(String method, String uri) {
        if (READ_ONLY_METHODS.contains(method.toUpperCase(Locale.ROOT))) {
            return false;
        }
        for (String prefix : ADMIN_WRITE_PREFIXES) {
            if (uri.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
