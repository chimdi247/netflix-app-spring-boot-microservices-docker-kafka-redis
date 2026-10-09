package com.netflix.contentservice.metrics;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

/**
 * Business metrics via the OpenTelemetry API (the Java agent provides the implementation).
 *   netflix_movies_created_total{genre}
 *   netflix_movies_ready_total              movies that finished encoding and can be streamed
 *   netflix_movies_failed_total             movies whose encoding failed
 */
@Component
public class ContentMetrics {

    private static final AttributeKey<String> GENRE = AttributeKey.stringKey("genre");

    private final LongCounter created;
    private final LongCounter ready;
    private final LongCounter failed;

    public ContentMetrics() {
        Meter meter = GlobalOpenTelemetry.getMeter("netflix.content-service");
        this.created = meter.counterBuilder("netflix.movies.created")
                .setDescription("Movies added to the catalog").setUnit("{movie}").build();
        this.ready = meter.counterBuilder("netflix.movies.ready")
                .setDescription("Movies that became streamable").setUnit("{movie}").build();
        this.failed = meter.counterBuilder("netflix.movies.failed")
                .setDescription("Movies whose encoding failed").setUnit("{movie}").build();
    }

    public void movieCreated(String genre) {
        created.add(1, Attributes.of(GENRE, genre == null ? "UNKNOWN" : genre));
    }

    public void movieReady() {
        ready.add(1);
    }

    public void movieFailed() {
        failed.add(1);
    }
}
