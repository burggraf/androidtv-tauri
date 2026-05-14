# Provider Data & Sync Architecture Plan

## Problem

- Providers have 50K+ channels, 30K+ movies, 10K+ series
- Data changes regularly (streams added/removed, categories shift)
- Providers block datacenter/residential proxies — fetches MUST use client's residential IP
- Users need favorites, category show/hide, category ordering, display preferences
- Preferences sync across clients (one-way: server → client, with client actions pushing back)
- Must scale to 10K → 100K+ users

## Architecture Summary

| Layer | What | Where | Why |
|---|---|---|---|
| Bulk provider data | Categories + streams (JSON.gz) | PocketBase file storage | Native, compressed, CDN-ready, shared across users |
| Provider metadata | URLs, credentials, version hashes, counts | PocketBase DB columns | Queryable, indexed, tiny |
| User preferences | Favorites, category prefs, display settings | PocketBase DB collections | Per-user, small, transactional, real-time |

## PocketBase Schema

### New Collections

```
providers
---------
name (text, required)
base_url (text, required)
username (text, required)
password (text, required)
owner (relation → users, required)

# Bulk data (file fields)
live_data (file, single, max 10MB)
vod_data (file, single, max 10MB)
series_data (file, single, max 10MB)

# Version tracking (for sync detection)
live_version (text, nullable)     # SHA256 hash of fetched data
vod_version (text, nullable)
series_version (text, nullable)

# Counts from last successful sync
channels_count (number)
movies_count (number)
series_count (number)

# Sync status
last_sync_at (date, nullable)
last_sync_status (select: idle/syncing/success/error)
last_sync_error (text, nullable)

# Metadata from auth response
status (text)             # Active/Expired/etc
expires (date, nullable)
max_connections (number)
active_connections (number)
allowed_formats (json)    # ["m3u8", "ts"]

# Timestamps
created (date, autodate)
updated (date, autodate)
```

```
favorites
---------
user (relation → users, required)
provider (relation → providers, required)
stream_id (text, required)     # provider's stream_id
type (select: live/vod/series, required)
name (text, nullable)          # cached name for display without joining provider data
thumbnail (text, nullable)     # cached thumb URL
created (date, autodate)
updated (date, autodate)

unique index: [user, provider, stream_id, type]
```

```
category_prefs
--------------
user (relation → users, required)
provider (relation → providers, required)
type (select: live/vod/series, required)
category_id (text, required)   # provider's category_id
hidden (bool, default: false)
sort_order (number, default: 0)
created (date, autodate)
updated (date, autodate)

unique index: [user, provider, type, category_id]
```

```
display_prefs
-------------
user (relation → users, required)
provider (relation → providers, required)
settings (json, default: {})
created (date, autodate)
updated (date, autodate)

unique index: [user, provider]
```

settings JSON shape:
```json
{
  "view_mode": "grid",           // grid | list
  "default_view": "live",        // live | vod | series
  "show_unavailable": false,     // show/hide expired streams
  "parental_pin": "",            // optional PIN for restricted categories
  "epg_enabled": true,           // show EPG data
  "logo_fallback": "default",    // icon style when no logo
  "stream_format": "auto"        // auto | ts | m3u8
}
```

### Existing Collections (Modified)

```
playlists (existing — M3U-only playlists)
-----------------------------------------
Keep as-is for M3U-only users. These are a separate content type
from Xtream providers. No changes needed.
```

## File Storage Format

Each file field stores a gzipped JSON file:

```json
{
  "version": "a1b2c3d4...",
  "fetched_at": "2026-05-14T10:30:00Z",
  "categories": [
    { "category_id": "1", "category_name": "Sports", "parent_id": 0 }
  ],
  "streams": [
    {
      "stream_id": "12345",
      "name": "ESPN HD",
      "category_id": "1",
      "stream_type": "live",
      "stream_icon": "https://...",
      "epg_channel_id": "espn.us",
      "added": "1700000000",
      "is_adult": "0",
      "tv_archive": 0,
      "direct_source": "",
      "tv_archive_duration": 0
    }
  ]
}
```

