import { useState, useCallback, useRef, useEffect } from 'react'
import { pb } from '@/lib/pocketbase'
import { syncProvider, type SyncProgress, type SyncResult } from '@/lib/sync'

export interface Provider {
  id: string
  name: string
  base_url: string
  username: string
  owner: string
  live_version?: string
  vod_version?: string
  series_version?: string
  channels_count?: number
  movies_count?: number
  series_count?: number
  last_sync_at?: string
  last_sync_status?: string
  last_sync_error?: string
  status?: string
  expires?: string
  max_connections?: number
  active_connections?: number
  created: string
  updated: string
  collectionId?: string
  collectionName?: string
}

export interface ProviderInput {
  name: string
  baseUrl: string
  username: string
  password: string
}

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const items = await pb.collection('providers').getFullList<Provider>({
        sort: '-created',
      })
      setProviders(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch providers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const createProvider = useCallback(async (data: ProviderInput, onProgress?: (p: SyncProgress) => void): Promise<Provider> => {
    const item = await pb.collection('providers').create<Provider>({
      name: data.name,
      base_url: data.baseUrl,
      username: data.username,
      password: data.password,
      owner: pb.authStore.record?.id,
    })

    setProviders((prev) => [item, ...prev])

    await syncProvider(item.id, onProgress)

    return item
  }, [])

  const updateProvider = useCallback(async (id: string, data: Partial<ProviderInput>) => {
    const item = await pb.collection('providers').update<Provider>(id, {
      name: data.name,
      base_url: data.baseUrl,
      username: data.username,
      password: data.password,
    })
    setProviders((prev) => prev.map((p) => (p.id === id ? item : p)))
    return item
  }, [])

  const deleteProvider = useCallback(async (id: string) => {
    await pb.collection('providers').delete(id)
    setProviders((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { providers, loading, error, createProvider, updateProvider, deleteProvider, refetch: fetchProviders }
}

// Shared sync state registry for cross-component awareness
interface SyncStateEntry {
  syncing: boolean
  progress: SyncProgress | null
}

const syncRegistry = new Map<string, SyncStateEntry>()
const syncListeners = new Map<string, Set<() => void>>()

function broadcastSyncState(providerId: string) {
  syncListeners.get(providerId)?.forEach((fn) => fn())
}

export function useProviderSync(providerId: string) {
  const [, setTick] = useState(0)
  const inProgressRef = useRef<Promise<SyncResult> | null>(null)

  const getState = useCallback((): SyncStateEntry => {
    return syncRegistry.get(providerId) ?? { syncing: false, progress: null }
  }, [providerId])

  // Subscribe to state changes from other hooks
  useEffect(() => {
    if (!syncListeners.has(providerId)) {
      syncListeners.set(providerId, new Set())
    }
    const listeners = syncListeners.get(providerId)!
    const handler = () => setTick((t) => t + 1)
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
      if (listeners.size === 0) syncListeners.delete(providerId)
    }
  }, [providerId])

  const sync = useCallback(async (): Promise<SyncResult> => {
    if (inProgressRef.current) return inProgressRef.current

    const initial: SyncStateEntry = { syncing: true, progress: { step: 'auth', progress: 0, message: 'Starting sync...' } }
    syncRegistry.set(providerId, initial)
    broadcastSyncState(providerId)

    inProgressRef.current = syncProvider(providerId, (progress) => {
      syncRegistry.set(providerId, { syncing: true, progress })
      broadcastSyncState(providerId)
    })
      .then((result) => {
        syncRegistry.set(providerId, {
          syncing: false,
          progress: { step: result.success ? 'done' : 'error', progress: 1, message: result.error ?? 'Sync complete' },
        })
        broadcastSyncState(providerId)
        inProgressRef.current = null
        return result
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        syncRegistry.set(providerId, {
          syncing: false,
          progress: { step: 'error', progress: 0, message, error: message },
        })
        broadcastSyncState(providerId)
        inProgressRef.current = null
        throw err
      })

    return inProgressRef.current
  }, [providerId])

  const current = getState()

  return {
    syncing: current.syncing,
    progress: current.progress,
    sync,
  }
}
