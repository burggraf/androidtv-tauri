# Web Portal Plan — Playlist Account System

## Overview

Add a **web portal** (`web/` directory) alongside the existing Tauri Android TV app. Users create accounts, manage playlists, and the TV app syncs automatically via PocketBase.

---

## 1. Directory Structure

```
androidtv-tauri/
├── src/                  # Tauri Android TV app (existing)
├── src-tauri/            # Rust backend (existing)
├── web/                  # NEW: Web portal
│   ├── pocketbase/       # PocketBase binary + data
│   │   ├── pocketbase    # downloaded binary (v0.38.0 darwin_arm64)
│   │   ├── pb_data/      # auto-created on first run (gitignore)
│   │   └── pb_migrations/# JS migration files (commit to repo)
│   ├── src/
│   │   ├── components/   # shadcn/ui + custom
│   │   ├── hooks/        # auth, playlists
│   │   ├── lib/
│   │   │   └── pocketbase.ts  # PB client singleton
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── App.tsx       # Router + auth guard
│   │   ├── main.tsx      # Entry
│   │   └── index.css     # Tailwind 3
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   └── package.json
└── scripts/
    └── web-dev.sh        # Run PocketBase + Vite dev
```

---

## 2. PocketBase Schema (via JS Migration)

### Collections

#### `users` (built-in Auth collection)
Created automatically by PocketBase on first run.
- `email` (email, unique, required) — identity field
- `password` (password, required, min 8 chars)
- `emailVisibility` = true (default)
- `passwordAuth.enabled` = true, `identityFields` = ["email"]
- `authRule` = "" (anyone can auth)

#### `playlists` (Base collection — created via migration)

Migration file: `web/pocketbase/pb_migrations/<timestamp>_create_playlists.js`

```js
/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    type: "base",
    name: "playlists",
    listRule: "user = @request.auth.id",
    viewRule: "user = @request.auth.id",
    createRule: "user = @request.auth.id",
    updateRule: "user = @request.auth.id",
    deleteRule: "user = @request.auth.id",
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
        min: 1,
        max: 200,
      },
      {
        name: "url",
        type: "url",
        required: true,
      },
      {
        name: "type",
        type: "select",
        required: true,
        values: ["m3u", "xstream"],
        maxSelect: 1,
      },
      {
        name: "enabled",
        type: "bool",
        required: true,
      },
      {
        name: "user",
        type: "relation",
        required: true,
        maxSelect: 1,
        collectionId: app.findCollectionByNameOrId("users").id,
        cascadeDelete: true,
      },
    ],
    indexes: [
      "CREATE INDEX idx_playlists_user ON playlists (user)",
    ],
  });
  app.save(collection);
}, (app) => {
  // down: delete collection
  const collection = app.findCollectionByNameOrId("playlists");
  app.delete(collection);
});
```

**Key PB 0.38.0 patterns used:**
- `new Collection({ type, name, fields, listRule, ... })` — constructor pattern
- `app.findCollectionByNameOrId("users").id` — get users collection ID for relation
- `cascadeDelete: true` — delete playlists when user deleted
- Migration auto-runs on `pocketbase serve`
- `--automigrate` enabled by default (dashboard changes generate migrations)

---

## 3. Web Portal Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router v7 (client-side only) |
| Styling | Tailwind CSS v3 (PostCSS config) |
| UI Components | shadcn/ui |
| Backend | PocketBase 0.38.0 (self-hosted, standalone binary) |
| Auth | PocketBase email/password (`users` collection) |
| PB SDK | `pocketbase` npm package (official JS SDK) |
| Form | react-hook-form + zod |

---

## 4. Features — Phase 1 (MVP)

### 4.1 Auth Flow

```
/ → redirect to /login (if !pb.authStore.isValid)
/login → pb.collection('users').authWithPassword(email, password)
        → pb.authStore populated → redirect /dashboard
/signup → pb.collection('users').create({ email, password, passwordConfirm })
        → pb.authStore auto-populated → redirect /dashboard
```

**Auth persistence:** PB JS SDK auto-persists token in `localStorage`. On page load, `pb.authStore.isValid` checks existing token. Call `pb.collection('users').authRefresh()` on startup to validate/refresh.

**Logout:** `pb.authStore.clear()` — stateless JWTs, no server endpoint needed.

### 4.2 Playlist CRUD

**Dashboard layout:**
- Header with user email + logout button
- Main area: playlist cards/table
- "Add Playlist" button → dialog with form

**PlaylistForm fields:**
- Name (text, required, max 200)
- URL (url validation, required)
- Type (radio/toggle: M3U | XStream)
- Enabled (checkbox, default true)

**Operations (JS SDK):**
```ts
// List all playlists for current user (API rules enforce ownership)
const playlists = await pb.collection('playlists').getFullList({ sort: '-created' })

// Create
const playlist = await pb.collection('playlists').create({
  name: 'My IPTV',
  url: 'https://...',
  type: 'm3u',
  enabled: true,
  user: pb.authStore.record.id,  // relation field
})

// Update
await pb.collection('playlists').update(playlistId, { name: 'New Name' })

// Delete
await pb.collection('playlists').delete(playlistId)
```

**API rules enforce ownership:** `user = @request.auth.id` — users can only see/edit their own playlists.

---

## 5. Implementation Steps

### Step 1: PocketBase Setup
- Download v0.38.0 darwin_arm64 binary → `web/pocketbase/pocketbase`
- `chmod +x` the binary
- `pb_data/` auto-created on first run
- Create JS migration file for `playlists` collection in `pb_migrations/`
- Add `pb_data/` to `.gitignore`
- Commit `pb_migrations/` (safe to share, generates schema)

