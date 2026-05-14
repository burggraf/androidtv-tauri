# AGENTS.md — androidtv-tauri

## Project Overview

Tauri v2 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui → **Android TV**
Web portal: React 19 + Vite + Tailwind CSS v3 + shadcn/ui + PocketBase 0.38.0

- **Frontend (TV):** React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Frontend (Web):** React 19, TypeScript, Tailwind CSS v3, shadcn/ui
- **Backend (Web):** PocketBase 0.38.0 (embedded SQLite, JS migrations)
- **Runtime:** Tauri v2 (Rust)
- **Target:** Android TV (D-pad navigation, Leanback launcher)
- **Package Manager:** pnpm
- **Test Runner:** Vitest + Testing Library

## PocketBase Local Documentation

When working on PocketBase features (JS migrations, hooks, SDK usage, collection operations),
**ALWAYS consult local docs first** — they contain the exact PB 0.38.0 API reference.

- Core docs: `/Users/markb/dev/pb-llm/docs/session_2026-05-14_08-12-29.891/pocketbase_docs_core.txt`
- JS/SDK docs: `/Users/markb/dev/pb-llm/docs/session_2026-05-14_08-12-29.891/pocketbase_docs_js.txt`
- Full docs: `/Users/markb/dev/pb-llm/docs/session_2026-05-14_08-12-29.891/pocketbase_docs_full.txt`

Key PB 0.38.0 patterns already in use:
- JS migrations in `web/pocketbase/pb_migrations/` (`new Collection()` + `$app.save()`)
- `pb.autoCancellation(false)` required for SPA usage
- `pb.authStore.onChange()` for React auth state sync
- Autodate fields must be explicit in base collections (created/updated)

## PocketBase Data Schema

### Collections Overview

```ts
users  (built-in PB)            ← One user can own many playlists
  │                                    playlists.favorites and category_prefs
  │                                    display_prefs relate to this via `user`
  ▼
playlists                    ← Core collection. Each record is one playlist
  │  (type: "m3u" | "xstream")
  │  • M3U playlists: url = .m3u8 URL, no xstream fields used
  │  • Xtream playlists: url = server base URL, username/password used
  │  • Bulk data (live/vod/series) stored as gzipped JSON in file fields
  │
  ├─► favorites              ← Per-user per-playlist favorite streams
  │     • stream_id + type identify a specific live channel / movie / series
  │
  ├─► category_prefs         ← Per-user per-playlist category visibility + ordering
  │     • Each row = one category's hidden state + sort position
  │
  └─► display_prefs          ← Per-user per-playlist display settings (JSON)
        • view_mode, default_view, parental_pin, etc.
```

### `playlists` Collection

Owns all playlist data. M3U and Xtream playlists share this collection — the `type` field distinguishes them.

| Field | Type | Notes |
|---|---|---|
| `name` | text (required) | User-visible name |
| `url` | url (required) | M3U: .m3u8 URL. Xtream: `http://server:port` |
| `type` | select `m3u\|xstream` | Distinguishes playlist type |
| `enabled` | bool (required) | Toggle active/inactive |
| `user` | relation → users | Owner. cascadeDelete. Rule: `user = @request.auth.id` |
| `username` | text | Xtream username (null for M3U) |
| `password` | text | Xtream password (null for M3U) |

**Legacy xstream metadata fields** (populated by old `xstreamEnrich` flow):

| Field | Type | Notes |
|---|---|---|
| `expires` | date | Account expiry from xstream auth response |
| `max_streams` | number | Max concurrent connections |
| `current_streams` | number | Active connections |
| `channels` | number | Live channel count |
| `movies` | number | VOD count |
| `series` | number | Series count |

**New sync fields** (populated by `syncProvider()` in `web/src/lib/sync.ts`):

| Field | Type | Notes |
|---|---|---|
| `live_data` | file (≤10MB) | Gzipped JSON: `{version, fetched_at, categories[], streams[]}` |
| `vod_data` | file (≤10MB) | Same structure for VOD streams |
| `series_data` | file (≤10MB) | Same structure for series |
| `live_version` | text | SHA-256 hash of live data (for sync detection) |
| `vod_version` | text | SHA-256 hash of VOD data |
| `series_version` | text | SHA-256 hash of series data |
| `channels_count` | number | Live count from sync (replaces `channels`) |
| `movies_count` | number | VOD count from sync (replaces `movies`) |
| `series_count` | number | Series count from sync (replaces `series`) |
| `max_connections` | number | Max connections from auth (replaces `max_streams`) |
| `active_connections` | number | Active connections (replaces `current_streams`) |
| `allowed_formats` | json | `["m3u8", "ts"]` from auth response |
| `last_sync_at` | date | Timestamp of last successful sync |
| `last_sync_status` | select `idle\|syncing\|success\|error` |
| `last_sync_error` | text | Error message if sync failed |

