package com.netflix.videoservice.controller;

import com.netflix.videoservice.dto.UploadResponse;
import com.netflix.videoservice.service.VideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/videos")
@RequiredArgsConstructor
@Slf4j
public class VideoController {

    private final VideoService videoService;

    /**
     * Upload video file for a movie.
     * Accepts multipart file upload.
     *
     * POST /api/v1/videos/upload/{movieId}
     */
    @PostMapping("/upload/{movieId}")
    public ResponseEntity<?> uploadVideo(
            @PathVariable String movieId,
            @RequestParam("file") MultipartFile file) throws IOException {

        log.info("Video upload request for movie: {} file size: {}MB",
                movieId, file.getSize() / (1024 * 1024));

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("status", 400, "message", "File is empty"));
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("video/") && !contentType.equals("application/octet-stream")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("status", 400,
                    "message", "Only video files can be uploaded (got " + contentType + ")"));
        }

        String videoKey = videoService.uploadVideo(movieId, file);

        return ResponseEntity.ok(new UploadResponse(
                movieId,
                videoKey,
                file.getOriginalFilename(),
                file.getSize(),
                "Video uploaded. Encoding started automatically via Kafka."));
    }
}