### Step 2: Web Project Scaffold
- `pnpm create vite web --template react-ts`
- Install deps:
  ```
  pnpm add react-router-dom pocketbase react-hook-form @hookform/resolvers zod lucide-react
  pnpm add -D tailwindcss@3 postcss autoprefixer
  ```
- Initialize shadcn/ui: `pnpm dlx shadcn@latest init` (Tailwind 3 config)
- Configure Vite proxy: `/api/*` → `http://127.0.0.1:8090`

### Step 3: PB Client Singleton + Auth Hook
- `web/src/lib/pocketbase.ts`:
  ```ts
  import PocketBase from 'pocketbase'
  export const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090')
  ```
- `web/src/hooks/useAuth.ts`:
  - `isAuthenticated`: `pb.authStore.isValid`
  - `user`: `pb.authStore.record`
  - `login(email, password)`: `pb.collection('users').authWithPassword(...)`
  - `signup(email, password)`: `pb.collection('users').create(...)`
  - `logout()`: `pb.authStore.clear()`
  - On mount: `pb.authStore.onChange()` to sync React state

### Step 4: Auth Pages
- `pages/LoginPage.tsx` — email + password form, error display
- `pages/SignupPage.tsx` — email + password + confirm password form
- `App.tsx` — BrowserRouter + ProtectedRoute wrapper
- Auto-refresh on startup: `pb.collection('users').authRefresh()` to validate stored token

### Step 5: Dashboard + Playlist CRUD
- `hooks/usePlaylists.ts` — SWR-style or plain React state for playlists
  - `fetchPlaylists()`: `pb.collection('playlists').getFullList()`
  - `createPlaylist(data)`: `pb.collection('playlists').create()`
  - `updatePlaylist(id, data)`: `pb.collection('playlists').update()`
  - `deletePlaylist(id)`: `pb.collection('playlists').delete()`
- `pages/DashboardPage.tsx` — playlist list + actions
- `components/PlaylistForm.tsx` — reusable create/edit form (react-hook-form + zod)
- `components/PlaylistCard.tsx` — individual playlist display with edit/delete
- `components/DeleteConfirmDialog.tsx` — shadcn AlertDialog

### Step 6: Polish
- Loading skeletons
- Error toast notifications (sonner or shadcn toast)
- Responsive layout (mobile-friendly)
- Dev scripts

---

## 6. Dev Scripts

**Root `package.json` additions:**
```json
"web:dev": "bash scripts/web-dev.sh",
"web:build": "cd web && pnpm build",
"pb:start": "cd web/pocketbase && ./pocketbase serve",
"pb:migrate": "cd web/pocketbase && ./pocketbase migrate up"
```

**`scripts/web-dev.sh`:**
```bash
#!/usr/bin/env bash
set -e

PB_DIR="$(cd "$(dirname "$0")/../web/pocketbase" && pwd)"
WEB_DIR="$(cd "$(dirname "$0")/../web" && pwd)"

# Start PocketBase
echo "📦 Starting PocketBase..."
"$PB_DIR/pocketbase" serve --dev &
PB_PID=$!

# Wait for PB to be ready
echo "⏳ Waiting for PocketBase..."
until curl -sf http://127.0.0.1:8090/api/health > /dev/null 2>&1; do
  sleep 0.5
done
echo "✅ PocketBase ready!"

# Start Vite dev server
echo "🚀 Starting Vite dev server..."
cd "$WEB_DIR" && pnpm dev

# Cleanup on exit
trap "kill $PB_PID 2>/dev/null" EXIT
wait
```

---

## 7. PB Migration Workflow

**Creating the initial migration:**
```bash
cd web/pocketbase
# First run creates pb_data and opens installer at http://127.0.0.1:8090
./pocketbase serve
# Create superuser via installer UI

# Then create migration manually:
./pocketbase migrate create "create_playlists_collection"
# Edit the generated file with collection schema

# Or use automigrate: create collection via Dashboard, PB auto-generates migration
```

**`migrate history-sync`** — clean up intermediate migrations during dev

---

## 8. .gitignore additions

```
# PocketBase
web/pocketbase/pb_data/
web/pocketbase/pocketbase   # binary, re-download
!web/pocketbase/pb_migrations/  # commit migrations
```

---

## 9. Key PB 0.38.0 Patterns Applied

| Pattern | Usage |
|---|---|
| JS migrations (`pb_migrations/*.js`) | Schema creation, version control |
| `new Collection({ ... })` + `app.save()` | Programmatic collection creation |
| `pb.authStore.isValid / token / record` | Auth state checks |
| `pb.authStore.onChange()` | React state sync on auth changes |
| `pb.authStore.clear()` | Logout (stateless, no endpoint) |
| `pb.collection('name').getFullList()` | Fetch all records |
| `pb.collection('name').create(data)` | Create record |
| `pb.collection('name').update(id, data)` | Update record |
| `pb.collection('name').delete(id)` | Delete record |
| API rules (`user = @request.auth.id`) | Data ownership enforcement |
| `cascadeDelete: true` on relations | Cleanup on user delete |
| `--automigrate` (default on) | Auto-generate migrations from dashboard |
| Vite SPA (recommended by PB docs) | Client-side only, no SSR |

---

## 10. Future Phases (Out of Scope for Now)

- **Phase 2:** Tauri app ↔ PocketBase sync (fetch playlists, auto-refresh)
- **Phase 3:** EPG source management
- **Phase 4:** Multi-device sync status dashboard
- **Phase 5:** Playlist import/export, favorites, channel groups
- **Phase 6:** Recording management, scheduling
