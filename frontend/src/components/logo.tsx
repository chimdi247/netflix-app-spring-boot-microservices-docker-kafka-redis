import { cn } from "@/lib/utils";

/** Wordmark. Set the name in one place. */
export const APP_NAME = "NETFLIX";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-2xl font-bold tracking-[0.18em] text-primary", className)} aria-label={APP_NAME}>
      {APP_NAME}
    </span>
  );
}
