import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Button } from "@/components/ui/button";

const TEST_CHANNEL = {
  name: "3ABN English",
  url: "https://3abn.bozztv.com/3abn2/3abn_live/smil:3abn_live.smil/playlist.m3u8",
};

export function LivePage({ onBack }: { onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [status, setStatus] = useState("initializing");
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const hideControls = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControls();
  }, [hideControls]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    const src = TEST_CHANNEL.url;

    // Debug: log MSE support
    const ms = (window as unknown as Record<string, unknown>).MediaSource as { isTypeSupported?: (s: string) => boolean };
    console.log("[LivePage] MSE supported:", typeof ms !== "undefined" && ms.isTypeSupported?.('video/mp4; codecs="avc1.42E01E"'));

    if (Hls.isSupported()) {
      console.log("[LivePage] Using hls.js");
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        debug: true,
      });

      hls.on(Hls.Events.FRAG_LOADED, () => console.log("[LivePage] fragment loaded"));
      hls.on(Hls.Events.LEVEL_LOADED, (_e, d) => console.log("[LivePage] level loaded, totalDuration:", d.totalduration));
      hls.on(Hls.Events.FRAG_BUFFERED, () => console.log("[LivePage] fragment buffered"));

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("[LivePage] media attached");
        setStatus("media attached");
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, d) => {
        console.log("[LivePage] manifest parsed, levels:", d.levels.length);
        setStatus("manifest parsed, playing…");
        setLoading(false);
        video.play().then(() => {
          console.log("[LivePage] play succeeded");
          setStatus("playing");
        }).catch((e) => {
          console.log("[LivePage] play failed:", e);
          setStatus("play failed: " + e.message);
          // Try muted play
          video.muted = true;
          video.play().then(() => {
            console.log("[LivePage] muted play succeeded");
            setStatus("playing (muted)");
          }).catch((e2) => {
            console.log("[LivePage] muted play also failed:", e2);
            setStatus("muted play failed: " + e2.message);
          });
        });
        hideControls();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.log("[LivePage] hls error:", data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStatus("Network error — recovering…");
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setStatus("Media error — recovering…");
              hls?.recoverMediaError();
              break;
            default:
              setError(`Fatal error: ${data.details}`);
              hls?.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOAD_EMERGENCY_ABORTED, () => {
        console.log("[LivePage] frag load emergency aborted");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[LivePage] Native HLS support");
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch((e) => console.log("[LivePage] native play failed:", e));
        hideControls();
      });
      video.addEventListener("error", () => setError("Failed to load stream"));
    } else {
      setError("HLS playback not supported");
    }

    return () => {
      hls?.destroy();
      clearTimeout(hideTimer.current);
    };
  }, []);

  // Debug: log video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const events = ["play", "playing", "pause", "ended", "error", "waiting", "stalled", "canplay", "canplaythrough", "loadeddata", "loadedmetadata", "suspend"];
    const handlers: Record<string, () => void> = {};
    for (const evt of events) {
      handlers[evt] = () => console.log(`[LivePage] video event: ${evt}`);
      video.addEventListener(evt, handlers[evt]);
    }
    return () => {
      for (const evt of events) {
        video.removeEventListener(evt, handlers[evt]);
      }
    };
  }, []);

  // Escape / D-pad Back → go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999 }}
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      {/* Status overlay (debug) */}
      {(loading || status) && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black">
          {loading && <div className="text-white text-2xl mb-4 animate-pulse">Loading {TEST_CHANNEL.name}…</div>}
          <div className="text-gray-400 text-sm font-mono">{status}</div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black gap-4">
          <p className="text-red-400 text-xl">{error}</p>
          <Button variant="tv" size="tv" onClick={() => window.location.reload()}>
            Retry
          </Button>
          <Button variant="tv" size="tv" onClick={onBack}>
            ← Back to Menu
          </Button>
        </div>
      )}

      {/* Fullscreen video */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "contain",
          background: "black",
          zIndex: 1,
        }}
      />

      {/* Translucent top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="text-white text-lg font-semibold">📡 {TEST_CHANNEL.name}</span>
        <Button
          ref={(el) => {
            if (showControls) el?.focus();
          }}
          variant="tv"
          size="tv"
          onClick={onBack}
        >
          ← Back
        </Button>
      </div>
    </div>
  );
}