Same structure for `vod_data` and `series_data`. Series streams include additional fields like `cover`, `plot`, `cast`, `director`, `genre`, `releaseDate`, `rating`, `episode_run_time`.

### Compression

- Gzip via `fflate` (tiny, 3KB, pure JS, no WASM) or `pako`
- Expected compression: 70-90% on repetitive JSON
- 50K live streams ≈ 4-6 MB uncompressed → 400KB-800KB compressed
- Total per provider (3 files): ~1-2 MB compressed
- Upload time on residential broadband: 5-15 seconds

## Implementation Phases

### Phase 1: Schema & Migrations

1. Create migration for `providers` collection with all fields
2. Create migration for `favorites` collection
3. Create migration for `category_prefs` collection
4. Create migration for `display_prefs` collection
5. Add PB storage rules (owner can read/write own providers, etc.)

### Phase 2: Xtream Client Enhancements (`web/src/lib/xstream.ts`)

Add methods to fetch full dataset:

```ts
// Already exists: xstreamAuthenticate(), xstreamEnrich()

// New methods:
xstreamGetLiveCategories(url, user, pass)      // → array
xstreamGetLiveStreams(url, user, pass, catId?) // → array (optional cat filter)
xstreamGetVodCategories(url, user, pass)       // → array
xstreamGetVodStreams(url, user, pass, catId?)  // → array
xstreamGetSeriesCategories(url, user, pass)    // → array
xstreamGetSeries(url, user, pass, catId?)      // → array
xstreamGetAllData(url, user, pass)             // orchestrator — fetches all 7
```

`xstreamGetAllData` implements:
- Fetch categories first (all 3 types in parallel)
- Fetch ALL streams per type (no category filter — get full dataset)
- Handle pagination if provider supports it (some limit to 10K per request)
- Return structured object: `{ live: { categories, streams }, vod: {...}, series: {...} }`
- Built-in rate limiting (respect max_connections)
- Progress callbacks for UI feedback

### Phase 3: Data Packaging & Upload (`web/src/lib/sync.ts`)

New module:

```ts
// Package a data type (live/vod/series) into compressed JSON
packageData(type: 'live'|'vod'|'series', categories, streams): { blob, version, count }

// Upload packaged data to provider record
uploadProviderData(providerId, { live, vod, series }): Promise

// Full sync orchestrator
syncProvider(providerId): { progress, result }
// 1. Authenticate
// 2. Fetch all data (client-side, residential IP)
// 3. Compute version hashes
// 4. Compare with stored versions — skip unchanged types
// 5. Package changed types (compress)
// 6. Upload to PB file storage
// 7. Update metadata (version hashes, counts, last_sync_at)
// 8. Cleanup: prune orphaned category_prefs for deleted categories
```

### Phase 4: Sync UI (`web/src/components/`)

- Provider creation form: URL + username + password → authenticate → enrich → create
- Sync status indicator on provider card (idle/syncing/success/error with progress bar)
- Manual "Refresh" button with progress feedback
- Last synced timestamp display
- Error display with retry option
- Background sync with toast notifications

### Phase 5: Client-Side Data Loading (TV App — `src/`)

New modules:

```ts
// src/lib/provider-sync.ts
loadProviderData(providerId)       // Check versions, download if changed
getProviderCategories(type)        // Filter by user's category_prefs
getProviderStreams(type, catId?)   // Filter hidden cats, mark favorites
getFavorites(providerId, type)     // Merge with stream data
getDisplayPrefs(providerId)        // Apply view mode, etc.

// Local caching strategy:
// - TV app: localStorage for metadata, IndexedDB for provider JSON blobs
// - Web portal: already has data in memory from PB SDK
// - Cache invalidation: version hash mismatch → re-download
```

