package com.netflix.streamingservice.exception;

/** The movie has no encoded HLS playlist (yet). Answered with HTTP 404. */
public class MovieNotReadyException extends RuntimeException {
    public MovieNotReadyException(String movieId) {
        super("Movie not ready for streaming: " + movieId);
    }
}
