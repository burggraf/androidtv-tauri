import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pocketbase'

export interface Device {
  id: string
  device_id: string
  device_name: string
  user: string
  created: string
  updated: string
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      setError(null)
      const records = await pb.collection('devices').getFullList<Device>({ sort: 'created' })
      setDevices(records)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  const renameDevice = async (id: string, name: string) => {
    await pb.collection('devices').update(id, { device_name: name })
    await fetchDevices()
  }

  const deleteDevice = async (id: string) => {
    await pb.collection('devices').delete(id)
    setDevices((prev) => prev.filter((d) => d.id !== id))
  }

  return { devices, loading, error, renameDevice, deleteDevice, refresh: fetchDevices }
}
