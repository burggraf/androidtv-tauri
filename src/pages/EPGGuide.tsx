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
const SIDEBAR_FULL_WIDTH = 400; // nav (180px) + categories (220px)
const SIDEBAR_COLLAPSED_WIDTH = 260; // icon rail (52px) + categories (~200px)
const NOW_PLAYING_HEIGHT = 240;

// Channel rows will be calculated to fill remaining space
const HOUR_WIDTH = 260;
const HALF_HOUR_WIDTH = HOUR_WIDTH / 2;
const CHANNEL_LIST_WIDTH = 200;
const CHANNEL_ROW_HEIGHT = 32;
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
        // State 2: only nav column is focusable (leftmost active column)
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setSidebarState(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedNavIdx((i) => Math.max(0, i - 1));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedNavIdx((i) => Math.min(NAV_ITEMS.length - 1, i + 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const navItem = NAV_ITEMS[focusedNavIdx];
          if (navItem?.id === "tv") {
            setSidebarState(0);
          }
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
  }, [sidebarState, visibleChannels.length, focusedNavIdx, focusedCategoryIdx, onBack, highlightedChannel, onTuneChannel]);

  // Sync scroll: channel list drives program grid vertical scroll
  useEffect(() => {
    const chList = channelListRef.current;
    const progGrid = programGridRef.current;
    if (!chList || !progGrid) return;
    const onScroll = () => {
      progGrid.scrollTop = chList.scrollTop;
    };
    chList.addEventListener("scroll", onScroll);
    return () => chList.removeEventListener("scroll", onScroll);
  }, []);

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
          /* Full sidebar: nav column + categories column side-by-side */
          <div className="flex h-full">
            {/* Nav column */}
            <div className="w-[180px] flex-shrink-0 flex flex-col border-r border-[#1a2040]">
              {/* Logo — top area with generous padding */}
              <div className="flex items-center gap-3 px-4 pt-6 pb-4 flex-shrink-0">
                <svg width="40" height="22" viewBox="0 0 1024 544" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.500000,1.000000 C6.526814,3.601168 10.008628,4.492442 13.133787,5.965473 C94.384224,44.262516 177.739212,77.399765 262.135590,108.057205 C326.915558,131.588882 392.207703,153.669220 456.886230,177.488907 C490.321930,189.802551 519.098328,208.980774 544.903442,233.193054 C578.995239,265.180481 619.332031,284.468231 665.685425,290.310944 C712.119202,296.163727 757.292175,290.638519 800.654602,272.516266 C808.129517,269.392303 815.098816,265.254578 822.036682,259.225037 C806.676208,248.709000 791.969849,238.640747 777.263489,228.572495 C785.310669,227.448166 792.690002,229.123718 800.111633,230.108170 C823.332703,233.188309 846.539917,236.385727 869.716492,239.783585 C886.302734,242.215271 903.046997,243.799164 919.034302,249.500610 C934.540283,255.030396 947.488708,263.865265 957.292725,277.168396 C958.880615,279.322998 960.559875,281.291351 963.224976,282.309753 C983.595093,290.093781 1003.937927,297.949005 1024.644653,305.891052 C1025.000000,306.444458 1025.000000,306.888885 1024.532593,307.701202 C1000.922363,308.488220 977.868652,310.353363 954.804382,312.153656 C926.938721,314.328735 899.220337,317.593750 871.674683,322.336304 C838.120361,328.113373 805.328979,336.522125 773.931213,349.977966 C749.849487,360.298492 726.934631,372.918060 703.957153,385.372681 C665.199707,406.380585 624.169556,420.227112 580.539368,426.518799 C562.905396,429.061676 545.209534,430.608307 527.424316,431.634186 C509.264648,432.681732 491.107391,432.777100 472.988800,431.903259 C447.228058,430.660828 421.534973,428.111267 395.712067,427.951447 C368.455292,427.782776 342.220978,432.240234 316.752319,442.513245 C233.213608,476.209381 149.469299,509.395721 65.805702,542.782288 C64.430946,543.330872 62.885559,543.604431 62.000000,545.000000 C54.979053,545.000000 47.958103,545.000000 40.527817,544.662415 C41.430439,543.054749 42.665497,541.692139 44.065647,540.528137 C76.484116,513.577148 108.935684,486.665833 141.323685,459.678284 C143.809158,457.607239 146.690247,455.818573 148.675476,452.247772 C103.715157,425.900574 58.956772,399.671722 14.198385,373.442871 C14.438693,372.896912 14.679001,372.350922 14.919308,371.804932 C104.703438,382.574158 194.487564,393.343384 284.271698,404.112579 C284.428925,404.669067 284.586151,405.225555 284.743408,405.782043 C269.145569,418.402283 253.547714,431.022491 237.949860,443.642700 C238.298416,444.164703 238.646957,444.686676 238.995499,445.208649 C308.743530,408.310791 378.491547,371.412903 448.891479,334.170166 C445.151154,331.524597 441.817535,331.882294 438.843964,331.528412 C402.048035,327.149597 366.067871,319.182220 330.935486,307.415985 C285.783936,292.294220 244.375610,270.286438 207.503906,240.004395 C205.572723,238.418335 203.046722,237.194168 202.164017,233.491592 C269.572174,247.364014 336.395813,261.116150 403.219452,274.868286 C403.331787,274.395325 403.444122,273.922363 403.556458,273.449432 C392.508423,269.875885 381.470795,266.269684 370.410522,262.734375 C320.780579,246.870544 271.077667,231.231415 221.529129,215.117508 C173.384567,199.460205 132.358612,172.812790 99.348625,134.195435 C98.334480,133.009018 96.616005,132.145493 97.005943,129.329697 C189.437286,156.663605 281.706757,183.949661 373.976227,211.235703 C369.251434,207.112335 363.638184,205.199127 358.146576,203.079117 C278.756104,172.430939 199.241821,142.100204 119.981293,111.120102 C73.277588,92.865288 35.706093,63.092442 9.807733,19.556036 C6.762003,14.436017 3.930703,9.188443 1.000000,4.000000 C1.263320,2.731102 -0.085014,0.387769 3.500000,1.000000 z"/>
                  <path d="M230.625000,1.000000 C238.915131,6.885776 247.954361,10.807658 256.557159,15.467915 C325.217743,52.662338 396.743439,83.575104 469.230469,112.395851 C492.141968,121.505424 514.674500,131.475861 536.197632,143.638672 C566.653809,160.849609 591.667725,184.350754 614.686707,210.304962 C634.489624,232.632965 654.859009,254.414368 678.669678,272.648346 C679.665588,273.411011 681.025635,273.998596 680.966980,276.096558 C675.479309,276.830963 670.137085,275.488861 664.811157,274.773438 C620.454590,268.815399 582.819885,249.013306 550.866760,218.243881 C521.554321,190.017288 486.761139,171.550720 448.730988,158.228531 C397.660370,140.338226 346.747101,121.999268 295.719482,103.985374 C288.964691,101.600769 283.223969,98.095078 278.149536,93.012154 C252.604752,67.424591 236.600098,36.664021 228.042023,1.382323 C228.750000,1.000000 229.500000,1.000000 230.625000,1.000000 z"/>
                </svg>
                <span className="text-lg font-bold tracking-tight text-white">Azabab</span>
              </div>
              {/* Nav items — vertically centered */}
              <div className="flex-1 flex flex-col justify-center px-2">
                {NAV_ITEMS.map((item, idx) => (
                  <button
                    key={item.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-[15px] rounded-lg transition-colors focusable",
                      idx === focusedNavIdx ? "bg-blue-600/30 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
                    )}
                  >
                    <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Categories column */}
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-4 py-1 text-sm font-semibold text-zinc-300">
                {MOCK_PROVIDER_NAME}
              </div>
              {MOCK_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full text-left px-4 py-2 transition-colors focusable text-[15px]",
                    idx === focusedCategoryIdx ? "bg-blue-600/25 text-white" : "text-zinc-400 hover:text-white hover:bg-[#1a2040]"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        ) : sidebarState === 1 ? (
          /* Collapsed sidebar: icon rail + categories */
          <div className="flex h-full">
            {/* Icon rail */}
            <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-3 gap-1 border-r border-[#1a2040]">
              <div className="w-8 h-8 flex items-center justify-center mb-3">
                <svg width="28" height="28" viewBox="0 0 1024 544" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.500000,1.000000 C6.526814,3.601168 10.008628,4.492442 13.133787,5.965473 C94.384224,44.262516 177.739212,77.399765 262.135590,108.057205 C326.915558,131.588882 392.207703,153.669220 456.886230,177.488907 C490.321930,189.802551 519.098328,208.980774 544.903442,233.193054 C578.995239,265.180481 619.332031,284.468231 665.685425,290.310944 C712.119202,296.163727 757.292175,290.638519 800.654602,272.516266 C808.129517,269.392303 815.098816,265.254578 822.036682,259.225037 C806.676208,248.709000 791.969849,238.640747 777.263489,228.572495 C785.310669,227.448166 792.690002,229.123718 800.111633,230.108170 C823.332703,233.188309 846.539917,236.385727 869.716492,239.783585 C886.302734,242.215271 903.046997,243.799164 919.034302,249.500610 C934.540283,255.030396 947.488708,263.865265 957.292725,277.168396 C958.880615,279.322998 960.559875,281.291351 963.224976,282.309753 C983.595093,290.093781 1003.937927,297.949005 1024.644653,305.891052 C1025.000000,306.444458 1025.000000,306.888885 1024.532593,307.701202 C1000.922363,308.488220 977.868652,310.353363 954.804382,312.153656 C926.938721,314.328735 899.220337,317.593750 871.674683,322.336304 C838.120361,328.113373 805.328979,336.522125 773.931213,349.977966 C749.849487,360.298492 726.934631,372.918060 703.957153,385.372681 C665.199707,406.380585 624.169556,420.227112 580.539368,426.518799 C562.905396,429.061676 545.209534,430.608307 527.424316,431.634186 C509.264648,432.681732 491.107391,432.777100 472.988800,431.903259 C447.228058,430.660828 421.534973,428.111267 395.712067,427.951447 C368.455292,427.782776 342.220978,432.240234 316.752319,442.513245 C233.213608,476.209381 149.469299,509.395721 65.805702,542.782288 C64.430946,543.330872 62.885559,543.604431 62.000000,545.000000 C54.979053,545.000000 47.958103,545.000000 40.527817,544.662415 C41.430439,543.054749 42.665497,541.692139 44.065647,540.528137 C76.484116,513.577148 108.935684,486.665833 141.323685,459.678284 C143.809158,457.607239 146.690247,455.818573 148.675476,452.247772 C103.715157,425.900574 58.956772,399.671722 14.198385,373.442871 C14.438693,372.896912 14.679001,372.350922 14.919308,371.804932 C104.703438,382.574158 194.487564,393.343384 284.271698,404.112579 C284.428925,404.669067 284.586151,405.225555 284.743408,405.782043 C269.145569,418.402283 253.547714,431.022491 237.949860,443.642700 C238.298416,444.164703 238.646957,444.686676 238.995499,445.208649 C308.743530,408.310791 378.491547,371.412903 448.891479,334.170166 C445.151154,331.524597 441.817535,331.882294 438.843964,331.528412 C402.048035,327.149597 366.067871,319.182220 330.935486,307.415985 C285.783936,292.294220 244.375610,270.286438 207.503906,240.004395 C205.572723,238.418335 203.046722,237.194168 202.164017,233.491592 C269.572174,247.364014 336.395813,261.116150 403.219452,274.868286 C403.331787,274.395325 403.444122,273.922363 403.556458,273.449432 C392.508423,269.875885 381.470795,266.269684 370.410522,262.734375 C320.780579,246.870544 271.077667,231.231415 221.529129,215.117508 C173.384567,199.460205 132.358612,172.812790 99.348625,134.195435 C98.334480,133.009018 96.616005,132.145493 97.005943,129.329697 C189.437286,156.663605 281.706757,183.949661 373.976227,211.235703 C369.251434,207.112335 363.638184,205.199127 358.146576,203.079117 C278.756104,172.430939 199.241821,142.100204 119.981293,111.120102 C73.277588,92.865288 35.706093,63.092442 9.807733,19.556036 C6.762003,14.436017 3.930703,9.188443 1.000000,4.000000 C1.263320,2.731102 -0.085014,0.387769 3.500000,1.000000 z"/>
                  <path d="M230.625000,1.000000 C238.915131,6.885776 247.954361,10.807658 256.557159,15.467915 C325.217743,52.662338 396.743439,83.575104 469.230469,112.395851 C492.141968,121.505424 514.674500,131.475861 536.197632,143.638672 C566.653809,160.849609 591.667725,184.350754 614.686707,210.304962 C634.489624,232.632965 654.859009,254.414368 678.669678,272.648346 C679.665588,273.411011 681.025635,273.998596 680.966980,276.096558 C675.479309,276.830963 670.137085,275.488861 664.811157,274.773438 C620.454590,268.815399 582.819885,249.013306 550.866760,218.243881 C521.554321,190.017288 486.761139,171.550720 448.730988,158.228531 C397.660370,140.338226 346.747101,121.999268 295.719482,103.985374 C288.964691,101.600769 283.223969,98.095078 278.149536,93.012154 C252.604752,67.424591 236.600098,36.664021 228.042023,1.382323 C228.750000,1.000000 229.500000,1.000000 230.625000,1.000000 z"/>
                </svg>
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
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 py-1 text-sm font-semibold text-zinc-300">
                {MOCK_PROVIDER_NAME}
              </div>
              {MOCK_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  className={cn(
                    "w-full text-left px-3 py-2 transition-colors focusable text-[15px]",
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
                    <Icon name="starOutline" className="w-6 h-6 text-zinc-600" />
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
                  "flex items-center gap-2 px-3 transition-colors cursor-pointer focusable",
                  idx === focusedChannelIdx ? "bg-blue-600/15" : "hover:bg-[#1a2040]"
                )}
                style={{ height: CHANNEL_ROW_HEIGHT, minHeight: CHANNEL_ROW_HEIGHT }}
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

              {/* Program rows */}
              <div className="flex flex-col">
                {visibleChannels.map((channel, channelIdx) => {
                  const programs = getProgramsForChannel(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "border-b border-[#1a2040] relative",
                        channelIdx === focusedChannelIdx && "bg-blue-600/5"
                      )}
                      style={{ height: CHANNEL_ROW_HEIGHT, minHeight: CHANNEL_ROW_HEIGHT }}
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
