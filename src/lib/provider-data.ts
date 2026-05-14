/**
 * Provider data loading module for the TV app.
 *
 * Responsibilities:
 * 1. Fetch provider metadata from PocketBase
 * 2. Download gzipped JSON data files (live/vod/series)
 * 3. Decompress and cache in IndexedDB
 * 4. Merge with user preferences (favorites, hidden categories, sort order)
 * 5. Provide clean API for TV UI components
 */

import { gunzipSync } from 'fflate'

/** Escape value for PB filter string interpolation */
function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}
import { pb } from './pb-client'
import {
  type CategoryPrefRecord,
  type DisplayPrefRecord,
  type FavoriteRecord,
} from '../../web/src/lib/preferences'

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ProviderDataFile {
  version: string
  fetched_at: string
  categories: ProviderCategory[]
  streams: ProviderStream[]
}

export interface ProviderCategory {
  category_id: string
  category_name: string
  parent_id?: number
}

export interface ProviderStream {
  stream_id?: number
  series_id?: number
  name: string
  category_id: string
  stream_type?: string
  stream_icon?: string
  epg_channel_id?: string
  added?: string
  is_adult?: string
  tv_archive?: number
  tv_archive_duration?: number
  // VOD-specific
  rating?: string
  container_extension?: string
  // Series-specific
  cover?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  backdrop_path?: string[]
  episode_run_time?: string
}

export interface ProviderMeta {
  id: string
  name: string
  base_url: string
  username: string
  live_version: string | null
  vod_version: string | null
  series_version: string | null
  channels_count: number
  movies_count: number
  series_count: number
  last_sync_at: string | null
  status: string
  expires: string | null
}

// ─── IndexedDB Layer ───────────────────────────────────────────────────────────

const DB_NAME = 'provider-data'
const DB_VERSION = 1
const STORE_FILES = 'files' // key: {playlistId, type}, value: ProviderDataFile (raw/serialized)
const STORE_META = 'meta' // key: playlistId, value: ProviderMeta

type FileKey = [string, 'live' | 'vod' | 'series']

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: ['playlistId', 'type'] })
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
  })
}

async function cacheFile(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  data: ProviderDataFile,
): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_FILES, 'readwrite')
    const store = tx.objectStore(STORE_FILES)
    store.put({ playlistId, type, ...data })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error(`[provider-data] Failed to cache ${type} file for ${playlistId}:`, err)
  }
}

async function getCachedFile(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
): Promise<ProviderDataFile | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_FILES, 'readonly')
    const store = tx.objectStore(STORE_FILES)
    const request = store.get([playlistId, type])
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result
        if (!result) return resolve(null)
        // Strip IndexedDB key fields, return as ProviderDataFile
        const { playlistId: _pid, type: _t, ...data } = result
        resolve(data as ProviderDataFile)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error(`[provider-data] Failed to get cached ${type} file for ${playlistId}:`, err)
    return null
  }
}

async function getCachedVersion(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
): Promise<string | null> {
  const cached = await getCachedFile(playlistId, type)
  return cached?.version ?? null
}

async function cacheMeta(playlistId: string, meta: ProviderMeta): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_META, 'readwrite')
    const store = tx.objectStore(STORE_META)
    store.put(meta)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error(`[provider-data] Failed to cache meta for ${playlistId}:`, err)
  }
}

export async function getCachedMeta(playlistId: string): Promise<ProviderMeta | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_META, 'readonly')
    const store = tx.objectStore(STORE_META)
    const request = store.get(playlistId)
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error(`[provider-data] Failed to get cached meta for ${playlistId}:`, err)
    return null
  }
}

export async function getAllCachedMetas(): Promise<ProviderMeta[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_META, 'readonly')
    const store = tx.objectStore(STORE_META)
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('[provider-data] Failed to get all cached metas:', err)
    return []
  }
}

export async function clearCache(playlistId?: string): Promise<void> {
  try {
    const db = await openDB()

    if (playlistId) {
      // Clear specific provider files (compound key cursor iteration)
      const filesTx = db.transaction(STORE_FILES, 'readwrite')
      const filesStore = filesTx.objectStore(STORE_FILES)
      const req = filesStore.openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          const [pid] = cursor.key as FileKey
          if (pid === playlistId) cursor.delete()
          cursor.continue()
        }
      }
      await new Promise<void>((resolve) => {
        filesTx.oncomplete = () => resolve()
      })

      const metaTx = db.transaction(STORE_META, 'readwrite')
      metaTx.objectStore(STORE_META).delete(playlistId)
      await new Promise<void>((resolve) => {
        metaTx.oncomplete = () => resolve()
      })
    } else {
      // Clear all
      const filesTx = db.transaction(STORE_FILES, 'readwrite')
      filesTx.objectStore(STORE_FILES).clear()
      await new Promise<void>((resolve) => {
        filesTx.oncomplete = () => resolve()
      })

      const metaTx = db.transaction(STORE_META, 'readwrite')
      metaTx.objectStore(STORE_META).clear()
      await new Promise<void>((resolve) => {
        metaTx.oncomplete = () => resolve()
      })
    }
  } catch (err) {
    console.error('[provider-data] Failed to clear cache:', err)
  }
}

