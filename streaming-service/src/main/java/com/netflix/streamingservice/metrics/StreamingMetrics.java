package com.netflix.streamingservice.metrics;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

/**
 * Business metrics via the OpenTelemetry API (the Java agent provides the implementation).
 *   netflix_stream_requests_total{result="served|not_ready", cache="hit|miss"}   "play" clicks
 *   netflix_stream_playlists_signed_total                                        variant playlists signed
 */
@Component
public class StreamingMetrics {

    private static final AttributeKey<String> RESULT = AttributeKey.stringKey("result");
    private static final AttributeKey<String> CACHE = AttributeKey.stringKey("cache");

    private final LongCounter streamRequests;
    private final LongCounter playlistsSigned;

    public StreamingMetrics() {
        Meter meter = GlobalOpenTelemetry.getMeter("netflix.streaming-service");
        this.streamRequests = meter.counterBuilder("netflix.stream.requests")
                .setDescription("Streaming URL requests (a viewer pressed play)").setUnit("{request}").build();
        this.playlistsSigned = meter.counterBuilder("netflix.stream.playlists.signed")
                .setDescription("HLS playlists rewritten with pre-signed segment URLs").setUnit("{playlist}").build();
    }

    public void streamRequest(boolean served, boolean cacheHit) {
        streamRequests.add(1, Attributes.of(RESULT, served ? "served" : "not_ready", CACHE, cacheHit ? "hit" : "miss"));
    }

    public void playlistSigned() {
        playlistsSigned.add(1);
    }
}
