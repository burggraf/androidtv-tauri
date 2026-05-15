#!/usr/bin/env bash
# Start Android TV emulator + dev server with hot reload
# Usage: ./scripts/emulator-app-start.sh [--headed]

set -e

AVD_NAME="Android_TV_API34"
SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
EMULATOR="$SDK_ROOT/emulator/emulator"

HEADED=false
case "$1" in
    --headed) HEADED=true ;;
esac

# Kill existing emulator if running
echo "Checking for running emulator..."
if adb devices 2>/dev/null | grep -q emulator-5554; then
    echo "Emulator already running. Restarting..."
    adb -s emulator-5554 emu kill 2>/dev/null || true
    sleep 2
fi
pkill -f "emulator.*$AVD_NAME" 2>/dev/null || true
sleep 2

# Start emulator
echo "Starting $AVD_NAME..."
if $HEADED; then
    "$EMULATOR" -avd "$AVD_NAME" -gpu host &
else
    "$EMULATOR" -avd "$AVD_NAME" -no-window -no-audio -gpu swiftshader_indirect &
fi
EMULATOR_PID=$!
echo "Emulator PID: $EMULATOR_PID"

# Wait for boot
echo "Waiting for emulator boot..."
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator ready!"

# Set up port forwarding for Vite HMR
echo "Setting up port forwarding..."
adb reverse --remove-all 2>/dev/null || true
adb reverse tcp:1420 tcp:1420
adb reverse tcp:1421 tcp:1421

# Run Tauri dev loop (starts Vite + builds + installs + launches + hot reload)
echo ""
echo "Starting dev server with hot reload..."
echo "   Save a file → app updates automatically"
echo "   Press Ctrl+C to stop everything"
echo ""

cd "$(dirname "$0")/.."
pnpm tauri android dev

# If dev loop exits, stop emulator too
echo ""
echo "Dev server stopped. Shutting down emulator..."
adb -s emulator-5554 emu kill 2>/dev/null || true
wait $EMULATOR_PID 2>/dev/null || true
