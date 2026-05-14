#!/usr/bin/env bash
# Take screenshot from Android TV emulator and open it
# Usage: ./scripts/screenshot.sh [filename.png]

FILENAME="${1:-screenshot-$(date +%Y%m%d-%H%M%S).png}"
adb exec-out screencap -p > "$FILENAME"
echo "Screenshot saved to $FILENAME"
open "$FILENAME"
