import { useQuery } from "@tanstack/react-query";
import * as api from "./api";
import { isProcessing } from "./types";

/** The catalog. While a video is being encoded the list refreshes itself every 3 s. */
export const useMovies = () =>
  useQuery({
    queryKey: ["movies"],
    queryFn: api.listMovies,
    staleTime: 15_000,
    refetchInterval: (query) => (query.state.data?.some((m) => isProcessing(m.videoStatus)) ? 3000 : false),
  });

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : "Something went wrong. Try again.");
