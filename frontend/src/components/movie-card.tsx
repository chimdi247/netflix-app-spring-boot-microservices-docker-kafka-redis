import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatRating } from "@/lib/format";
import { genreLabel, isReady, type Movie } from "@/lib/types";
import { PosterArt } from "./poster-art";
import { StatusPill } from "./status-pill";

/** Poster card. Playable movies link to the player; others (admins only see them) are shown dimmed with their status. */
export function MovieCard({ movie, className }: { movie: Movie; className?: string }) {
  const playable = isReady(movie);

  const body = (
    <>
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-card ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-white/25 group-focus-visible:ring-primary">
        <PosterArt movie={movie} className={cn(!playable && "opacity-50 saturate-50")} />
        {playable && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </span>
          </span>
        )}
        {!playable && (
          <span className="absolute left-2 top-2">
            <StatusPill status={movie.videoStatus} />
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium">{movie.title}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-amber text-amber" />
          <span className="tabular">{formatRating(movie.rating)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">
            {genreLabel(movie.genre)}
            {movie.durationMinutes > 0 ? ` · ${formatDuration(movie.durationMinutes)}` : ""}
          </span>
        </p>
      </div>
    </>
  );

  const base = cn("group block w-40 shrink-0 sm:w-44", className);
  return playable ? (
    <Link to={`/watch/${movie.id}`} className={base} aria-label={`Play ${movie.title}`}>
      {body}
    </Link>
  ) : (
    <div className={cn(base, "cursor-default")}>{body}</div>
  );
}
