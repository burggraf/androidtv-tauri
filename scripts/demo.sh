#!/usr/bin/env bash
# Full demo flow: start headed emulator → run Tauri Android dev
# Usage: ./scripts/demo.sh

set -e
cd "$(dirname "$0")/.."

echo "=== Step 1: Starting headed emulator ==="
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
AVD_NAME="Android_TV_API34"

"$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" -gpu host &
EMULATOR_PID=$!
echo "Emulator PID: $EMULATOR_PID"

echo "=== Step 2: Waiting for boot ==="
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator ready!"

echo "=== Step 3: Starting Tauri Android dev ==="
pnpm tauri android dev

# If dev exits, also stop emulator
kill $EMULATOR_PID 2>/dev/null || true
