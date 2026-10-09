import { useState } from "react";
import { cn } from "@/lib/utils";
import { posterBackground } from "@/lib/art";
import { genreLabel, type Movie } from "@/lib/types";

interface Props {
  movie: Pick<Movie, "title" | "genre" | "releaseYear" | "thumbnailUrl">;
  className?: string;
  /** "card" = small poster, "hero" = big backdrop */
  size?: "card" | "hero";
  /** ignore thumbnailUrl and always draw the generated art */
  generated?: boolean;
}

/** A movie's poster: its thumbnail if it has one, otherwise generated art (colour from the title, film grain on top). */
export function PosterArt({ movie, className, size = "card", generated = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (movie.thumbnailUrl && !failed && !generated) {
    return <img src={movie.thumbnailUrl} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("h-full w-full object-cover", className)} />;
  }

  const hero = size === "hero";
  return (
    <div className={cn("grain relative h-full w-full overflow-hidden", className)} style={{ background: posterBackground(movie.title) }} aria-hidden>
      <span className={cn("absolute left-3 top-3 font-sans font-medium uppercase tracking-[0.22em] text-white/60", hero ? "left-8 top-24 text-xs" : "text-[10px]")}>
        {genreLabel(movie.genre)}
      </span>
      <div className={cn("absolute inset-x-0 bottom-0 p-3", hero && "p-8 pb-12 sm:p-12 sm:pb-16")}>
        <p className={cn("font-display font-semibold leading-[0.95] tracking-tight text-white/95 text-balance", hero ? "max-w-3xl text-6xl opacity-25 sm:text-8xl" : "text-xl")}>
          {movie.title}
        </p>
        {!hero && <p className="mt-2 text-[11px] tracking-widest text-white/50 tabular">{movie.releaseYear || ""}</p>}
      </div>
    </div>
  );
}
