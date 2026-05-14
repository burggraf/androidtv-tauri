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
