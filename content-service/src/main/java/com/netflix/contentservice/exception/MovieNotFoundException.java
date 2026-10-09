package com.netflix.contentservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Answered with HTTP 404 instead of the 500 a plain RuntimeException produced. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class MovieNotFoundException extends RuntimeException {
    public MovieNotFoundException(String movieId) {
        super("Movie not found: " + movieId);
    }
}