// ─── Decompression ─────────────────────────────────────────────────────────────

export async function decompressData(blob: Blob): Promise<ProviderDataFile> {
  const buffer = await blob.arrayBuffer()
  const uint8 = new Uint8Array(buffer)
  const decompressed = gunzipSync(uint8)
  const text = new TextDecoder().decode(decompressed)
  return JSON.parse(text) as ProviderDataFile
}

// ─── Network Layer ─────────────────────────────────────────────────────────────

interface ProviderRecord {
  id: string
  name: string
  base_url: string
  username: string
  live_version: string | null
  vod_version: string | null
  series_version: string | null
  channels_count: number
  movies_count: number
  series_count: number
  last_sync_at: string | null
  status: string
  expires: string | null
}

function mapToMeta(record: ProviderRecord): ProviderMeta {
  return {
    id: record.id,
    name: record.name,
    base_url: record.base_url,
    username: record.username,
    live_version: record.live_version ?? null,
    vod_version: record.vod_version ?? null,
    series_version: record.series_version ?? null,
    channels_count: record.channels_count ?? 0,
    movies_count: record.movies_count ?? 0,
    series_count: record.series_count ?? 0,
    last_sync_at: record.last_sync_at ?? null,
    status: record.status ?? 'unknown',
    expires: record.expires ?? null,
  }
}

export async function fetchProviders(): Promise<ProviderMeta[]> {
  const records = await pb.collection('playlists').getFullList<ProviderRecord>({
    sort: 'name',
    filter: 'status != "Expired"',
  })
  return records.map(mapToMeta)
}

// ─── Sync ──────────────────────────────────────────────────────────────────────

export async function syncProviderData(
  playlistId: string,
  onProgress?: (msg: string) => void,
): Promise<{ changed: boolean; types: ('live' | 'vod' | 'series')[] }> {
  const log = (msg: string) => {
    console.log(`[provider-data] ${playlistId}: ${msg}`)
    onProgress?.(msg)
  }

  // 1. Fetch provider record from PB
  log('Fetching provider metadata...')
  const record = await pb.collection('playlists').getOne<ProviderRecord>(playlistId)
  const meta = mapToMeta(record)

  // 2. Compare versions, download changed types
  const types = ['live', 'vod', 'series'] as const
  const fieldNames = ['live_data', 'vod_data', 'series_data'] as const
  const changedTypes: ('live' | 'vod' | 'series')[] = []

  for (let i = 0; i < types.length; i++) {
    const t = types[i]
    const fieldName = fieldNames[i]
    const serverVersion = record[`${t}_version`]

    // If server has no version, no data exists yet
    if (!serverVersion) {
      log(`${t}: no server version, skipping`)
      continue
    }

    // Compare with cached version
    const cachedVersion = await getCachedVersion(playlistId, t)

    if (cachedVersion === serverVersion) {
      log(`${t}: version unchanged (${serverVersion.substring(0, 8)}...)`)
      continue
    }

    // Download and decompress
    log(`${t}: version changed, downloading...`)
    const fileUrl = pb.files.getUrl(record, fieldName)

    if (!fileUrl) {
      log(`${t}: no file URL available, skipping`)
      continue
    }

    const response = await fetch(fileUrl)
    if (!response.ok) {
      log(`${t}: download failed (${response.status}), skipping`)
      continue
    }

    const blob = await response.blob()
    const data = await decompressData(blob)

    // Cache the data
    await cacheFile(playlistId, t, data)
    changedTypes.push(t)
    log(`${t}: downloaded ${data.streams.length} streams, ${data.categories.length} categories`)
  }

  // 3. Update cached meta
  await cacheMeta(playlistId, meta)

  return {
    changed: changedTypes.length > 0,
    types: changedTypes,
  }
}

// ─── Data Retrieval ────────────────────────────────────────────────────────────

export async function getCategories(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  prefs?: { hiddenCategoryIds?: Set<string>; sortOrder?: Map<string, number> },
): Promise<ProviderCategory[]> {
  const cached = await getCachedFile(playlistId, type)
  if (!cached) return []

  let categories = [...cached.categories]

  // Filter hidden categories
  if (prefs?.hiddenCategoryIds) {
    categories = categories.filter((c) => !prefs.hiddenCategoryIds!.has(c.category_id))
  }

  // Apply sort order
  if (prefs?.sortOrder && prefs.sortOrder.size > 0) {
    const orderMap = prefs.sortOrder
    const maxOrder = Math.max(...orderMap.values()) + 1
    categories.sort((a, b) => {
      const aOrder = orderMap.has(a.category_id) ? orderMap.get(a.category_id)! : maxOrder
      const bOrder = orderMap.has(b.category_id) ? orderMap.get(b.category_id)! : maxOrder
      return aOrder - bOrder || a.category_name.localeCompare(b.category_name)
    })
  } else {
    categories.sort((a, b) => a.category_name.localeCompare(b.category_name))
  }

  return categories
}

