package com.netflix.videoservice.dto;

public record UploadResponse(String movieId, String videoKey, String fileName, long sizeBytes, String message) {
}
