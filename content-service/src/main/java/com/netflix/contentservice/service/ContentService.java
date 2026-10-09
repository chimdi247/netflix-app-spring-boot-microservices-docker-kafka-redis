package com.netflix.contentservice.service;

import com.netflix.contentservice.dto.MovieRequest;
import com.netflix.contentservice.dto.MovieResponse;
import com.netflix.contentservice.exception.MovieNotFoundException;
import com.netflix.contentservice.metrics.ContentMetrics;
import com.netflix.contentservice.model.Genre;
import com.netflix.contentservice.model.Movie;
import com.netflix.contentservice.model.VideoStatus;
import com.netflix.contentservice.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ContentService {

    private final MovieRepository movieRepository;
    private final ContentMetrics metrics;

    /**
     * Add a new movie to the catalog.
     * Video is not uploaded yet at this stage.
     */
    @Transactional
    public MovieResponse addMovie(MovieRequest request) {
        log.info("Adding new movie: {}", request.getTitle());

        Movie movie = new Movie();
        movie.setTitle(request.getTitle());
        movie.setDescription(request.getDescription());
        movie.setGenre(request.getGenre());
        movie.setDirector(request.getDirector());
        movie.setCast(request.getCast());
        movie.setReleaseYear(request.getReleaseYear());
        movie.setRating(request.getRating());
        movie.setThumbnailUrl(request.getThumbnailUrl());
        movie.setDurationMinutes(request.getDurationMinutes());
        movie.setVideoStatus(VideoStatus.PENDING);

        Movie savedMovie = movieRepository.save(movie);
        log.info("Movie added with ID: {}", savedMovie.getId());
        metrics.movieCreated(savedMovie.getGenre() == null ? null : savedMovie.getGenre().name());

        return mapToResponse(savedMovie);
    }

    /**
     * Get all movies in the catalog.
     */
    @Transactional(readOnly = true)
    public List<MovieResponse> getAllMovies() {
        return movieRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get movie by ID.
     */
    @Transactional
    public MovieResponse getMovieById(String movieId) {
        // intentionally NOT read-only: served by the primary so a just-created movie is always found,
        // even if the replicas are a few milliseconds behind
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));
        return mapToResponse(movie);
    }

    /**
     * Get movies by genre.
     */
    @Transactional(readOnly = true)
    public List<MovieResponse> getMoviesByGenre(Genre genre) {
        return movieRepository.findByGenre(genre)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Search movies by title.
     * @param title
     * @return
     */

    @Transactional(readOnly = true)
    public List<MovieResponse> searchMovies(String title){
        return movieRepository.findByTitleContainingIgnoreCase(title)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateVideoKey(String movieId, String videoKey){
        log.info("Updating videoKey for movie: {}", movieId);
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));

        movie.setVideoKey(videoKey);
        movie.setVideoStatus(VideoStatus.UPLOADED);
        movieRepository.save(movie);
    }

    @Transactional
    public void updateHlsUrl(String movieId, String hlsUrl){
        log.info("Updating HLS URL for movie: {}", movieId);
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));

        movie.setHlsUrl(hlsUrl);
        movie.setVideoStatus(VideoStatus.READY);
        movieRepository.save(movie);

        metrics.movieReady();
        log.info("Movie {} is now ready for streaming", movieId);
    }

    @Transactional
    public void updateVideoStatus(String movieId, VideoStatus status){
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new MovieNotFoundException(movieId));
        movie.setVideoStatus(status);
        movieRepository.save(movie);
        if (status == VideoStatus.FAILED) {
            metrics.movieFailed();
        }
    }

    /**
     * Remove a movie from the catalog. Only the database row is deleted; encoded files stay in the bucket.
     */
    @Transactional
    public void deleteMovie(String movieId) {
        if (!movieRepository.existsById(movieId)) {
            throw new MovieNotFoundException(movieId);
        }
        movieRepository.deleteById(movieId);
        log.info("Movie deleted: {}", movieId);
    }



    private MovieResponse mapToResponse(Movie movie) {
        MovieResponse response = new MovieResponse();
        response.setId(movie.getId());
        response.setTitle(movie.getTitle());
        response.setDescription(movie.getDescription());
        response.setGenre(movie.getGenre());
        response.setDirector(movie.getDirector());
        response.setCast(movie.getCast());
        response.setReleaseYear(movie.getReleaseYear());
        response.setRating(movie.getRating());
        response.setThumbnailUrl(movie.getThumbnailUrl());
        response.setDurationMinutes(movie.getDurationMinutes());
        response.setVideoKey(movie.getVideoKey());
        response.setVideoStatus(movie.getVideoStatus());
        response.setHlsUrl(movie.getHlsUrl());
        response.setCreatedAt(movie.getCreatedAt());
        return response;
    }
}
