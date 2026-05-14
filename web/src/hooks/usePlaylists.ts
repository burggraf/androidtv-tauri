import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pocketbase'
import { xstreamEnrich } from '@/lib/xstream'

export interface Playlist {
  id: string
  name: string
  url: string
  type: 'm3u' | 'xstream'
  enabled: boolean
  user: string
  
  username?: string
  password?: string
  
  expires?: string
  max_streams?: number
  current_streams?: number
  channels?: number
  movies?: number
  series?: number
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

  const createPlaylist = useCallback(async (data: PlaylistInput) => {
    let metadata = {}
    if (data.type === 'xstream' && data.username && data.password) {
      metadata = await xstreamEnrich(data.url, data.username, data.password)
    }

    const item = await pb.collection('playlists').create<Playlist>({
      ...data,
      user: pb.authStore.record?.id,
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
