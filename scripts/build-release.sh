#!/usr/bin/env bash
# Build Tauri Android APK for release (no dev server needed)
# Usage: ./scripts/build-release.sh
# Output: src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk

set -e
cd "$(dirname "$0")/.."

echo "=== Building Tauri Android release APK ==="
pnpm tauri android build

echo "=== Build complete ==="
find src-tauri/gen/android/app/build/outputs/apk -name "*.apk" 2>/dev/null
