import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileVideo, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { errorMessage } from "@/lib/queries";
import type { Movie } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const MAX_BYTES = 2 * 1024 * 1024 * 1024;

export function UploadDialog({ movie, onClose }: { movie: Movie | null; onClose: () => void }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setProgress(0);
    setFileError(null);
    upload.reset();
  };

  const upload = useMutation({
    mutationFn: () => api.uploadVideo(movie!.id, file!, setProgress),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Upload complete", { description: "Encoding has started: the movie becomes playable in a moment." });
    },
    onError: (e) => toast.error("Upload failed", { description: errorMessage(e) }),
  });

  const pick = (f: File | undefined | null) => {
    setFileError(null);
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(f.name)) return setFileError("Choose a video file (mp4, mov, mkv, webm …).");
    if (f.size > MAX_BYTES) return setFileError("The file is larger than 2 GB.");
    setFile(f);
    setProgress(0);
    upload.reset();
  };

  const close = () => {
    if (upload.isPending) return; // do not abandon a running upload by accident
    reset();
    onClose();
  };

  const done = upload.isSuccess;
  const sent = progress >= 1;

  return (
    <Dialog open={!!movie} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload video</DialogTitle>
          <DialogDescription>
            For <span className="text-foreground">{movie?.title}</span>. The file is stored privately, encoded to 1080p, 720p, 480p and 360p, and the movie becomes playable.
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            disabled={upload.isPending}
            className={cn(
              "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors disabled:opacity-60",
              dragging ? "border-primary bg-primary/5" : "border-input hover:border-muted-foreground",
            )}
          >
            {file ? <FileVideo className="h-8 w-8 text-primary" /> : <UploadCloud className="h-8 w-8 text-muted-foreground" />}
            <span className="text-sm font-medium">{file ? file.name : "Drop a video here, or click to choose"}</span>
            <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : "Up to 2 GB"}</span>
          </button>
        )}
        <input ref={input} type="file" accept="video/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Video file" />
        {fileError && (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        )}

        {(upload.isPending || done) && (
          <div className="space-y-2">
            <Progress value={progress * 100} />
            <p className="flex items-center gap-2 text-sm text-muted-foreground tabular">
              {done ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" /> Uploaded. Encoding is running in the background.
                </>
              ) : sent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Storing the file…
                </>
              ) : (
                <>Uploading {Math.round(progress * 100)}%</>
              )}
            </p>
          </div>
        )}

        <DialogFooter>
          {done ? (
            <Button onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={close} disabled={upload.isPending}>
                Cancel
              </Button>
              <Button disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
                {upload.isPending && <Loader2 className="animate-spin" />}
                Upload
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
