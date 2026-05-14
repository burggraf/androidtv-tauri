import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pocketbase'

export interface Playlist {
  id: string
  name: string
  url: string
  type: 'm3u' | 'xstream'
  enabled: boolean
  user: string
  // Xstream Codes credentials
  username?: string
  password?: string
  // Account metadata (auto-populated from xstream API)
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
  username?: string
  password?: string
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
    const item = await pb.collection('playlists').create<Playlist>({
      ...data,
      user: pb.authStore.record?.id,
    })
    setPlaylists((prev) => [item, ...prev])
    return item
  }, [])

  const updatePlaylist = useCallback(async (id: string, data: Partial<PlaylistInput>) => {
    const item = await pb.collection('playlists').update<Playlist>(id, data)
    setPlaylists((prev) => prev.map((p) => (p.id === id ? item : p)))
    return item
  }, [])

  const deletePlaylist = useCallback(async (id: string) => {
    await pb.collection('playlists').delete(id)
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { playlists, loading, error, createPlaylist, updatePlaylist, deletePlaylist, refetch: fetchPlaylists }
}
