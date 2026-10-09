import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Film, Star, Users } from "lucide-react";
import * as api from "@/lib/api";
import { useMovies } from "@/lib/queries";
import { formatDuration, formatRating } from "@/lib/format";
import { genreLabel, isReady } from "@/lib/types";
import { HlsPlayer } from "@/components/hls-player";
import { MovieRow } from "@/components/movie-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchPage() {
  const { id = "" } = useParams();
  const movie = useQuery({ queryKey: ["movie", id], queryFn: () => api.getMovie(id), retry: false });
  const all = useMovies();
  // the pre-signed URL is valid for an hour; "not ready" answers with 404, which must not be retried
  const stream = useQuery({
    queryKey: ["stream", id],
    queryFn: () => api.getStream(id),
    enabled: movie.isSuccess && isReady(movie.data),
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const m = movie.data;
  const similar = (all.data ?? []).filter((x) => isReady(x) && x.id !== id && m && x.genre === m.genre);

  if (movie.isError) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 pt-36">
        <h1 className="text-4xl font-semibold">We can't find that movie</h1>
        <p className="text-muted-foreground">It may have been removed from the catalog.</p>
        <Button asChild>
          <Link to="/">Back to browse</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1100px] space-y-10 px-4 pb-20 pt-24 sm:px-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-3 text-muted-foreground">
          <Link to="/">
            <ArrowLeft /> Browse
          </Link>
        </Button>

        {movie.isLoading || (stream.isLoading && isReady(m!)) ? (
          <Skeleton className="aspect-video w-full" />
        ) : m && isReady(m) && stream.data ? (
          <HlsPlayer movieId={m.id} streamingUrl={stream.data.streamingUrl} />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border bg-card p-8 text-center">
            <Film className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">This movie isn't ready to stream yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {m?.videoStatus === "FAILED" ? "Encoding failed. An admin can upload the video again in the Studio." : "Its video is still being processed or has not been uploaded. Check back in a moment."}
            </p>
          </div>
        )}
      </div>

      {m && (
        <section className="grid gap-8 md:grid-cols-[1fr_16rem]">
          <div>
            <h1 className="text-4xl font-semibold sm:text-5xl">{m.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-amber">
                <Star className="h-4 w-4 fill-current" />
                <span className="tabular">{formatRating(m.rating)}</span>
              </span>
              <span>{m.releaseYear || ""}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(m.durationMinutes)}
              </span>
              <Badge variant="outline">{genreLabel(m.genre)}</Badge>
            </p>
            {m.description && <p className="mt-5 max-w-prose text-base leading-relaxed text-foreground/85">{m.description}</p>}
          </div>
          <dl className="space-y-4 text-sm">
            {m.director && (
              <div>
                <dt className="text-muted-foreground">Director</dt>
                <dd className="mt-0.5">{m.director}</dd>
              </div>
            )}
            {m.cast && (
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Cast
                </dt>
                <dd className="mt-0.5">{m.cast}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <MovieRow title="More like this" movies={similar} />
    </main>
  );
}
