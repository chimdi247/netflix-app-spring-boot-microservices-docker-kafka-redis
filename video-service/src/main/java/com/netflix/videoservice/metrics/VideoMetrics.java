package com.netflix.videoservice.metrics;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.stereotype.Component;

/**
 * Business metrics via the OpenTelemetry API (the Java agent provides the implementation).
 *   netflix_videos_uploaded_total
 *   netflix_video_upload_bytes_total
 */
@Component
public class VideoMetrics {

    private final LongCounter uploaded;
    private final LongCounter uploadedBytes;

    public VideoMetrics() {
        Meter meter = GlobalOpenTelemetry.getMeter("netflix.video-service");
        this.uploaded = meter.counterBuilder("netflix.videos.uploaded")
                .setDescription("Raw videos stored in the bucket").setUnit("{video}").build();
        this.uploadedBytes = meter.counterBuilder("netflix.video.upload")
                .setDescription("Bytes of raw video uploaded").setUnit("By").build();
    }

    public void uploaded(long sizeBytes) {
        uploaded.add(1);
        uploadedBytes.add(sizeBytes);
    }
}
