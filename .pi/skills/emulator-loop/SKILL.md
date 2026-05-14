# Emulator Loop — Android TV Local Emulator Dev Loop

Use this skill when working on the Android TV Tauri app with a local emulator. Provides fast visual feedback without needing a physical TV.

## Environment

- **Package:** `com.markb.tauri_app`
- **Main Activity:** `com.markb.tauri_app.MainActivity`
- **AVD Name:** `Android_TV_API34`
- **Framework:** Tauri v2 + React 19 + shadcn/ui
- **Package Manager:** pnpm v11
- **Min SDK:** 24, **Target SDK:** 36

## Prerequisites (One-Time)

```bash
pnpm install
pnpm tauri android init
./scripts/setup-android.sh    # creates empty tauri.settings.gradle + tauri.build.gradle.kts
```

If `pnpm install` fails with `ERR_PNPM_IGNORED_BUILDS`:
```bash
rm -rf node_modules pnpm-lock.yaml .modules.yaml && pnpm install
```

## Quick Commands

### Start Emulator (headless — for agent dev/test)
```bash
./scripts/emulator-start.sh
# Or directly:
~/Library/Android/sdk/emulator/emulator -avd Android_TV_API34 -no-window -no-audio -gpu swiftshader_indirect &
```

### Start Emulator (headed — for user demo)
```bash
./scripts/emulator-start.sh --headed
```

### Stop Emulator
```bash
./scripts/emulator-start.sh --stop
```

### Wait for Emulator Ready
```bash
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
```

### Dev Loop (Build + Install + Launch + Hot Reload)
```bash
# Preferred: uses tauri android dev (starts Vite, builds Rust, installs, hot reloads)
pnpm tauri android dev

# Or use the wrapper script:
./scripts/dev-loop.sh
```

### One-Shot Build (No Dev Server)
```bash
cd src-tauri/gen/android && ./gradlew assembleDebug && cd -
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
adb shell am start -n com.markb.tauri_app/.MainActivity
```

### Screenshot
```bash
./scripts/screenshot.sh
# Or:
adb exec-out screencap -p > screenshot.png && open screenshot.png
```

### D-Pad Navigation (Android TV Focus Control)
```bash
adb shell input keyevent 19   # DPAD_UP
adb shell input keyevent 20   # DPAD_DOWN
adb shell input keyevent 21   # DPAD_LEFT
adb shell input keyevent 22   # DPAD_RIGHT
adb shell input keyevent 23   # DPAD_CENTER (Select/OK)
adb shell input keyevent 4    # BACK
adb shell input keyevent 3    # HOME
```

### Verify Focus After Navigation
```bash
adb shell input keyevent 22   # move right
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml
grep -i "focus" /tmp/ui.xml
```

### Check Logs
```bash
adb logcat -d | grep -i "tauri\|com.markb.tauri_app" | tail -50
# Live tail:
adb logcat | grep -i "tauri\|com.markb.tauri_app"
```

### Force Stop
```bash
adb shell am force-stop com.markb.tauri_app
```

### Clear App Data
```bash
adb shell pm clear com.markb.tauri_app
```

### Scrcpy (Real-Time Visual Mirror)
```bash
scrcpy --always-on-top --window-title "androidtv-tauri-debug"
```
Run alongside pi terminal work. Pi handles adb/snapshots; you watch screen.

### UI Hierarchy (uiautomator)
```bash
adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml /tmp/ui.xml
cat /tmp/ui.xml | grep -i "focus\|button\|text"
```

## Workflow

1. **Start emulator:** `./scripts/emulator-start.sh` (headless) or `--headed` (demo)
2. **Dev loop:** `pnpm tauri android dev` — builds, installs, launches, hot reloads
3. **Screenshot:** `./scripts/screenshot.sh` — visual verification
4. **Navigate:** D-pad keyevents to test focus flow
5. **Logs:** `adb logcat | grep com.markb.tauri_app` — runtime errors

## Key Points for Android TV

- **Focus is everything.** On TV there is no touch. Every interactive element must handle focus state.
- D-pad navigation maps to arrow keys in the WebView.
- Back button maps to Escape key.
- Use `focusable` CSS class on interactive elements for visible focus ring (blue glow + scale).
- Test D-pad navigation in all 4 directions + center + back from every screen.
- Leanback launcher category is required for TV app discovery (already configured in AndroidManifest.xml).
- The `useDpadFocus(count)` hook in `src/App.tsx` handles ArrowLeft/Right + Enter for button rows.

## Agent Workflow (Headless + agent-device)

```bash
# 1. Boot headless
./scripts/emulator-start.sh &
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'

# 2. Build + install
cd src-tauri/gen/android && ./gradlew assembleDebug && cd -
adb install -r src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk
adb shell am start -n com.markb.tauri_app/.MainActivity

# 3. Snapshot UI tree
agent-device snapshot --platform android --target tv -i -c

# 4. Navigate D-pad
adb shell input keyevent 22  # right
agent-device snapshot --platform android --target tv -i -c  # verify focus

# 5. Screenshot
./scripts/screenshot.sh
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `tauri.settings.gradle` not found | Run `./scripts/setup-android.sh` |
| `pnpm install` fails | Delete `.modules.yaml` and reinstall |
| Emulator not detected | Wait for boot: `adb wait-for-device ...` |
| App crashes on launch | Check logs: `adb logcat | grep tauri` |
| Hot reload not working | Ensure Vite dev server is running on port 1420 |
