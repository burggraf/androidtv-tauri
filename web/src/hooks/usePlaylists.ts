import { useState, useEffect, useCallback, useRef } from 'react'
import { pb } from '@/lib/pocketbase'
import { xstreamEnrich } from '@/lib/xstream'
import { syncProvider, type SyncProgress, type SyncResult } from '@/lib/sync'

export interface Playlist {
  id: string
  name: string
  url: string
  type: 'm3u' | 'xstream'
  enabled: boolean
  user: string

  username?: string
  password?: string

  // Legacy xstream metadata (from xstreamEnrich)
  expires?: string
  max_streams?: number
  current_streams?: number
  channels?: number
  movies?: number
  series?: number
  // New sync metadata
  live_data?: string
  vod_data?: string
  series_data?: string
  live_version?: string
  vod_version?: string
  series_version?: string
  channels_count?: number
  movies_count?: number
  series_count?: number
  max_connections?: number
  active_connections?: number
  allowed_formats?: unknown[]
  last_sync_at?: string
  last_sync_status?: string
  last_sync_error?: string
  created: string
  updated: string
  collectionId: string
  collectionName: string
}

export interface PlaylistInput {
  name: string
  url: string
  type: 'm3u' | 'xstream'
  enabled: boolean
  username: string
  password: string
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const items = await pb.collection('playlists').getFullList<Playlist>({
        sort: '-created',
      })
      setPlaylists(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  useEffect(() => {
    let unsubscribe: (() => void) | null = null
    pb.collection('playlists').subscribe<Playlist>('*', (e) => {
      if (e.action === 'update') {
        setPlaylists((prev) => prev.map((p) => (p.id === e.record.id ? e.record : p)))
      } else if (e.action === 'create') {
        setPlaylists((prev) => [e.record, ...prev.filter((p) => p.id !== e.record.id)])
      } else if (e.action === 'delete') {
        setPlaylists((prev) => prev.filter((p) => p.id !== e.record.id))
      }
    }).then((unsub) => { unsubscribe = unsub })
    return () => { unsubscribe?.() }
  }, [])

  const createPlaylist = useCallback(async (data: PlaylistInput) => {
    let metadata = {}
    if (data.type === 'xstream' && data.username && data.password) {
      metadata = await xstreamEnrich(data.url, data.username, data.password)
    }

    const item = await pb.collection('playlists').create<Playlist>({
      ...data,
      user: pb.authStore.model?.id,
      ...metadata,
    })
    setPlaylists((prev) => [item, ...prev])
    return item
  }, [])

  const updatePlaylist = useCallback(async (id: string, data: Partial<PlaylistInput>) => {
    // If xstream fields present, re-validate and refresh metadata
    let metadata = {}
    if (data.type === 'xstream' && (data.username || data.password || data.url)) {
      const existing = playlists.find(p => p.id === id)
      const url = data.url ?? existing?.url ?? ''
      const username = data.username ?? existing?.username ?? ''
      const password = data.password ?? existing?.password ?? ''
      if (username && password) {
        metadata = await xstreamEnrich(url, username, password)
      }
    }

    const item = await pb.collection('playlists').update<Playlist>(id, { ...data, ...metadata })
    setPlaylists((prev) => prev.map((p) => (p.id === id ? item : p)))
    return item
  }, [playlists])

  const deletePlaylist = useCallback(async (id: string) => {
    await pb.collection('playlists').delete(id)
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { playlists, loading, error, createPlaylist, updatePlaylist, deletePlaylist, refetch: fetchPlaylists }
}

// ─── Sync state registry ─────────────────────────────────────────────────────

interface SyncStateEntry {
  syncing: boolean
  progress: SyncProgress | null
}

const syncRegistry = new Map<string, SyncStateEntry>()
const syncListeners = new Map<string, Set<() => void>>()

function broadcastSyncState(playlistId: string) {
  syncListeners.get(playlistId)?.forEach((fn) => fn())
}

export function usePlaylistSync(playlistId: string) {
  const [, setTick] = useState(0)
  const inProgressRef = useRef<Promise<SyncResult> | null>(null)

  const getState = useCallback((): SyncStateEntry => {
    return syncRegistry.get(playlistId) ?? { syncing: false, progress: null }
  }, [playlistId])

  useEffect(() => {
    if (!syncListeners.has(playlistId)) {
      syncListeners.set(playlistId, new Set())
    }
    const listeners = syncListeners.get(playlistId)!
    const handler = () => setTick((t) => t + 1)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      if (listeners.size === 0) syncListeners.delete(playlistId)
    }
  }, [playlistId])

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (inProgressRef.current) return inProgressRef.current

    const initial: SyncStateEntry = { syncing: true, progress: { step: 'auth', progress: 0, message: 'Starting sync...' } }
    syncRegistry.set(playlistId, initial)
    broadcastSyncState(playlistId)

    inProgressRef.current = syncProvider(playlistId, (progress) => {
      syncRegistry.set(playlistId, { syncing: true, progress })
      broadcastSyncState(playlistId)
    })
      .then((result) => {
        syncRegistry.set(playlistId, {
          syncing: false,
          progress: { step: result.success ? 'done' : 'error', progress: 1, message: result.error ?? 'Sync complete' },
        })
        broadcastSyncState(playlistId)
        inProgressRef.current = null
        setTimeout(() => { syncRegistry.delete(playlistId); broadcastSyncState(playlistId) }, 10000)
        return result
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        syncRegistry.set(playlistId, {
          syncing: false,
          progress: { step: 'error', progress: 0, message, error: message },
        })
        broadcastSyncState(playlistId)
        inProgressRef.current = null
        setTimeout(() => { syncRegistry.delete(playlistId); broadcastSyncState(playlistId) }, 10000)
        throw err
      })

    return inProgressRef.current
  }, [playlistId])

  const current = getState()
  const syncingByOther = current.syncing && inProgressRef.current !== null

  return {
    syncing: current.syncing,
    progress: current.progress,
    sync,
    syncingByOther,
  }
}

export type { SyncProgress, SyncResult }
