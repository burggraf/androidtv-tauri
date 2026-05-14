/**
 * Provider data packaging, compression, and upload module.
 *
 * Orchestrates the full sync lifecycle:
 * 1. Authenticate with provider
 * 2. Fetch all data (client-side, residential IP)
 * 3. Compute version hashes, compare with stored
 * 4. Package changed data (compress to gzip)
 * 5. Upload to PocketBase file storage
 * 6. Update metadata (version hashes, counts, last_sync_at)
 * 7. Cleanup orphaned category_prefs
 */

import { gzip } from 'fflate'
import { pb } from './pocketbase'
import {
  cleanupOrphanedCategoryPrefs,
} from './preferences'
import {
  xstreamEnrich,
  xstreamGetAllData,
  type XstreamCategory,
  type XstreamFetchProgress,
  type XstreamFullData,
  type XstreamLiveStream,
  type XstreamSeriesStream,
  type XstreamVodStream,
} from './xstream'

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------

async function compressJson(data: unknown): Promise<Blob> {
  const json = JSON.stringify(data)
  const encoded = new TextEncoder().encode(json)
  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    gzip(encoded, {}, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
  return new Blob([compressed], { type: 'application/gzip' })
}

// ---------------------------------------------------------------------------
// Version Hash
// ---------------------------------------------------------------------------

export async function computeVersionHash(
  categories: Pick<XstreamCategory, 'category_id' | 'category_name'>[],
  streams: { stream_id?: number; series_id?: number; name?: string; category_id?: string }[],
): Promise<string> {
  // Sort for order-independent hashing (provider API may return data in different orders)
  const sortedCats = [...categories].sort((a, b) => String(a.category_id).localeCompare(String(b.category_id)))
  const sortedStreams = [...streams].sort((a, b) => {
    const aid = a.stream_id ?? a.series_id ?? 0
    const bid = b.stream_id ?? b.series_id ?? 0
    return aid - bid
  })

  const catFingerprint = sortedCats
    .map((c) => `${c.category_id}:${c.category_name}`)
    .join('|')

  const streamFingerprint = sortedStreams
    .map((s) => `${s.stream_id ?? s.series_id}:${s.name ?? ''}:${s.category_id ?? ''}`)
    .join('|')

  const fingerprint = JSON.stringify({
    cat_count: categories.length,
    stream_count: streams.length,
    cat_fingerprint: catFingerprint,
    stream_fingerprint: streamFingerprint,
  })

  const encoded = new TextEncoder().encode(fingerprint)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Package Data
// ---------------------------------------------------------------------------

export interface PackagedData {
  blob: Blob
  version: string
  count: number
}

export async function packageData(
  type: 'live' | 'vod' | 'series',
  categories: XstreamCategory[],
  streams: XstreamLiveStream[] | XstreamVodStream[] | XstreamSeriesStream[],
): Promise<PackagedData> {
  const version = await computeVersionHash(categories, streams)

  const payload = {
    version,
    fetched_at: new Date().toISOString(),
    type,
    categories,
    streams,
  }

  const blob = await compressJson(payload)

  return {
    blob,
    version,
    count: streams.length,
  }
}

// ---------------------------------------------------------------------------
// Sync Status Types
// ---------------------------------------------------------------------------

export interface SyncProgress {
  step:
    | 'auth'
    | 'fetching_categories'
    | 'fetching_live'
    | 'fetching_vod'
    | 'fetching_series'
    | 'packaging'
    | 'uploading'
    | 'updating_metadata'
    | 'cleanup'
    | 'done'
    | 'error'
  progress: number // 0-1
  message: string
  error?: string
}

export interface SyncResult {
  success: boolean
  playlistId: string
  liveChanged: boolean
  vodChanged: boolean
  seriesChanged: boolean
  channelsCount: number
  moviesCount: number
  seriesCount: number
  error?: string
}

// ---------------------------------------------------------------------------
// Provider Record Type
// ---------------------------------------------------------------------------

interface ProviderRecord {
  id: string
  name: string
  url: string
  username: string
  password: string
  user: string
  live_data?: string
  vod_data?: string
  series_data?: string
  live_version?: string
  vod_version?: string
  series_version?: string
  channels_count?: number
  movies_count?: number
  series_count?: number
  last_sync_at?: string
  last_sync_status?: string
  last_sync_error?: string
}

// ---------------------------------------------------------------------------
// Sync Orchestrator
// ---------------------------------------------------------------------------

export async function syncProvider(
  playlistId: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  const progress = (
    step: SyncProgress['step'],
    progressValue: number,
    message: string,
  ) => {
    onProgress?.({ step, progress: progressValue, message })
  }

  try {
    // --- Step 1: Verify ownership then fetch provider record ---
    progress('auth', 0.02, 'Loading provider record...')

    const currentUserId = pb.authStore.model?.id
    if (!currentUserId) {
      throw new Error('You must be logged in to sync providers.')
    }

    const providerRecord = await pb.collection('playlists').getOne<ProviderRecord>(playlistId)
    if (providerRecord.user !== currentUserId) {
      throw new Error('You do not have permission to sync this provider.')
    }

    const { url, username, password } = providerRecord

    // --- Step 2: Authenticate & enrich ---
    progress('auth', 0.05, 'Authenticating with provider...')

    let enrichment: Awaited<ReturnType<typeof xstreamEnrich>>
    try {
      enrichment = await xstreamEnrich(url, username, password)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      progress('error', 0, 'Authentication failed', message)
      throw new Error(`Authentication failed: ${message}`)
    }

    // --- Step 3: Fetch all data ---
    progress('fetching_categories', 0.08, 'Fetching categories...')

    let fetchedData: XstreamFullData

    try {
      fetchedData = await xstreamGetAllData(
        url,
        username,
        password,
        3, // maxConnections
        (xp: XstreamFetchProgress) => {
          // Map xstream progress to sync progress
          // xstream: categories(0-1), live(0-1), vod(0-1), series(0-1), done(1)
          // sync: fetching_categories(0.08-0.15), fetching_live(0.15-0.35),
          //       fetching_vod(0.35-0.55), fetching_series(0.55-0.75)
          const mapping: Record<string, { step: SyncProgress['step']; base: number; span: number }> =
            {
              categories: { step: 'fetching_categories', base: 0.08, span: 0.07 },
              live: { step: 'fetching_live', base: 0.15, span: 0.2 },
              vod: { step: 'fetching_vod', base: 0.35, span: 0.2 },
              series: { step: 'fetching_series', base: 0.55, span: 0.2 },
              done: { step: 'fetching_series', base: 0.75, span: 0 },
            }
          const m = mapping[xp.step]
          if (m) {
            progress(
              m.step,
              m.base + xp.progress * m.span,
              `Fetching ${xp.step}... (${Math.round(xp.progress * 100)}%)`,
            )
          }
        },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      progress('error', 0, 'Data fetch failed', message)
      throw new Error(`Failed to fetch provider data: ${message}`)
    }

    // --- Step 4: Version check + packaging ---
    progress('packaging', 0.76, 'Checking for changes...')

    // Determine which types changed
    const types = ['live', 'vod', 'series'] as const
    const packaged: Record<string, PackagedData | null> = {
      live: null,
      vod: null,
      series: null,
    }
    const changed: Record<string, boolean> = {
      live: false,
      vod: false,
      series: false,
    }

    for (const t of types) {
      const cats = fetchedData[t].categories
      const streams = fetchedData[t].streams

      // Warn but don't overwrite if data is empty and existing data exists
      const existingVersion = providerRecord[`${t}_version`]
      if (streams.length === 0 && cats.length === 0) {
        if (existingVersion) {
          console.warn(
            `[sync] ${t}: provider returned empty data, skipping to preserve existing data`,
          )
          continue
        }
      }

      const version = await computeVersionHash(cats, streams)
      const storedVersion = providerRecord[`${t}_version`]

      if (version !== storedVersion) {
        progress('packaging', 0.77 + types.indexOf(t) * 0.04, `Packaging ${t} data...`)
        packaged[t] = await packageData(t, cats, streams)
        changed[t] = true
      }
    }

    const liveChanged = changed.live
    const vodChanged = changed.vod
    const seriesChanged = changed.series

    // If nothing changed, we're done
    if (!liveChanged && !vodChanged && !seriesChanged) {
      progress('done', 1, 'No changes detected. Provider data is up to date.')
      return {
        success: true,
        playlistId,
        liveChanged: false,
        vodChanged: false,
        seriesChanged: false,
        channelsCount: providerRecord.channels_count ?? 0,
        moviesCount: providerRecord.movies_count ?? 0,
        seriesCount: providerRecord.series_count ?? 0,
      }
    }

    // --- Step 5: Upload changed files ---
    progress('uploading', 0.85, 'Uploading changed data...')

    for (const t of types) {
      if (!changed[t] || !packaged[t]) continue

      const fieldName = `${t}_data` as 'live_data' | 'vod_data' | 'series_data'
      const fileName = `${t}_data.json.gz`

      progress(
        'uploading',
        0.85 + types.indexOf(t) * 0.04,
        `Uploading ${t} data...`,
      )

      try {
        const form = new FormData()
        form.append(fieldName, packaged[t]!.blob, fileName)
        await pb.collection('playlists').update(playlistId, form)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        progress('error', 0, `Upload failed for ${t}`, message)
        throw new Error(`Failed to upload ${t} data: ${message}`)
      }
    }

    // --- Step 6: Update metadata ---
    progress('updating_metadata', 0.95, 'Updating metadata...')

    // Build update with enrichment metadata, version hashes, and counts
    const metadataUpdate: Record<string, unknown> = {
      last_sync_at: new Date().toISOString(),
      last_sync_status: 'success',
      last_sync_error: null,
      expires: enrichment.expires,
      max_connections: enrichment.max_streams,
      active_connections: enrichment.current_streams,
      status: enrichment.channels != null ? 'Active' : 'Unknown',
    }

    if (liveChanged && packaged.live) {
      metadataUpdate.live_version = packaged.live.version
      metadataUpdate.channels_count = packaged.live.count
    }
    if (vodChanged && packaged.vod) {
      metadataUpdate.vod_version = packaged.vod.version
      metadataUpdate.movies_count = packaged.vod.count
    }
    if (seriesChanged && packaged.series) {
      metadataUpdate.series_version = packaged.series.version
      metadataUpdate.series_count = packaged.series.count
    }

    let metadataRetries = 2
    while (metadataRetries > 0) {
      try {
        const metaForm = new FormData()
        for (const [key, value] of Object.entries(metadataUpdate)) {
          if (value !== null) {
            metaForm.append(key, String(value))
          } else {
            metaForm.append(key, '')
          }
        }
        await pb.collection('playlists').update(playlistId, metaForm)
        break
      } catch (err) {
        metadataRetries--
        if (metadataRetries === 0) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[sync] Metadata update failed after retries, data uploaded but versions stale:', message)
        } else {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }

    // --- Step 7: Cleanup orphaned category_prefs ---
    progress('cleanup', 0.98, 'Cleaning up orphaned preferences...')

    for (const t of types) {
      if (!changed[t]) continue

      const validIds = new Set(fetchedData[t].categories.map((c) => c.category_id))
      try {
        const cleaned = await cleanupOrphanedCategoryPrefs(playlistId, validIds, t)
        if (cleaned > 0) {
          console.log(`[sync] Removed ${cleaned} orphaned category_prefs for ${t}`)
        }
      } catch (err) {
        // Non-fatal: orphaned prefs will be cleaned on next sync
        console.warn('[sync] Failed to cleanup orphaned category_prefs:', err)
      }
    }

    progress('done', 1, 'Sync complete!')

    return {
      success: true,
      playlistId,
      liveChanged,
      vodChanged,
      seriesChanged,
      channelsCount: packaged.live?.count ?? providerRecord.channels_count ?? 0,
      moviesCount: packaged.vod?.count ?? providerRecord.movies_count ?? 0,
      seriesCount: packaged.series?.count ?? providerRecord.series_count ?? 0,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    progress('error', 0, 'Sync failed', message)

    // Mark error status on provider
    try {
      await pb.collection('playlists').update(playlistId, {
        last_sync_status: 'error',
        last_sync_error: message,
        last_sync_at: new Date().toISOString(),
      })
    } catch {
      // Best effort — don't throw on top of the original error
    }

    return {
      success: false,
      playlistId,
      liveChanged: false,
      vodChanged: false,
      seriesChanged: false,
      channelsCount: 0,
      moviesCount: 0,
      seriesCount: 0,
      error: message,
    }
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export async function getProviderSyncStatus(playlistId: string): Promise<{
  lastSyncAt: string | null
  status: string
  error: string | null
  liveVersion: string | null
  vodVersion: string | null
  seriesVersion: string | null
}> {
  const record = await pb.collection('playlists').getOne<{
    last_sync_at?: string
    last_sync_status?: string
    last_sync_error?: string
    live_version?: string
    vod_version?: string
    series_version?: string
  }>(playlistId)

  return {
    lastSyncAt: record.last_sync_at ?? null,
    status: record.last_sync_status ?? 'idle',
    error: record.last_sync_error ?? null,
    liveVersion: record.live_version ?? null,
    vodVersion: record.vod_version ?? null,
    seriesVersion: record.series_version ?? null,
  }
}

const DEFAULT_SYNC_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6 hours

export async function needsSync(
  playlistId: string,
  lastSyncThresholdMs: number = DEFAULT_SYNC_THRESHOLD_MS,
): Promise<boolean> {
  const record = await pb.collection('playlists').getOne<{
    last_sync_at?: string
  }>(playlistId)

  if (!record.last_sync_at) return true

  const lastSync = new Date(record.last_sync_at).getTime()
  const now = Date.now()

  return now - lastSync > lastSyncThresholdMs
}