Flow on TV app startup:
1. Fetch user's providers list (metadata only — lightweight)
2. For each provider, compare stored version hashes vs server
3. Download only changed files (via PB file URL)
4. Decompress, parse, cache in IndexedDB
5. Fetch favorites, category_prefs, display_prefs (small, always fresh)
6. Merge: apply hidden categories, mark favorites, apply sort order
7. Render UI

### Phase 6: User Preferences Management

```ts
// web/src/lib/preferences.ts
addFavorite(userId, providerId, streamId, type, name, thumbnail)
removeFavorite(userId, providerId, streamId, type)
getFavorites(userId, providerId, type?)
toggleCategoryHidden(userId, providerId, type, categoryId)
reorderCategories(userId, providerId, type, categoryIds[])
updateDisplayPrefs(userId, providerId, settings)

// Each function:
// 1. Optimistic UI update (update local state immediately)
// 2. Submit to PB server
// 3. On success: confirm with server response
// 4. On failure: rollback optimistic update, show error
```

### Phase 7: Orphaned Data Cleanup

When provider data changes (categories deleted, streams removed):

**On client sync:**
- Load new provider data
- Load user's category_prefs
- Filter out prefs for category_ids no longer in provider data
- Mark favorites for deleted streams as "unavailable" in UI

**On server (background job / manual trigger):**
- For each provider with new sync:
  - Get all category_prefs referencing this provider
  - Delete prefs where category_id not in new category list
  - Optionally: notify user of removed favorites

**Periodic cleanup (cron / manual):**
- Scan favorites table for stream_ids no longer in any provider's data
- Batch-delete orphans

### Phase 8: Scale Preparation

When approaching 10K+ users:

1. **PB → PostgreSQL migration** — PB supports Postgres backend. SQLite single-writer bottleneck at scale.

2. **CDN for file downloads** — Cloudflare/R2 in front of PB file URLs. Provider JSON rarely changes, long cache TTL.

3. **Separate sync worker** — Move sync logic to background worker (Tauri background process / separate service) so it doesn't block UI.

4. **Incremental sync** (optional) — If 2MB downloads become problematic on slow connections:
   - Store per-category hashes
   - Only download changed categories
   - Merge on client

5. **File storage migration** — If PB storage limits hit:
   - Upload to Cloudflare R2 / S3
   - Store download URL in provider record
   - Same client flow, different URL source

## Sync Triggers

| Trigger | Scope | Timing |
|---|---|---|
| User adds provider | Full sync | Immediate |
| User clicks "Refresh" | Full sync | On demand |
| App startup (client) | Version check → partial sync if changed | On demand |
| Periodic background | Version check → partial sync if changed | Every 6h (live), 24h (VOD/series) |
| Provider expired | Block sync, show error | On next sync attempt |

## Version Hash Logic

```ts
function computeVersion(categories: any[], streams: any[]): string {
  // Hash based on data content, not timestamp
  // Same data = same hash, even if fetched at different times
  const data = JSON.stringify({
    cat_count: categories.length,
    stream_count: streams.length,
    // For efficiency, hash a fingerprint rather than full data
    cat_fingerprint: sha256(categories.map(c => c.category_id + c.category_name).join('|')),
    stream_fingerprint: sha256(streams.map(s => s.stream_id + s.name).join('|')),
  })
  return sha256(data)
}

// Sync decision:
if (computedVersion !== provider.live_version) {
  // Provider data changed — download full dataset
}
```

## Error Handling

| Error | Recovery |
|---|---|
| Provider unreachable | Retry with exponential backoff (1m, 5m, 15m, 1h). Show error UI. |
| Auth failure (credentials expired) | Mark provider as error. Notify user to re-enter credentials. |
| Upload timeout | Resume from last successful file. Re-upload remaining. |
| Client disconnects mid-upload | Next sync restarts — version unchanged, re-fetch + re-upload. |
| PB storage full | Alert user. Suggest cleanup or plan migration. |
| Provider returns empty data | Warn but don't overwrite existing good data. Log error. |

