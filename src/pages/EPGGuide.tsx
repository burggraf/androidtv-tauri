/**
 * EPGGuide — TiviMate-style Electronic Program Guide.
 *
 * Layout structure:
 *   ┌─────────────────────────────────────────────────────┐
 *   │           Now Playing Bar (~200px tall)             │
 *   ├──────────┬──────────────────────────────────────────┤
 *   │  Date    │  1:30 PM  │  2:00 PM  │  2:30 PM  │ ...  │
 *   │  + Time  ├──────────┴───────────┴───────────┴──────┤
 *   │  (in     │  Channel 1 │  Program blocks...          │
 *   │  channel │  Channel 2 │  Program blocks...          │
 *   │  column) │  ...       │  ...                        │
 *   └──────────┴──────────────────────────────────────────┘
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

// ── Constants ────────────────────────────────────────────────
const SIDEBAR_FULL_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 200;
const NOW_PLAYING_HEIGHT = 240;
const TIMELINE_HEADER_HEIGHT = 28;
// Channel rows will be calculated to fill remaining space
const HOUR_WIDTH = 260;
const HALF_HOUR_WIDTH = HOUR_WIDTH / 2;
const CHANNEL_LIST_WIDTH = 200;
const TIMELINE_START_HOUR = 13;
const TIMELINE_END_HOUR = 22;
const HALF_HOUR_INCREMENT = 0.5;

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
    starOutline: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "AM" : "PM";
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// Generate time slots at half-hour intervals
function getTimeSlots(): number[] {
  const slots: number[] = [];
  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h += HALF_HOUR_INCREMENT) {
    slots.push(h);
  }
  return slots;
}

// ─── EPG Guide ────────────────────────────────────────────────
export function EPGGuide({ onBack, onTuneChannel }: { onBack?: () => void; onTuneChannel?: (channel: Channel) => void }) {
  const [sidebarState, setSidebarState] = useState<0 | 1 | 2>(0);
  const [focusedChannelIdx, setFocusedChannelIdx] = useState(0);
  const [focusedCategoryIdx, setFocusedCategoryIdx] = useState(0);
  const [focusedNavIdx, setFocusedNavIdx] = useState(1);
  const [currentTime, setCurrentTime] = useState(new Date());

  const channelListRef = useRef<HTMLDivElement>(null);
  const programGridRef = useRef<HTMLDivElement>(null);

  const timeSlots = useMemo(() => getTimeSlots(), []);
  const totalGridWidth = (TIMELINE_END_HOUR - TIMELINE_START_HOUR + HALF_HOUR_INCREMENT) * HOUR_WIDTH;

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

  // D-pad navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sidebarState === 0) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSidebarState(1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          if (programGridRef.current) programGridRef.current.scrollLeft += HALF_HOUR_WIDTH;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedChannelIdx((i) => Math.min(visibleChannels.length - 1, i + 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (highlightedChannel) onTuneChannel?.(highlightedChannel);
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
          setFocusedCategoryIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedCategoryIdx((i) => Math.min(MOCK_CATEGORIES.length - 1, i + 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const cat = MOCK_CATEGORIES[focusedCategoryIdx];
          if (cat && cat.channelIds.length > 0) {
            const chIdx = visibleChannels.findIndex((c) => c.id === cat.channelIds[0]);
            if (chIdx >= 0) setFocusedChannelIdx(chIdx);
            setSidebarState(0);
          }
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
  }, [sidebarState, visibleChannels.length, focusedCategoryIdx, onBack, highlightedChannel, onTuneChannel]);

  // Auto-scroll focused channel into view
  useEffect(() => {
    if (channelListRef.current) {
      const row = channelListRef.current.children[focusedChannelIdx] as HTMLElement;
      if (row) row.scrollIntoView({ block: "nearest" });
    }
  }, [focusedChannelIdx]);

  // Auto-scroll to current time (aligned to nearest half-hour)
  useEffect(() => {
    if (programGridRef.current) {
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      // Align to nearest half-hour slot
      const alignedHour = Math.floor(currentHour * 2) / 2;
      const slotIndex = (alignedHour - TIMELINE_START_HOUR) / HALF_HOUR_INCREMENT;
      const scrollPos = Math.max(0, Math.floor(slotIndex) * HALF_HOUR_WIDTH);
      programGridRef.current.scrollLeft = scrollPos;
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
          "flex-shrink-0 h-full bg-[#0d1224] border-r border-[#1a2040] transition-all duration-200 ease-out overflow-hidden",
          sidebarState === 0 && "w-0 border-none"
        )}
        style={{ width: sidebarState === 0 ? 0 : sidebarWidth }}
      >
        {sidebarState === 2 ? (
          /* Full sidebar: logo + nav + categories stacked vertically */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-center py-3 border-b border-[#1a2040] flex-shrink-0">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-blue-500">tivi</span>
                <span className="text-white">mate</span>
              </span>
            </div>
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
            <div className="flex-1 overflow-y-auto py-1 border-t border-[#1a2040]">
              <div className="px-4 py-2 text-sm font-semibold text-white">
                {MOCK_PROVIDER_NAME}
              </div>
              {MOCK_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full text-left px-6 py-1.5 transition-colors focusable text-sm",
                    idx === focusedCategoryIdx ? "bg-blue-600/25 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        ) : sidebarState === 1 ? (
          /* Collapsed sidebar: icon rail on left, categories on right */
          <div className="flex h-full">
            {/* Icon rail */}
            <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-2 gap-1 border-r border-[#1a2040]">
              <div className="w-8 h-8 flex items-center justify-center mb-2">
                <Icon name="tv" className="w-5 h-5 text-blue-500" />
              </div>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-[#1a2040] transition-colors focusable"
                  title={item.label}
                >
                  <Icon name={item.icon} className="w-5 h-5" />
                </button>
              ))}
            </div>
            {/* Categories panel */}
            <div className="flex-1 overflow-y-auto py-1">
              <div className="px-3 py-2 text-sm font-semibold text-white">
                {MOCK_PROVIDER_NAME}
              </div>
              {MOCK_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full text-left px-3 py-1.5 transition-colors focusable text-sm",
                    idx === focusedCategoryIdx ? "bg-blue-600/25 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── Main Content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Now Playing Bar - Large header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-[#1a2040]" style={{ height: NOW_PLAYING_HEIGHT }}>
          <div className="flex gap-5 h-full items-start">
            {/* Program thumbnail - larger */}
            <div className="w-56 h-32 bg-[#1a2040] rounded-xl overflow-hidden flex-shrink-0 relative shadow-lg">
              {highlightedProgram?.thumbnail ? (
                <img src={highlightedProgram.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1e2a4a] to-[#0d1224] flex items-center justify-center">
                  <Icon name="tv" className="w-16 h-16 text-zinc-600" />
                </div>
              )}
              {/* Channel logo overlay */}
              {highlightedChannel && (
                <div className="absolute bottom-2 right-2 w-7 h-7 bg-[#0d1224]/90 rounded-md flex items-center justify-center text-[9px] font-bold text-zinc-300">
                  {highlightedChannel.logo}
                </div>
              )}
            </div>

            {/* Program info - takes remaining space */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-semibold text-white truncate mb-2">
                      {highlightedProgram?.title || "No program"}
                    </h2>
                    {highlightedProgram && (
                      <div className="flex items-center gap-4 text-base text-zinc-400">
                        <span>{formatTime(highlightedProgram.startHour)} – {formatTime(highlightedProgram.startHour + highlightedProgram.durationHours)}</span>
                        <span className="w-8 h-0.5 bg-zinc-600" />
                        <span>{Math.max(0, Math.round(((highlightedProgram.startHour + highlightedProgram.durationHours - currentHour) * 60)))} min left</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button className="text-zinc-500 hover:text-yellow-400 transition-colors focusable p-1">
                      <Icon name="starOutline" className="w-6 h-6" />
                    </button>
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">{MOCK_PROVIDER_NAME}</p>
                      <p className="text-xs text-zinc-500">{currentCategory.name}</p>
                    </div>
                  </div>
                </div>

                <p className="text-base text-zinc-400 mt-3 line-clamp-2 max-w-3xl">
                  {highlightedProgram?.description || "No description available."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── EPG Grid ──────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Channel List */}
          <div
            ref={channelListRef}
            className="flex-shrink-0 bg-[#0d1224] border-r border-[#1a2040] flex flex-col"
            style={{ width: CHANNEL_LIST_WIDTH }}
          >
            {/* Header - date/time aligned with channel column */}
            <div
              className="h-8 flex items-center px-3 text-xs text-blue-400 font-medium bg-[#0d1224] border-b border-[#1a2040] sticky top-0 z-20 flex-shrink-0"
              style={{ width: CHANNEL_LIST_WIDTH }}
            >
              {formatDateTime(currentTime).split(",").slice(0, 2).join(",")}
            </div>

            {/* Channel rows */}
            <div className="flex flex-col flex-1 overflow-y-auto">
              {visibleChannels.map((channel, idx) => (
                <div
                key={channel.id}
                className={cn(
                  "flex items-center gap-2 px-3 transition-colors cursor-pointer focusable flex-1 min-h-0",
                  idx === focusedChannelIdx ? "bg-blue-600/15" : "hover:bg-[#1a2040]"
                )}
                onClick={() => setFocusedChannelIdx(idx)}
              >
                <span className="text-xs text-zinc-500 w-4 text-right flex-shrink-0 tabular-nums">
                  {channel.number}
                </span>
                <div className="w-5 h-5 bg-[#1a2040] rounded flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-zinc-400">
                  {channel.logo}
                </div>
                <span className="text-xs text-white truncate leading-tight">{channel.name}</span>
              </div>
            ))}
            </div>
          </div>

          {/* Program Grid + Timeline Header */}
          <div ref={programGridRef} className="flex-1 overflow-auto relative flex flex-col">
            <div style={{ width: totalGridWidth }} className="flex flex-col flex-1">
              {/* Timeline Header - separate row above grid */}
              <div className="h-8 bg-[#0d1224] border-b border-[#1a2040] sticky top-0 z-10 relative" style={{ width: totalGridWidth }}>
                {timeSlots.map((hour, idx) => (
                  <div
                    key={hour}
                    className={cn(
                      "absolute top-0 h-8 text-xs flex items-center",
                      idx % 2 === 0 ? "text-zinc-400 border-l border-[#1a2040]" : "text-zinc-600"
                    )}
                    style={{ left: idx * HALF_HOUR_WIDTH, width: HALF_HOUR_WIDTH }}
                  >
                    <span className="pl-1.5 font-medium tabular-nums whitespace-nowrap">
                      {formatTimeSlot(hour)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Now time indicator - spans entire height */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-30 pointer-events-none"
                style={{ left: nowPositionPx }}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full -ml-[3px] absolute -top-1" />
              </div>

              {/* Program rows - flex container fills remaining height */}
              <div className="flex flex-col flex-1">
                {visibleChannels.map((channel, channelIdx) => {
                  const programs = getProgramsForChannel(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "border-b border-[#1a2040] relative flex-1 min-h-0",
                        channelIdx === focusedChannelIdx && "bg-blue-600/5"
                      )}
                    >
                      {programs.map((program) => {
                        if (!program || program.startHour == null || program.durationHours == null) return null;
                        const slotIndex = (program.startHour - TIMELINE_START_HOUR) / HALF_HOUR_INCREMENT;
                        const startOffset = slotIndex * HALF_HOUR_WIDTH;
                        const duration = program.durationHours * HOUR_WIDTH;

                        return (
                          <button
                            key={program.id}
                            className={cn(
                              "absolute rounded px-2 flex items-center transition-all focusable text-left overflow-hidden border border-transparent",
                              highlightedProgram?.id === program.id
                                ? "bg-blue-600/30 border-blue-500/40 text-white"
                                : "bg-[#151b30] text-zinc-300 hover:bg-[#1e2642]"
                            )}
                            style={{ left: startOffset, width: Math.max(duration - 4, 28), top: '10%', height: '80%' }}
                            onClick={() => setFocusedChannelIdx(channelIdx)}
                          >
                            <span className="text-sm truncate">{program.title}</span>
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
    </div>
  );
}
