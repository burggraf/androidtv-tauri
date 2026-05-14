#!/usr/bin/env bash
set -e

PB_DIR="$(cd "$(dirname "$0")/../web/pocketbase" && pwd)"
WEB_DIR="$(cd "$(dirname "$0")/../web" && pwd)"

cleanup() {
  echo ""
  echo "🛑 Stopping PocketBase..."
  kill "$PB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

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

# Start Vite dev server
echo "🚀 Starting Vite dev server..."
cd "$WEB_DIR" && npx vite
