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
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {
          // Autoplay blocked — user interaction needed
        });
        hideControls();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setError(`Fatal error: ${data.details}`);
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
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
      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black">
          <div className="text-white text-2xl animate-pulse">Loading {TEST_CHANNEL.name}…</div>
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
