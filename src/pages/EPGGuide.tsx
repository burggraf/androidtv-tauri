/**
 * EPGGuide — TiviMate-style Electronic Program Guide.
 *
 * Three sidebar states driven by D-pad Left/Right:
 *   0 = hidden (full EPG)
 *   1 = collapsed (icon rail + categories)
 *   2 = full (nav items + icon rail + categories)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MOCK_CHANNELS,
  MOCK_PROGRAMS,
  MOCK_CATEGORIES,
  MOCK_PROVIDER_NAME,
  type Channel,
  type Program,
} from "@/lib/mock-epg-data";

// ── Constants ───────────────────────────────────────────────
const SIDEBAR_FULL_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const CHANNEL_ROW_HEIGHT = 48;
const HEADER_HEIGHT = 100;
const HOUR_WIDTH = 260;
const CHANNEL_LIST_WIDTH = 200;
const TIMELINE_START_HOUR = 13;
const TIMELINE_END_HOUR = 22;

const NAV_ITEMS = [
  { id: "search", label: "Search", icon: "search" },
  { id: "tv", label: "TV", icon: "tv" },
  { id: "movies", label: "Movies", icon: "film" },
  { id: "shows", label: "Shows", icon: "tv" },
  { id: "recordings", label: "Recordings", icon: "disc" },
  { id: "mylist", label: "My list", icon: "bookmark" },
  { id: "settings", label: "Settings", icon: "settings" },
] as const;

// ─── Icons ────────────────────────────────────────────────────
function Icon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
    tv: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="15" x="2" y="7" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" />
      </svg>
    ),
    film: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4" />
      </svg>
    ),
    disc: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      </svg>
    ),
    bookmark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    chevronUp: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m18 15-6-6-6 6" />
      </svg>
    ),
    chevronDown: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m6 9 6 6 6-6" />
      </svg>
    ),
  };
  return <>{icons[name] || null}</>;
}

// ─── Time helpers ─────────────────────────────────────────────
function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDateTime(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + ", " + formatTime(date.getHours() + date.getMinutes() / 60);
}

function formatTimeSlot(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
}

// ─── EPG Guide ────────────────────────────────────────────────
export function EPGGuide({ onBack }: { onBack?: () => void }) {
  const [sidebarState, setSidebarState] = useState<0 | 1 | 2>(0);
  const [focusedChannelIdx, setFocusedChannelIdx] = useState(0);
  const [focusedCategoryIdx, setFocusedCategoryIdx] = useState(0);
  const [focusedNavIdx, setFocusedNavIdx] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());

  const channelListRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);

  const currentCategory = MOCK_CATEGORIES[focusedCategoryIdx] || MOCK_CATEGORIES[0];
  const visibleChannels = useMemo(
    () => currentCategory.channelIds.map((id) => MOCK_CHANNELS.find((c) => c.id === id)!).filter(Boolean),
    [currentCategory]
  );

  const getProgramsForChannel = useCallback((channelId: string): Program[] => {
    return MOCK_PROGRAMS.filter((p) => p.channelId === channelId).sort((a, b) => a.startHour - b.startHour);
  }, []);

  const highlightedChannel = visibleChannels[focusedChannelIdx];
  const highlightedProgram = useMemo(() => {
    if (!highlightedChannel) return null;
    const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
    const programs = getProgramsForChannel(highlightedChannel.id);
    const prog = programs.find((p) => currentHour >= p.startHour && currentHour < p.startHour + p.durationHours) || programs[0] || null;
    return prog && prog.startHour != null && prog.durationHours != null ? prog : null;
  }, [highlightedChannel, currentTime, getProgramsForChannel]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sidebarState === 0) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSidebarState(1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          if (programGridRef.current) programGridRef.current.scrollLeft += 200;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.min(visibleChannels.length - 1, i + 1));
        }
      } else if (sidebarState === 1) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSidebarState(2);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSidebarState(0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.min(visibleChannels.length - 1, i + 1));
        }
      } else {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setSidebarState(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedCategoryIdx((i) => Math.max(0, i - 1));
          setFocusedNavIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedCategoryIdx((i) => Math.min(MOCK_CATEGORIES.length - 1, i + 1));
          setFocusedNavIdx((i) => Math.min(NAV_ITEMS.length - 1, i + 1));
        }
      }

      if (e.key === "Escape" || e.key === "Backspace") {
        if (sidebarState > 0) {
          e.preventDefault();
          setSidebarState((s) => (s - 1) as 0 | 1 | 2);
        } else if (onBack) {
          e.preventDefault();
          onBack();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarState, visibleChannels.length, onBack]);

  useEffect(() => {
    if (channelListRef.current) {
      const row = channelListRef.current.children[focusedChannelIdx] as HTMLElement;
      if (row) row.scrollIntoView({ block: "nearest" });
    }
  }, [focusedChannelIdx]);

  useEffect(() => {
    if (programGridRef.current) {
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      const scrollPos = (currentHour - TIMELINE_START_HOUR) * HOUR_WIDTH - 100;
      programGridRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, []);

  const sidebarWidth = sidebarState === 0 ? 0 : sidebarState === 1 ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_FULL_WIDTH;
  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  const nowPositionPx = (currentHour - TIMELINE_START_HOUR) * HOUR_WIDTH;

  return (
    <div className="flex h-screen w-screen bg-[#0a0e1a] text-white overflow-hidden select-none">
      {/* ─── Sidebar ────────────────────────────────────── */}
      <div
        className={cn(
          "flex-shrink-0 h-full bg-[#0d1224] border-r border-[#1a2040] transition-all duration-200 ease-out flex flex-col overflow-hidden",
          sidebarState === 0 && "w-0 border-none"
        )}
        style={{ width: sidebarState === 0 ? 0 : sidebarWidth }}
      >
        <div className="flex items-center justify-center py-3 border-b border-[#1a2040] flex-shrink-0">
          {sidebarState === 2 ? (
            <span className="text-lg font-bold tracking-tight">
              <span className="text-blue-500">tivi</span>
              <span className="text-white">mate</span>
            </span>
          ) : (
            <span className="text-blue-500 font-bold text-base">tv</span>
          )}
        </div>

        {sidebarState === 2 && (
          <div className="py-1 flex-shrink-0">
            {NAV_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors focusable",
                  idx === focusedNavIdx ? "bg-blue-600/30 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
                )}
              >
                <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1 border-t border-[#1a2040]">
          {sidebarState === 2 && (
            <button className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a2040] focusable">
              <span className="truncate">{MOCK_PROVIDER_NAME}</span>
              <Icon name="chevronUp" className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
          {MOCK_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.id}
              className={cn(
                "w-full text-left transition-colors focusable text-sm truncate",
                sidebarState === 2 ? "px-6 py-1.5" : "px-2 py-1.5 text-center",
                idx === focusedCategoryIdx ? "bg-blue-600/25 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
              )}
            >
              {sidebarState === 2 ? cat.name : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Now Playing Bar */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-[#1a2040]" style={{ height: HEADER_HEIGHT }}>
          <div className="flex gap-4 h-full items-start">
            <div className="w-40 h-20 bg-[#1a2040] rounded-lg overflow-hidden flex-shrink-0">
              {highlightedProgram?.thumbnail ? (
                <img src={highlightedProgram.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1a2040] to-[#0d1224] flex items-center justify-center">
                  <Icon name="tv" className="w-10 h-10 text-zinc-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {highlightedProgram?.title || "No program"}
                  </h2>
                  {highlightedProgram && (
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-zinc-400">
                      <span>{formatTime(highlightedProgram.startHour)} – {formatTime(highlightedProgram.startHour + highlightedProgram.durationHours)}</span>
                      <span className="text-zinc-600">—</span>
                      <span>{Math.max(0, Math.round(((highlightedProgram.startHour + highlightedProgram.durationHours - currentHour) * 60)))} min left</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="text-zinc-500 hover:text-yellow-400 transition-colors focusable p-1 rounded">
                    <Icon name="star" className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                    <p className="text-sm text-white font-medium">{MOCK_PROVIDER_NAME}</p>
                    <p className="text-xs text-zinc-500">{currentCategory.name}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-zinc-500 mt-1 line-clamp-2 max-w-xl">
                {highlightedProgram?.description || "No description available."}
              </p>
            </div>
          </div>
        </div>

        {/* ── EPG Grid ──────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Channel List */}
          <div
            ref={channelListRef}
            className="flex-shrink-0 overflow-y-auto bg-[#0d1224] border-r border-[#1a2040]"
            style={{ width: CHANNEL_LIST_WIDTH }}
          >
            {/* Header spacer - shows current date/time */}
            <div
              className="h-8 flex items-center px-2 text-xs text-blue-400 font-medium bg-[#0d1224] border-b border-[#1a2040] sticky top-0 z-20"
              style={{ width: CHANNEL_LIST_WIDTH }}
            >
              {formatDateTime(currentTime).split(",")[0]}
            </div>

            {visibleChannels.map((channel, idx) => (
              <div
                key={channel.id}
                className={cn(
                  "flex items-center gap-2 px-3 transition-colors cursor-pointer focusable",
                  idx === focusedChannelIdx ? "bg-blue-600/15" : "hover:bg-[#1a2040]"
                )}
                style={{ height: CHANNEL_ROW_HEIGHT }}
                onClick={() => setFocusedChannelIdx(idx)}
              >
                <span className="text-xs text-zinc-500 w-4 text-right flex-shrink-0 tabular-nums">
                  {channel.number}
                </span>
                <div className="w-6 h-6 bg-[#1a2040] rounded flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-zinc-400">
                  {channel.logo}
                </div>
                <span className="text-xs text-white truncate leading-tight">{channel.name}</span>
              </div>
            ))}
          </div>

          {/* Program Grid + Timeline Header */}
          <div ref={programGridRef} className="flex-1 overflow-auto relative">
            <div style={{ width: (TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1) * HOUR_WIDTH }}>
              {/* Timeline Header */}
              <div className="h-8 bg-[#0d1224] border-b border-[#1a2040] sticky top-0 z-10 relative">
                {Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR + 1 }, (_, i) => TIMELINE_START_HOUR + i).map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 h-8 text-xs text-zinc-500 flex items-center border-l border-[#1a2040]"
                    style={{ left: (hour - TIMELINE_START_HOUR) * HOUR_WIDTH, width: HOUR_WIDTH }}
                  >
                    <span className="px-2 font-medium tabular-nums whitespace-nowrap">{formatTimeSlot(hour)}</span>
                  </div>
                ))}
              </div>

              {/* Now time indicator */}
              <div
                className="absolute top-8 bottom-0 w-0.5 bg-blue-500 z-30 pointer-events-none"
                style={{ left: nowPositionPx }}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full -ml-[3px] -mt-1 absolute top-0" />
              </div>
              {visibleChannels.map((channel, channelIdx) => {
                const programs = getProgramsForChannel(channel.id);
                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "border-b border-[#1a2040] relative",
                      channelIdx === focusedChannelIdx && "bg-blue-600/5"
                    )}
                    style={{ height: CHANNEL_ROW_HEIGHT }}
                  >
                    {programs.map((program) => {
                      if (!program || program.startHour == null || program.durationHours == null) return null;
                      const startOffset = Math.max(0, (program.startHour - TIMELINE_START_HOUR) * HOUR_WIDTH);
                      const duration = program.durationHours * HOUR_WIDTH;

                      return (
                        <button
                          key={program.id}
                          className={cn(
                            "absolute h-[42px] top-[3px] rounded px-2 flex items-center transition-all focusable text-left overflow-hidden border border-transparent",
                            highlightedProgram?.id === program.id
                              ? "bg-blue-600/30 border-blue-500/40 text-white"
                              : "bg-[#151b30] text-zinc-300 hover:bg-[#1e2642]"
                          )}
                          style={{ left: startOffset, width: Math.max(duration - 4, 30) }}
                          onClick={() => setFocusedChannelIdx(channelIdx)}
                        >
                          <span className="text-xs truncate">{program.title}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
