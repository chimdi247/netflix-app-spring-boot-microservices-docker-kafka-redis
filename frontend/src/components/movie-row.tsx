import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Movie } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { MovieCard } from "./movie-card";

/** A titled, horizontally scrolling row of posters. */
export function MovieRow({ title, movies }: { title: string; movies: Movie[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  if (movies.length === 0) return null;

  const scroll = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <section aria-label={title} className="group/row">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
        <div className="hidden gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 sm:flex">
          <Button variant="outline" size="icon" aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon" aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div ref={scroller} className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-3 sm:gap-4">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </div>
    </section>
  );
}
