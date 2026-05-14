#!/usr/bin/env bash
# One-time setup after `pnpm install` and `pnpm tauri android init`
# Fixes missing generated Gradle files that Tauri CLI omits when no Android plugins exist

set -e
cd "$(dirname "$0")/.."

ANDROID_DIR="src-tauri/gen/android"

if [ ! -d "$ANDROID_DIR" ]; then
    echo "ERROR: Android project not initialized. Run: pnpm tauri android init"
    exit 1
fi

# Create empty tauri.settings.gradle if missing (Tauri CLI bug when no Android plugins)
if [ ! -f "$ANDROID_DIR/tauri.settings.gradle" ]; then
    echo "Creating $ANDROID_DIR/tauri.settings.gradle"
    touch "$ANDROID_DIR/tauri.settings.gradle"
fi

# Create empty tauri.build.gradle.kts if missing
if [ ! -f "$ANDROID_DIR/app/tauri.build.gradle.kts" ]; then
    echo "Creating $ANDROID_DIR/app/tauri.build.gradle.kts"
    touch "$ANDROID_DIR/app/tauri.build.gradle.kts"
fi

echo "Setup complete."