Rules: `listRule`, `viewRule`, `createRule`, `updateRule`, `deleteRule` all = `user = @request.auth.id`
Indexes: `idx_playlists_user ON playlists (user)`

### `favorites` Collection

User's favorite streams per playlist.

| Field | Type | Notes |
|---|---|---|
| `user` | relation → users | Owner. cascadeDelete |
| `provider` | relation → playlists | Which playlist this favorite belongs to. cascadeDelete |
| `stream_id` | text (≤100) | Provider's stream ID (not PB record ID) |
| `type` | select `live\|vod\|series` | Content type |
| `name` | text (≤300) | Cached stream name for display |
| `thumbnail` | text | Cached stream icon/thumbnail URL |

Unique index: `[user, provider, stream_id, type]`
Rules: all = `user = @request.auth.id`

### `category_prefs` Collection

User's per-playlist category visibility and ordering preferences.

| Field | Type | Notes |
|---|---|---|
| `user` | relation → users | Owner. cascadeDelete |
| `provider` | relation → playlists | Which playlist. cascadeDelete |
| `type` | select `live\|vod\|series` | Content type |
| `category_id` | text (≤100) | Provider's category ID |
| `hidden` | bool | Whether category is hidden from UI |
| `sort_order` | number | Display order (0 = first) |

Unique index: `[user, provider, type, category_id]`
Rules: all = `user = @request.auth.id`

### `display_prefs` Collection

User's per-playlist display settings.

| Field | Type | Notes |
|---|---|---|
| `user` | relation → users | Owner. cascadeDelete |
| `provider` | relation → playlists | Which playlist. cascadeDelete |
| `settings` | json | `{view_mode, default_view, parental_pin, epg_enabled, ...}` |

Unique index: `[user, provider]`
Rules: all = `user = @request.auth.id`

### Data Flow

```
Xtream Provider API (residential IP)
       │
       ▼ (client-side fetch)
  xstreamGetAllData() → {live, vod, series} data
       │
       ▼ (compress with fflate gzip)
  playlists.live_data / vod_data / series_data  (file fields)
  playlists.{live,vod,series}_version           (SHA-256 hashes)
  playlists.{channels,movies,series}_count      (counts)
       │
       ▼ (client downloads via pb.files.getUrl)
  TV App: src/lib/provider-data.ts
    • Downloads gzipped files
    • Decompresses → caches in IndexedDB
    • Merges with favorites + category_prefs + display_prefs
```

### Key Modules

| File | Purpose |
|---|---|
| `web/src/lib/xstream.ts` | Xtream Codes API client — all fetches run client-side |
| `web/src/lib/sync.ts` | Sync orchestrator — fetch, compress, upload, version tracking |
| `web/src/lib/preferences.ts` | Favorites, category_prefs, display_prefs CRUD |
| `web/src/hooks/usePlaylists.ts` | Playlist CRUD hook with auto-sync on create |
| `src/lib/pb-client.ts` | TV app PocketBase client |
| `src/lib/provider-data.ts` | TV app data loader — IndexedDB cache, decompress, merge prefs |

## Quick Start

```bash
# 1. Install + setup
pnpm install
pnpm tauri android init
./scripts/setup-android.sh    # fixes missing generated Gradle files

# 2. Desktop dev (fast iteration)
pnpm tauri dev

# 3. Android TV dev (emulator required)
./scripts/emulator-start.sh   # start emulator in another terminal
./scripts/dev-loop.sh         # build + install + launch + hot reload

# 4. Web portal dev
./scripts/web-dev.sh          # starts PocketBase + Vite on :5173

# 5. Demo (headed emulator + dev)
./scripts/demo.sh
```

## Development Workflow

### Desktop (Primary — fast)

```bash
pnpm tauri dev
```
- Opens desktop window with hot reload
- Arrow keys = D-pad simulation
- Enter = select, Escape = back
- Use for rapid UI iteration

