# Android TV Tauri App

A cross-platform Android TV app built with **Tauri v2**, **React 19**, **TypeScript**, and **shadcn/ui**.

- **Frontend:** React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui
- **Runtime:** Tauri v2 (Rust backend + WebView frontend)
- **Target:** Android TV with D-pad navigation
- **Package Manager:** pnpm v11

## Prerequisites

- [Rust](https://rust-lang.org) (latest stable)
- [Node.js](https://nodejs.org) v18+ with pnpm v11
- **macOS:** Xcode Command Line Tools
- **Android:** Android SDK + NDK 27 (installed via Android Studio)
- **Emulator:** `Android_TV_API34` AVD (or create your own)

## Setup

```bash
# Install dependencies
pnpm install

# Initialize Android target (one-time)
pnpm tauri android init

# Fix missing generated Gradle files (Tauri CLI quirk)
./scripts/setup-android.sh
```

## Development

### Desktop (Fastest — Use for UI iteration)

```bash
pnpm tauri dev
```

Opens a desktop window with hot reload. Arrow keys simulate D-pad, Enter = select, Escape = back.

### Android TV (Emulator)

**Terminal 1 — Start emulator:**
```bash
./scripts/emulator-start.sh --headed   # visual demo
./scripts/emulator-start.sh            # headless (agent work)
```

**Terminal 2 — Dev loop:**
```bash
pnpm tauri android dev
```

Starts Vite dev server → builds Rust → installs APK → launches app → hot reloads on change.

### Demo (One command)

```bash
./scripts/demo.sh
```

Starts headed emulator, then runs full dev loop.

## Testing

```bash
pnpm test          # Run tests once
pnpm test:watch    # Watch mode (TDD)
```

Tests cover: page navigation, D-pad keyboard events, back button, focus management.

## Build

### Desktop (macOS .app)

```bash
pnpm tauri build
# Output: src-tauri/target/release/bundle/macos/
```

### Android (APK)

**Debug:**
```bash
pnpm tauri android dev
# APK built and installed automatically
```

**Release:**
```bash
pnpm tauri android build
# Output: src-tauri/gen/android/app/build/outputs/apk/
```

## Deploy

### Android TV — Install APK on Device

**Via ADB (network or USB):**
```bash
# Connect to device
adb connect <device-ip>:5555

# Install
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk

# Or debug build
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
```

### Google Play Store

1. Generate a signing key:
```bash
keytool -genkeypair -v -keystore androidtv-tauri.keystore -alias androidtv-tauri -keyalg RSA -keysize 2048 -validity 10000
```

2. Build signed release APK (configure `signingConfig` in `src-tauri/gen/android/app/build.gradle.kts`).

3. Upload the `.aab` or `.apk` to [Google Play Console](https://play.google.com/console).

## Scripts Reference

| Script | Purpose |
|---|---|
| `./scripts/emulator-start.sh` | Start Android TV emulator (headless) |
| `./scripts/emulator-start.sh --headed` | Start emulator with window (demo) |
| `./scripts/emulator-start.sh --stop` | Stop running emulator |
| `./scripts/dev-loop.sh` | Build + install + launch on emulator |
| `./scripts/demo.sh` | Headed emulator + dev loop combined |
| `./scripts/build-release.sh` | Build production APK |
| `./scripts/setup-android.sh` | Fix missing Tauri-generated Gradle files |
| `./scripts/screenshot.sh` | Screenshot emulator and open |

## ADB Quick Reference (Android TV D-Pad)

```bash
adb shell input keyevent 19   # DPAD_UP
adb shell input keyevent 20   # DPAD_DOWN
adb shell input keyevent 21   # DPAD_LEFT
adb shell input keyevent 22   # DPAD_RIGHT
adb shell input keyevent 23   # DPAD_CENTER (Select)
adb shell input keyevent 4    # BACK
adb shell input keyevent 3    # HOME
adb logcat | grep tauri       # App logs
./scripts/screenshot.sh       # Screenshot + open
```

## Project Structure

```
src/
  App.tsx                # Navigation, pages, D-pad focus hook
  main.tsx               # React entry point
  index.css              # Tailwind v4 + focus ring styles
  lib/utils.ts           # cn() class merger
  components/ui/         # shadcn/ui components
src-tauri/
  tauri.conf.json        # Tauri app configuration
  src/lib.rs             # Rust entry point
  gen/android/           # Generated Android project
scripts/                 # Dev/emulator helper scripts
.pi/skills/              # Agent skills (emulator-loop)
__tests__/               # Vitest + Testing Library tests
```

## Troubleshooting

- **`pnpm tauri dev` fails with `pnpm install` error:** Delete `.modules.yaml` and reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
- **Gradle build fails with `tauri.settings.gradle` not found:** Run `./scripts/setup-android.sh`
- **Emulator not detected:** Start it first with `./scripts/emulator-start.sh`, wait for boot, then run dev
- **Rust deps downloading takes long:** First run fetches all crates — subsequent builds use cache
