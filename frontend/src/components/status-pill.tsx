import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VideoStatus } from "@/lib/types";

export function StatusPill({ status }: { status: VideoStatus | null }) {
  switch (status) {
    case "READY":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" /> Ready
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3" /> Failed
        </Badge>
      );
    case "UPLOADED":
    case "ENCODING":
    case "ENCODED":
      return (
        <Badge variant="warning">
          <Loader2 className="h-3 w-3 animate-spin" /> Encoding
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <CircleDashed className="h-3 w-3" /> No video
        </Badge>
      );
  }
}
