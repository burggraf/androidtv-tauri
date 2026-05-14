#!/usr/bin/env bash
# Build release APK for Fire TV Stick 4K Max (armv7), sign, and upload to website
# Usage: ./scripts/upload-firestick.sh
# Download on Firestick via: http://zzzx.uk/downloads/tauri-app-firestick-latest.apk

set -e
cd "$(dirname "$0")/.."

echo "=== Building Fire TV Stick release APK ==="
pnpm tauri android build --target armv7 --apk 2>&1

APK_SRC="src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk"
APK_SIGNED="dist/tauri-app-firestick-latest.apk"

echo ""
echo "=== Signing APK ==="
~/Library/Android/sdk/build-tools/36.1.0/zipalign -f -p 4 "$APK_SRC" /tmp/tauri-aligned.apk 2>&1

~/Library/Android/sdk/build-tools/36.1.0/apksigner sign \
  --ks ~/.android/debug.keystore \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$APK_SIGNED" \
  /tmp/tauri-aligned.apk 2>&1

echo ""
echo "=== Verifying signed APK ==="
~/Library/Android/sdk/build-tools/36.1.0/apksigner verify "$APK_SIGNED" 2>&1

echo ""
echo "=== Uploading to zzzx.uk ==="
scp "$APK_SIGNED" root@zzzx.uk:/var/www/zzzx.uk/downloads/tauri-app-firestick-latest.apk

echo ""
echo "=== Done ==="
echo "Download URL: http://zzzx.uk/downloads/tauri-app-firestick-latest.apk"
echo ""
echo "On Firestick, open Downloader app and enter:"
echo "  zzzx.uk/downloads/tauri-app-firestick-latest.apk"
