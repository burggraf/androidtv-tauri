#!/usr/bin/env bash
# Start Android TV emulator (headless or headed)
# Usage: ./scripts/emulator-start.sh [--headed] [--stop]

set -e

AVD_NAME="Android_TV_API34"
SDK_ROOT="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
EMULATOR="$SDK_ROOT/emulator/emulator"

stop_emulator() {
    echo "Stopping emulator..."
    adb -s emulator-5554 emu kill 2>/dev/null || true
    pkill -f "emulator.*$AVD_NAME" 2>/dev/null || true
    echo "Emulator stopped."
    exit 0
}

case "$1" in
    --stop)
        stop_emulator
        ;;
    --headed)
        echo "Starting $AVD_NAME (headed)..."
        "$EMULATOR" -avd "$AVD_NAME" -gpu host &
        EMULATOR_PID=$!
        echo "Emulator PID: $EMULATOR_PID"
        ;;
    *)
        echo "Starting $AVD_NAME (headless)..."
        "$EMULATOR" -avd "$AVD_NAME" -no-window -no-audio -gpu swiftshader_indirect &
        EMULATOR_PID=$!
        echo "Emulator PID: $EMULATOR_PID"
        ;;
esac

# Wait for boot
echo "Waiting for emulator boot..."
adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator ready!"

echo "Keep this terminal open. Press Ctrl+C to stop."
wait $EMULATOR_PID 2>/dev/null || true