## Rate Limiting & Connection Respect

```ts
// From auth response: user_info.max_connections
// Never exceed this. If max_connections = 1, fetch sequentially.
// If max_connections = 3, fetch up to 3 in parallel.

class RateLimitedFetcher {
  maxConcurrent: number
  activeConnections = 0

  async fetch(url: string): Promise<Response> {
    while (this.activeConnections >= this.maxConcurrent) {
      await sleep(500)  // backoff
    }
    this.activeConnections++
    try {
      return await fetch(url)
    } finally {
      this.activeConnections--
    }
  }
}
```

## Data Flow Diagrams

### Provider Creation + Initial Sync

```
User fills form (URL, user, pass)
  → xstreamAuthenticate() [client → provider, residential IP]
  → Auth success → create provider record in PB (metadata only, no data files)
  → syncProvider() [client → provider, residential IP]
    → Fetch all categories + streams
    → Package + compress
    → Upload to PB file storage (provider.live_data, etc.)
    → Update version hashes + counts + last_sync_at
  → Initial category_prefs created (all visible, default sort order)
  → UI shows success
```

### Client Startup Sync (TV App)

```
TV app starts
  → Fetch user's providers (metadata only)
  → For each provider:
    → Compare local version hashes vs server version hashes
    → If changed:
      → Download file URL from PB
      → Decompress + parse
      → Cache in IndexedDB
      → Update local version hash
    → If unchanged:
      → Use cached data
  → Fetch favorites + category_prefs + display_prefs (always fresh)
  → Merge: filter hidden cats, mark favorites, apply sort
  → Render UI
```

### User Adds Favorite (TV → Server)

```
User presses "favorite" on channel
  → Optimistic update: add to local favorites state
  → POST to PB: favorites.create({ user, provider, stream_id, type, name, thumbnail })
  → On success:
    → Confirm with server response
    → Toast: "Added to favorites"
  → On failure:
    → Rollback optimistic update
    → Toast: "Failed to add favorite. Retry?"
```

### Provider Data Update (Category Deleted by Provider)

```
Provider sync detects category "X" no longer exists
  → New provider data uploaded (live_version changes)
  → Client syncs, downloads new data
  → Client loads category_prefs for this provider
  → Client filters: remove prefs for category "X" (orphaned)
  → UI no longer shows category "X"
  → Client sends cleanup request to server:
    → PB: category_prefs.delete({ user, provider, type, category_id: "X" })
  → Favorites referencing streams in category "X":
    → Marked as "unavailable" in UI (grayed out, can't play)
    → Periodic server cleanup removes orphaned favorites
```

## Migration Strategy

### Step 1: Add Collections (Backward Compatible)
- New collections don't affect existing playlists collection
- Existing M3U playlist users unaffected
- New provider type added alongside existing playlist type

### Step 2: Migrate Existing Data
- No migration needed for existing playlists — they're a separate content type
- Users add Xtream providers going forward

### Step 3: Gradual Rollout
- Phase 1-4: Web portal (add providers, sync, manage)
- Phase 5-6: TV app (consume data, preferences)
- Phase 7: Cleanup + edge cases
- Phase 8: Scale preparation

## Storage Estimates

### Per Provider (after compression)
- Live data: 400KB - 1MB
- VOD data: 200KB - 600KB
- Series data: 100KB - 300KB
- **Total: ~700KB - 2MB per provider**

### Per User
- Favorites: ~100 rows × ~200 bytes = 20KB
- Category prefs: ~200 rows × ~150 bytes = 30KB
- Display prefs: 1 row × ~500 bytes = 500 bytes
- **Total: ~50KB per user**

### At Scale (100K users, 100 providers)
- Provider data: 100 × 2MB = 200MB (one copy, shared)
- User preferences: 100K × 50KB = 5GB
- PB storage: well within limits
- Postgres at scale: handles billions of rows with proper indexes
