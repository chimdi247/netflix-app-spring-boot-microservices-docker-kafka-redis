import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clapperboard, Loader2, Play, SearchX, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useMovies } from "@/lib/queries";
import { formatDuration, formatRating } from "@/lib/format";
import { GENRES, genreLabel, isProcessing, isReady, type Genre, type Movie } from "@/lib/types";
import { MovieCard } from "@/components/movie-card";
import { MovieRow } from "@/components/movie-row";
import { PosterArt } from "@/components/poster-art";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function Hero({ movie }: { movie: Movie }) {
  return (
    <section aria-label="Featured" className="relative -mt-16 h-[68vh] min-h-[460px] overflow-hidden">
      <div className="absolute inset-0">
        <PosterArt movie={movie} size="hero" generated />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-ink/50" />
      <div className="relative mx-auto flex h-full max-w-[1400px] items-end px-4 pb-14 sm:px-8 sm:pb-20">
        <div className="rise-in max-w-xl">
          <p className="mb-3 flex flex-wrap items-center gap-x-3 text-sm text-white/80">
            <span className="flex items-center gap-1 font-medium text-amber">
              <Star className="h-4 w-4 fill-current" />
              <span className="tabular">{formatRating(movie.rating)}</span>
            </span>
            <span>{movie.releaseYear || ""}</span>
            <span>{genreLabel(movie.genre)}</span>
            <span>{formatDuration(movie.durationMinutes)}</span>
          </p>
          <h1 className="text-5xl font-semibold leading-[0.95] text-balance sm:text-7xl">{movie.title}</h1>
          {movie.description && <p className="mt-5 line-clamp-3 max-w-lg text-base text-white/75 sm:text-lg">{movie.description}</p>}
          <div className="mt-7 flex gap-3">
            <Button asChild size="lg" className="px-7">
              <Link to={`/watch/${movie.id}`}>
                <Play className="fill-current" /> Play
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BrowsePage() {
  const { isAdmin } = useAuth();
  const { data: movies, isLoading, isError } = useMovies();
  const [params] = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const [genre, setGenre] = useState<Genre | "ALL">("ALL");

  const { ready, others, hero, topRated, recent, byGenre } = useMemo(() => {
    const all = movies ?? [];
    const ready = all.filter(isReady);
    const others = isAdmin ? all.filter((m) => !isReady(m)) : [];
    const hero = [...ready].sort((a, b) => b.rating - a.rating || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
    const topRated = [...ready].sort((a, b) => b.rating - a.rating).slice(0, 12);
    const recent = [...ready].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 12);
    const byGenre = GENRES.map((g) => ({ ...g, movies: ready.filter((m) => m.genre === g.value) })).filter((g) => g.movies.length > 0);
    return { ready, others, hero, topRated, recent, byGenre };
  }, [movies, isAdmin]);

  const encoding = (movies ?? []).filter((m) => isProcessing(m.videoStatus)).length;

  // ---- search ---------------------------------------------------------------------------------
  if (q) {
    const pool = isAdmin ? movies ?? [] : ready;
    const hits = pool.filter((m) => [m.title, m.director, m.cast, genreLabel(m.genre)].some((f) => f?.toLowerCase().includes(q)));
    return (
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-28 sm:px-8">
        <h1 className="mb-6 text-3xl font-semibold">
          {hits.length} {hits.length === 1 ? "result" : "results"} for “{params.get("q")}”
        </h1>
        {hits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <SearchX className="h-10 w-10" />
            <p>Nothing matches. Try a title, a director or an actor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-6">
            {hits.map((m) => (
              <MovieCard key={m.id} movie={m} className="w-full" />
            ))}
          </div>
        )}
      </main>
    );
  }

  // ---- loading / error / empty --------------------------------------------------------------------
  if (isLoading) {
    return (
      <main className="pt-16">
        <Skeleton className="h-[60vh] w-full rounded-none" />
        <div className="mx-auto mt-8 flex max-w-[1400px] gap-4 overflow-hidden px-4 sm:px-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-44 shrink-0" />
          ))}
        </div>
      </main>
    );
  }
  if (isError) {
    return <main className="px-8 pt-32 text-center text-destructive">We couldn't load the catalog. Refresh the page to try again.</main>;
  }

  const visibleGenres = genre === "ALL" ? byGenre : byGenre.filter((g) => g.value === genre);

  return (
    <main className="pb-20">
      {hero ? (
        <Hero movie={hero} />
      ) : (
        <section className="mx-auto flex max-w-[1400px] flex-col items-start gap-4 px-4 pb-6 pt-36 sm:px-8">
          <h1 className="text-5xl font-semibold">Nothing to watch yet</h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            {isAdmin ? "Add a movie and upload its video in the Studio. It appears here as soon as encoding has finished." : "The catalog is empty. Check back soon."}
          </p>
          {isAdmin && (
            <Button asChild size="lg">
              <Link to="/studio">
                <Clapperboard /> Open the Studio
              </Link>
            </Button>
          )}
        </section>
      )}

      <div className="mx-auto max-w-[1400px] space-y-10 px-4 sm:px-8">
        {encoding > 0 && (
          <p role="status" className="flex items-center gap-2 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-warning" />
            {encoding} {encoding === 1 ? "video is" : "videos are"} being encoded. {encoding === 1 ? "It" : "They"} will appear here automatically.
          </p>
        )}

        {ready.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
            {[{ value: "ALL" as const, label: "All" }, ...byGenre.map((g) => ({ value: g.value, label: g.label }))].map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGenre(g.value)}
                aria-pressed={genre === g.value}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  genre === g.value ? "border-foreground bg-foreground text-background" : "border-input text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {genre === "ALL" && (
          <>
            <MovieRow title="Top rated" movies={topRated} />
            <MovieRow title="Recently added" movies={recent} />
          </>
        )}
        {visibleGenres.map((g) => (
          <MovieRow key={g.value} title={g.label} movies={g.movies} />
        ))}
        {others.length > 0 && <MovieRow title="In production (only admins see this)" movies={others} />}
      </div>
    </main>
  );
}
