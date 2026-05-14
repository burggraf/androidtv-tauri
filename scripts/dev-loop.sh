#!/usr/bin/env bash
# Tauri Android dev — starts dev server + builds/installs/launches on emulator
# Usage: ./scripts/dev-loop.sh
#
# Prerequisites: emulator must be running (use ./scripts/emulator-start.sh)
#
# This runs `pnpm tauri android dev` which:
#   1. Starts the Vite dev server
#   2. Builds the Rust/Android project
#   3. Installs the APK on the connected device/emulator
#   4. Launches the app
#   5. Watches for changes (hot reload)

set -e
cd "$(dirname "$0")/.."

echo "=== Tauri Android Dev ==="
echo "Emulator must already be running."
echo ""
pnpm tauri android dev
