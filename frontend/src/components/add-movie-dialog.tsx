import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { errorMessage } from "@/lib/queries";
import { GENRES, type Genre, type Movie } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Too long"),
  genre: z.string().min(1, "Pick a genre"),
  releaseYear: z
    .string()
    .regex(/^\d{4}$/, "Four digits, for example 2024")
    .refine((v) => Number(v) >= 1888 && Number(v) <= new Date().getFullYear() + 2, "Enter a real year"),
  rating: z
    .string()
    .regex(/^\d+(\.\d)?$/, "0 to 10, for example 7.5")
    .refine((v) => Number(v) <= 10, "At most 10"),
  durationMinutes: z.string().regex(/^[1-9]\d{0,3}$/, "Whole minutes, for example 112"),
  director: z.string().max(255, "Too long").optional(),
  cast: z.string().max(1000, "Too long").optional(),
  thumbnailUrl: z.union([z.string().url("Enter a full URL, starting with https://"), z.literal("")]).optional(),
  description: z.string().max(1000, "At most 1000 characters").optional(),
});
type Values = z.infer<typeof schema>;

function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Label>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AddMovieDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (m: Movie) => void }) {
  const qc = useQueryClient();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", genre: "", releaseYear: String(new Date().getFullYear()), rating: "7.0", durationMinutes: "100", director: "", cast: "", thumbnailUrl: "", description: "" },
  });
  const { errors } = form.formState;

  const create = useMutation({
    mutationFn: (v: Values) =>
      api.createMovie({
        title: v.title.trim(),
        genre: v.genre as Genre,
        releaseYear: Number(v.releaseYear),
        rating: Number(v.rating),
        durationMinutes: Number(v.durationMinutes),
        director: v.director?.trim() || undefined,
        cast: v.cast?.trim() || undefined,
        thumbnailUrl: v.thumbnailUrl?.trim() || undefined,
        description: v.description?.trim() || undefined,
      }),
    onSuccess: (movie) => {
      void qc.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Movie added", { description: "Now upload its video." });
      form.reset();
      onOpenChange(false);
      onCreated(movie);
    },
    onError: (e) => toast.error("Couldn't add the movie", { description: errorMessage(e) }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a movie</DialogTitle>
          <DialogDescription>Create the catalog entry first, then upload its video. Viewers see it once encoding has finished.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Title" error={errors.title?.message} className="space-y-1.5 sm:col-span-2">
            <Input aria-invalid={!!errors.title} {...form.register("title")} />
          </Field>
          <Field label="Genre" error={errors.genre?.message}>
            <Controller
              control={form.control}
              name="genre"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={!!errors.genre}>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Release year" error={errors.releaseYear?.message}>
            <Input inputMode="numeric" aria-invalid={!!errors.releaseYear} {...form.register("releaseYear")} />
          </Field>
          <Field label="Rating (0 to 10)" error={errors.rating?.message}>
            <Input inputMode="decimal" aria-invalid={!!errors.rating} {...form.register("rating")} />
          </Field>
          <Field label="Duration (minutes)" error={errors.durationMinutes?.message}>
            <Input inputMode="numeric" aria-invalid={!!errors.durationMinutes} {...form.register("durationMinutes")} />
          </Field>
          <Field label="Director" error={errors.director?.message}>
            <Input {...form.register("director")} />
          </Field>
          <Field label="Cast" error={errors.cast?.message}>
            <Input placeholder="Comma separated" {...form.register("cast")} />
          </Field>
          <Field label="Poster image URL (optional)" error={errors.thumbnailUrl?.message} className="space-y-1.5 sm:col-span-2">
            <Input placeholder="https://…  (leave empty for generated artwork)" aria-invalid={!!errors.thumbnailUrl} {...form.register("thumbnailUrl")} />
          </Field>
          <Field label="Description" error={errors.description?.message} className="space-y-1.5 sm:col-span-2">
            <Textarea aria-invalid={!!errors.description} {...form.register("description")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Add movie
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
