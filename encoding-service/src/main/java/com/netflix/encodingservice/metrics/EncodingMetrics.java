package com.netflix.encodingservice.metrics;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Business metrics via the OpenTelemetry API (the Java agent provides the implementation).
 *   netflix_encoding_jobs_total{result="success|failed"}
 *   netflix_encoding_duration_seconds{quality}       time FFmpeg needs per rendition ("1080p" ... "360p")
 *   netflix_encoding_total_duration_seconds          whole pipeline: download + encode + upload
 */
@Component
public class EncodingMetrics {

    private static final AttributeKey<String> RESULT = AttributeKey.stringKey("result");
    private static final AttributeKey<String> QUALITY = AttributeKey.stringKey("quality");

    // seconds; encoding takes from a few seconds (demo clip) to many minutes (feature film)
    private static final List<Double> BUCKETS = List.of(1.0, 2.0, 5.0, 10.0, 20.0, 30.0, 60.0, 120.0, 300.0, 600.0, 1800.0, 3600.0);

    private final LongCounter jobs;
    private final DoubleHistogram renditionDuration;
    private final DoubleHistogram totalDuration;

    public EncodingMetrics() {
        Meter meter = GlobalOpenTelemetry.getMeter("netflix.encoding-service");
        this.jobs = meter.counterBuilder("netflix.encoding.jobs")
                .setDescription("Encoding jobs by result").setUnit("{job}").build();
        this.renditionDuration = meter.histogramBuilder("netflix.encoding.duration")
                .setDescription("FFmpeg time per rendition").setUnit("s")
                .setExplicitBucketBoundariesAdvice(BUCKETS).build();
        this.totalDuration = meter.histogramBuilder("netflix.encoding.total.duration")
                .setDescription("Whole encoding pipeline: download, encode, upload").setUnit("s")
                .setExplicitBucketBoundariesAdvice(BUCKETS).build();
    }

    public void job(boolean success) {
        jobs.add(1, Attributes.of(RESULT, success ? "success" : "failed"));
    }

    public void rendition(String quality, double seconds) {
        renditionDuration.record(seconds, Attributes.of(QUALITY, quality));
    }

    public void total(double seconds) {
        totalDuration.record(seconds);
    }
}
