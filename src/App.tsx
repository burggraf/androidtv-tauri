import { useState, useCallback, useEffect, useRef } from "react";
import { PairScreen } from "@/pages/PairScreen";
import { EPGGuide } from "@/pages/EPGGuide";
import { useDeviceAuth } from "@/lib/device-auth";

export type Page = "menu" | "movies" | "series" | "live" | "settings";



export function useNavigation() {
  const [page, setPage] = useState<Page>("menu");
  const [history, setHistory] = useState<Page[]>(["menu"]);

  const navigate = useCallback((to: Page) => {
    setPage(to);
    setHistory((prev) => [...prev, to]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setPage(next[next.length - 1]);
      return next;
    });
  }, []);

  const canGoBack = history.length > 1;

  return { page, history, navigate, goBack, canGoBack };
}

/** Android TV D-pad focus management hook */
export function useDpadFocus(items: number, active: boolean = true) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(items - 1, i + 1));
          break;
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          break;
        case "Enter":
          e.preventDefault();
          itemRefs.current[focusedIndex]?.click();
          break;
        case "Escape":
        case "Backspace":
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, focusedIndex, active]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const setRef = (index: number) => (el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  };

  return { focusedIndex, setRef };
}

// Removed unused menu/content/settings pages

export function AppContent() {
  const { pairedDevice, loading } = useDeviceAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white text-xl animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!pairedDevice) {
    return <PairScreen />;
  }

  return <EPGGuide onTuneChannel={(ch) => console.log('tune:', ch.name)} />;
}


