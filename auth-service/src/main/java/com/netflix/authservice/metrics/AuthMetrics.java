package com.netflix.authservice.metrics;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

/**
 * Business metrics, sent through the OpenTelemetry Java agent (no-op without the agent).
 * Prometheus names: netflix_auth_logins_total{result}, netflix_auth_registrations_total.
 */
@Component
public class AuthMetrics {

    private static final AttributeKey<String> RESULT = AttributeKey.stringKey("result");

    private final LongCounter logins;
    private final LongCounter registrations;

    public AuthMetrics() {
        Meter meter = GlobalOpenTelemetry.getMeter("netflix.auth-service");
        this.logins = meter.counterBuilder("netflix.auth.logins")
                .setDescription("Login attempts by result")
                .setUnit("{login}")
                .build();
        this.registrations = meter.counterBuilder("netflix.auth.registrations")
                .setDescription("Accounts created through self-registration")
                .setUnit("{user}")
                .build();
    }

    public void login(boolean success) {
        logins.add(1, Attributes.of(RESULT, success ? "success" : "failure"));
    }

    public void registration() {
        registrations.add(1);
    }
}
