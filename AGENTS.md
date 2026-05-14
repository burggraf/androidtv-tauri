# AGENTS.md — androidtv-tauri

## Project Overview

Tauri v2 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui → **Android TV**

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Runtime:** Tauri v2 (Rust)
- **Target:** Android TV (D-pad navigation, Leanback launcher)
- **Package Manager:** pnpm
- **Test Runner:** Vitest + Testing Library

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

# 4. Demo (headed emulator + dev)
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
src/
  App.tsx              # Navigation, pages, D-pad hooks
  main.tsx             # Entry point
  index.css            # Tailwind v4, focus ring styles
  lib/utils.ts         # cn() utility
  components/ui/       # shadcn/ui components
    button.tsx         # Button with "tv" variant
src-tauri/
  tauri.conf.json      # Tauri config
  src/lib.rs           # Rust entry
  gen/android/         # Generated Android project
    tauri.settings.gradle    # ⚠️ Must exist (may be empty)
    app/tauri.build.gradle.kts # ⚠️ Must exist (may be empty)
scripts/
  emulator-start.sh    # Start/stop emulator
  dev-loop.sh          # Tauri android dev
  demo.sh              # Headed emulator + dev
  build-release.sh     # Production APK build
  setup-android.sh     # Fix missing Gradle files
  screenshot.sh        # Screenshot utility
.pi/skills/emulator-loop/  # Emulator skill
__tests__/
  app.test.tsx         # Navigation + D-pad tests
  setup.ts             # Test setup
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
