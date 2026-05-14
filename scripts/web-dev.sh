#!/usr/bin/env bash
set -e

PB_DIR="$(cd "$(dirname "$0")/../web/pocketbase" && pwd)"
WEB_DIR="$(cd "$(dirname "$0")/../web" && pwd)"

cleanup() {
  echo ""
  if [ -n "${PB_PID:-}" ]; then
    echo "🛑 Stopping PocketBase..."
    kill "$PB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Check if PocketBase is already running on port 8090
if curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; then
  echo "✅ PocketBase already running at http://127.0.0.1:8090"
else
  # Start PocketBase
  echo "📦 Starting PocketBase..."
  "$PB_DIR/pocketbase" serve --dev &
  PB_PID=$!

  # Wait for PB to be ready
  echo "⏳ Waiting for PocketBase..."
  until curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; do
    sleep 0.5
  done
  echo "✅ PocketBase ready at http://127.0.0.1:8090"
fi

# Start Vite dev server
echo "🚀 Starting Vite dev server..."
cd "$WEB_DIR" && npx vite
