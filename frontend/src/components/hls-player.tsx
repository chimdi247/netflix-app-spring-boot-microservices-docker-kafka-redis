import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { AlertTriangle, Gauge, Loader2 } from "lucide-react";
import { sessionStore } from "@/lib/api";
import { objectKeyFromUrl } from "@/lib/art";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Level {
  height: number;
  bitrate: number;
}

/**
 * Adaptive HLS player.
 *
 * How the protected stream works: the master playlist arrives as a pre-signed object-store URL. Its variant
 * playlists are referenced relatively, which would hit the (private) bucket without a signature. So every
 * unsigned .m3u8 request is redirected to the streaming-service (with the viewer's token), which answers with the
 * playlist whose segment URLs are pre-signed. Segments then come straight from the object store.
 */
export function HlsPlayer({ movieId, streamingUrl }: { movieId: string; streamingUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [playing, setPlaying] = useState(-1);
  const [selected, setSelected] = useState("auto");
  const [bufferAhead, setBufferAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    setLoading(true);

    if (!Hls.isSupported()) {
      setError("This browser cannot play adaptive streams. Use a current Chrome, Edge, Firefox or desktop Safari.");
      setLoading(false);
      return;
    }

    let networkRetries = 0;
    const hls = new Hls({
      maxBufferLength: 30,
      xhrSetup: (xhr, url) => {
        if (/\.m3u8(\?|$)/.test(url) && !url.includes("X-Amz-Signature")) {
          const key = objectKeyFromUrl(url);
          if (key) {
            xhr.open("GET", `/api/v1/stream/${movieId}/playlist?path=${encodeURIComponent(key)}`, true);
            const token = sessionStore.token();
            if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
        }
      },
    });
    hlsRef.current = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setLevels(hls.levels.map((l) => ({ height: l.height, bitrate: l.bitrate })));
      setLoading(false);
      void video.play().catch(() => undefined); // the browser may require a click first
    });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setPlaying(data.level));
    hls.on(Hls.Events.FRAG_LOADED, () => {
      networkRetries = 0;
    });
    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
        networkRetries++;
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        setError("Playback stopped because the stream could not be loaded. Reload the page to try again.");
        setLoading(false);
        hls.destroy();
      }
    });

    hls.loadSource(streamingUrl);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [movieId, streamingUrl]);

  // how many seconds are buffered ahead of the playhead
  const updateBuffer = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    let ahead = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) ahead = v.buffered.end(i) - v.currentTime;
    }
    setBufferAhead(ahead);
  }, []);

  const changeQuality = (value: string) => {
    setSelected(value);
    if (hlsRef.current) hlsRef.current.currentLevel = value === "auto" ? -1 : Number(value);
  };

  const current = playing >= 0 ? levels[playing] : undefined;

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-black ring-1 ring-white/10">
        <video
          ref={videoRef}
          controls
          playsInline
          autoPlay
          className="h-full w-full"
          onTimeUpdate={updateBuffer}
          onProgress={updateBuffer}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
        />
        {loading && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        )}
        {error && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <p className="max-w-md text-sm text-white/80">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="quality" className="text-muted-foreground">
            Quality
          </label>
          <Select value={selected} onValueChange={changeQuality} disabled={levels.length === 0}>
            <SelectTrigger id="quality" className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              {levels.map((l, i) => (
                <SelectItem key={i} value={String(i)}>
                  {l.height}p
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="flex items-center gap-2 text-muted-foreground tabular">
          <Gauge className="h-4 w-4" />
          {current ? `Playing ${current.height}p at ${(current.bitrate / 1_000_000).toFixed(1)} Mbit/s` : "Choosing quality…"}
          <span aria-hidden>·</span>
          {bufferAhead.toFixed(0)} s buffered
        </p>
      </div>
    </div>
  );
}