### Android TV (Emulator)

**Terminal 1 — Start emulator:**
```bash
./scripts/emulator-start.sh           # headless (agent work)
./scripts/emulator-start.sh --headed  # headed (user demo)
```

**Terminal 2 — Dev loop:**
```bash
./scripts/dev-loop.sh
```
This runs `pnpm tauri android dev` which:
1. Starts Vite dev server (port 1420)
2. Builds Rust → native .so libraries
3. Installs APK on emulator
4. Launches app
5. Watches for changes (hot reload)

### One-shot build (production APK)
```bash
./scripts/build-release.sh
# or: pnpm tauri android build
```

## Testing

```bash
pnpm test          # single run
pnpm test:watch    # watch mode
```

### TDD Workflow
1. Write failing test in `__tests__/`
2. Run `pnpm test:watch`
3. Implement feature
4. Verify green
5. Repeat

## D-Pad Navigation

All interactive elements MUST:
- Use `focusable` CSS class (defined in `src/index.css`)
- Navigate via ArrowLeft/Right (horizontal) or Up/Down (vertical)
- Activate on Enter/DPAD_CENTER
- Support Back/Escape

### Key Mappings

| Android TV | WebView Key | ADB KeyEvent |
|---|---|---|
| DPAD_UP | ArrowUp | 19 |
| DPAD_DOWN | ArrowDown | 20 |
| DPAD_LEFT | ArrowLeft | 21 |
| DPAD_RIGHT | ArrowRight | 22 |
| DPAD_CENTER | Enter | 23 |
| BACK | Escape | 4 |
| HOME | — | 3 |

### D-Pad Hook
```ts
const { focusedIndex, setRef } = useDpadFocus(itemCount);
// ArrowLeft/Right navigates. Enter activates focused button.
```

## File Structure

```
src/                    # Tauri Android TV app
  App.tsx               # Navigation, pages, D-pad hooks
  main.tsx              # Entry point
  index.css             # Tailwind v4, focus ring styles
  lib/utils.ts          # cn() utility
  components/ui/        # shadcn/ui components
  pages/                # TV pages
src-tauri/              # Tauri Rust backend
  tauri.conf.json
  src/lib.rs
  gen/android/          # Generated Android project
web/                    # Web portal (React + PocketBase)
  pocketbase/
    pocketbase          # Binary (download, don't commit)
    pb_data/            # SQLite DB (gitignored)
    pb_migrations/      # JS migration files (commit)
  src/
    lib/pocketbase.ts   # PB client singleton (autoCancellation off)
    hooks/useAuth.ts    # Auth state, login, signup, logout
    hooks/usePlaylists.ts # Playlist CRUD hook
    pages/              # Login, Signup, Dashboard
    components/         # PlaylistCard, PlaylistForm, shadcn/ui
  vite.config.ts        # Vite config, proxy to PB
  tailwind.config.js    # Tailwind 3 config
scripts/
  emulator-start.sh     # Start/stop emulator
  dev-loop.sh           # Tauri android dev
  web-dev.sh            # Start PocketBase + Vite concurrently
  demo.sh
  build-release.sh
  setup-android.sh
  screenshot.sh
__tests__/              # TV app tests
```

## Emulator

- **AVD:** `Android_TV_API34` (Android TV, API 34, arm64-v8a)
- **Package:** `com.markb.tauri_app`
- **Leanback:** Both `LAUNCHER` and `LEANBACK_LAUNCHER` intent categories

## ADB Quick Reference

```bash
adb shell input keyevent 22  # D-pad right
adb shell input keyevent 23  # Select
adb shell input keyevent 4   # Back
adb logcat | grep tauri      # Logs
./scripts/screenshot.sh      # Screenshot + open
adb shell am force-stop com.markb.tauri_app  # Force stop
adb shell pm clear com.markb.tauri_app       # Clear data
```

## Known Issues

- **Tauri CLI bug:** `tauri android init` may not generate `tauri.settings.gradle` and `tauri.build.gradle.kts` when no Android plugins exist. Run `./scripts/setup-android.sh` to create empty files.
- **pnpm exec:** May fail with pnpm 11+. Use direct binary paths: `node node_modules/.bin/tsc`
- **Build:** Use `vite build` directly or `pnpm tauri build` (desktop) / `pnpm tauri android build` (Android)
