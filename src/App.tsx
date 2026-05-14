import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export type Page = "menu" | "movies" | "series" | "live" | "settings";

const PAGE_CONTENT: Record<Exclude<Page, "menu">, { title: string; message: string }> = {
  movies: { title: "🎬 Movies", message: "Browse the latest movies and blockbusters." },
  series: { title: "📺 TV Series", message: "Discover trending TV shows and series." },
  live: { title: "📡 Live TV", message: "Watch live television channels." },
  settings: { title: "⚙️ Settings", message: "Configure your app preferences." },
};

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
          // Back button handled by parent
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, focusedIndex, active]);

  // Focus the DOM element when focusedIndex changes
  useEffect(() => {
    itemRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  const setRef = (index: number) => (el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  };

  return { focusedIndex, setRef };
}

function MenuPage({ onNavigate }: { onNavigate: (page: Exclude<Page, "menu">) => void }) {
  const menuItems: { label: string; page: Exclude<Page, "menu"> }[] = [
    { label: "Movies", page: "movies" },
    { label: "Series", page: "series" },
    { label: "Live TV", page: "live" },
    { label: "Settings", page: "settings" },
  ];

  const { setRef } = useDpadFocus(menuItems.length);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold text-white mb-8">Android TV App</h1>
      <div className="flex gap-4">
        {menuItems.map((item, index) => (
          <Button
            key={item.page}
            ref={setRef(index)}
            variant="tv"
            size="tv"
            onClick={() => onNavigate(item.page)}
            className="min-w-[160px]"
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm mt-8">
        Use D-pad to navigate · Enter to select
      </p>
    </div>
  );
}

function ContentPage({
  page,
  onBack,
}: {
  page: Exclude<Page, "menu">;
  onBack: () => void;
}) {
  const content = PAGE_CONTENT[page];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold text-white">{content.title}</h1>
      <p className="text-xl text-muted-foreground max-w-md text-center">
        {content.message}
      </p>
      <Button
        ref={(el) => el?.focus()}
        variant="tv"
        size="tv"
        onClick={onBack}
        className="mt-4"
      >
        ← Back to Menu
      </Button>
    </div>
  );
}

export function AppContent() {
  const { page, navigate, goBack } = useNavigation();

  // Handle Android TV back button (mapped to Escape in WebView)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBack]);

  if (page === "menu") {
    return <MenuPage onNavigate={navigate} />;
  }

  return <ContentPage page={page} onBack={goBack} />;
}
