import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Boxes, Cpu, Loader2, Play, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { errorMessage, useMovies } from "@/lib/queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { genreLabel, isProcessing, isReady, type Movie } from "@/lib/types";
import { AddMovieDialog } from "@/components/add-movie-dialog";
import { StatusPill } from "@/components/status-pill";
import { UploadDialog } from "@/components/upload-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="tabular mt-1 font-display text-4xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Pipeline() {
  const steps = [
    ["Upload", "video-service stores the raw file privately"],
    ["Kafka", "video.uploaded event"],
    ["FFmpeg", "encoding-service makes 4 renditions"],
    ["Storage", "HLS playlists and segments"],
    ["Ready", "video.encoded: catalog and cache updated"],
  ];
  return (
    <ol className="flex flex-wrap items-stretch gap-2 text-sm" aria-label="How a video becomes playable">
      {steps.map(([name, hint], i) => (
        <li key={name} className="flex items-center gap-2">
          <div className="rounded-md border bg-card px-3 py-2">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export default function StudioPage() {
  const qc = useQueryClient();
  const { data: movies, isLoading, isError } = useMovies();
  const [adding, setAdding] = useState(false);
  const [uploadFor, setUploadFor] = useState<Movie | null>(null);
  const [deleting, setDeleting] = useState<Movie | null>(null);

  const remove = useMutation({
    mutationFn: (m: Movie) => api.deleteMovie(m.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Movie deleted");
      setDeleting(null);
    },
    onError: (e) => toast.error("Couldn't delete the movie", { description: errorMessage(e) }),
  });

  const list = [...(movies ?? [])].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const count = (f: (m: Movie) => boolean) => list.filter(f).length;

  return (
    <main className="mx-auto max-w-[1400px] space-y-8 px-4 pb-20 pt-28 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Studio</h1>
          <p className="mt-1 max-w-prose text-muted-foreground">Add movies, upload their videos and watch them move through the encoding pipeline.</p>
        </div>
        <Button size="lg" onClick={() => setAdding(true)}>
          <Plus /> Add movie
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Tile label="Movies" value={list.length} />
        <Tile label="Ready to stream" value={count(isReady)} />
        <Tile label="Encoding" value={count((m) => isProcessing(m.videoStatus))} hint="refreshes automatically" />
        <Tile label="Failed" value={count((m) => m.videoStatus === "FAILED")} hint="upload the video again" />
      </div>

      <Pipeline />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : isError ? (
          <p className="p-8 text-destructive">We couldn't load the catalog. Refresh the page to try again.</p>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-10">
            <Boxes className="h-8 w-8 text-muted-foreground" />
            <h2 className="text-xl font-semibold">The catalog is empty</h2>
            <p className="text-muted-foreground">Add your first movie, then upload a video for it.</p>
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add movie
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[genreLabel(m.genre), m.releaseYear || null, formatDuration(m.durationMinutes) || null].filter(Boolean).join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={m.videoStatus} />
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{formatDateTime(m.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {isReady(m) && (
                        <Button asChild size="sm" variant="secondary">
                          <Link to={`/watch/${m.id}`}>
                            <Play /> Watch
                          </Link>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setUploadFor(m)} disabled={isProcessing(m.videoStatus)}>
                        {isProcessing(m.videoStatus) ? <Cpu className="animate-pulse" /> : <Upload />}
                        {isReady(m) || m.videoStatus === "FAILED" ? "Replace video" : isProcessing(m.videoStatus) ? "Encoding…" : "Upload video"}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label={`Delete ${m.title}`} className="text-destructive hover:text-destructive" onClick={() => setDeleting(m)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AddMovieDialog open={adding} onOpenChange={setAdding} onCreated={setUploadFor} />
      <UploadDialog movie={uploadFor} onClose={() => setUploadFor(null)} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.title}”?</DialogTitle>
            <DialogDescription>The movie disappears from the catalog. The stored video files are kept in the bucket.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              {remove.isPending && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