export async function getStreams(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  categoryId?: string,
): Promise<ProviderStream[]> {
  const cached = await getCachedFile(playlistId, type)
  if (!cached) return []

  let streams = cached.streams

  if (categoryId) {
    streams = streams.filter((s) => s.category_id === categoryId)
  }

  return streams
}

// ─── Favorites ─────────────────────────────────────────────────────────────────

export async function getFavorites(
  playlistId: string,
  type?: 'live' | 'vod' | 'series',
): Promise<Set<string>> {
  const userId = pb.authStore.model?.id
  if (!userId) return new Set()

  const filterParts = [`user = "${userId}"`, `playlist = "${playlistId}"`]
  if (type) filterParts.push(`type = "${type}"`)

  const records = await pb
    .collection('favorites')
    .getFullList<FavoriteRecord>({ filter: filterParts.join(' && ') })

  return new Set(records.map((r) => r.stream_id))
}

export async function isFavorite(
  playlistId: string,
  streamId: string,
  type: 'live' | 'vod' | 'series',
): Promise<boolean> {
  const userId = pb.authStore.model?.id
  if (!userId) return false

  const result = await pb.collection('favorites').getList<FavoriteRecord>(1, 1, {
    filter: `user = "${userId}" && playlist = "${playlistId}" && stream_id = "${streamId}" && type = "${type}"`,
  })
  return result.items.length > 0
}

export async function toggleFavorite(
  playlistId: string,
  streamId: string,
  type: 'live' | 'vod' | 'series',
  streamName?: string,
  streamIcon?: string,
): Promise<void> {
  const userId = pb.authStore.model?.id
  if (!userId) throw new Error('Not authenticated')

  // Check if already favorite
  const existing = await pb
    .collection('favorites')
    .getFullList<FavoriteRecord>({
      filter: `user = "${userId}" && playlist = "${playlistId}" && stream_id = "${streamId}" && type = "${type}"`,
    })

  if (existing.length > 0) {
    // Remove
    for (const fav of existing) {
      await pb.collection('favorites').delete(fav.id)
    }
  } else {
    // Add
    await pb.collection('favorites').create<FavoriteRecord>({
      user: userId,
      playlist: playlistId,
      stream_id: streamId,
      type,
      name: streamName,
      thumbnail: streamIcon,
    })
  }
}

// ─── Display Prefs ─────────────────────────────────────────────────────────────

export async function getDisplayPrefs(playlistId: string): Promise<Record<string, unknown>> {
  const userId = pb.authStore.model?.id
  if (!userId) return {}

  const result = await pb.collection('display_prefs').getList<DisplayPrefRecord>(1, 1, {
    filter: `user = "${userId}" && playlist = "${playlistId}"`,
  })

  if (result.items.length === 0) return {}
  return (result.items[0].settings ?? {}) as Record<string, unknown>
}

// ─── Category Prefs ────────────────────────────────────────────────────────────

export async function getCategoryPrefs(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
): Promise<CategoryPrefRecord[]> {
  const userId = pb.authStore.model?.id
  if (!userId) return []

  const result = await pb.collection('category_prefs').getFullList<CategoryPrefRecord>({
    filter: `user = "${userId}" && playlist = "${playlistId}" && type = "${type}"`,
  })

  return result
}

// Helper: build hidden category set and sort order map from prefs
export async function buildCategoryPrefs(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
): Promise<{ hiddenCategoryIds: Set<string>; sortOrder: Map<string, number> }> {
  const prefs = await getCategoryPrefs(playlistId, type)

  const hiddenCategoryIds = new Set<string>()
  const sortOrder = new Map<string, number>()

  for (const p of prefs) {
    if (p.hidden) hiddenCategoryIds.add(p.category_id)
    sortOrder.set(p.category_id, p.sort_order ?? 0)
  }

  return { hiddenCategoryIds, sortOrder }
}

// ─── Full Startup Sync ─────────────────────────────────────────────────────────

export async function syncAllProviders(
  onProviderProgress?: (playlistId: string, msg: string) => void,
): Promise<void> {
  const providers = await fetchProviders()

  for (const provider of providers) {
    try {
      await syncProviderData(provider.id, (msg) => {
        onProviderProgress?.(provider.id, msg)
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `[provider-data] Failed to sync provider ${provider.id} (${provider.name}):`,
        message,
      )
      onProviderProgress?.(provider.id, `Error: ${message}`)
    }
  }
}
