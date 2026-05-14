/**
 * Device auth hook — checks if this device is paired to a user account.
 */
import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pb-client'
import { getDeviceId } from '@/lib/device-id'

export interface PairedDevice {
  id: string
  device_id: string
  device_name: string
  user: string
}

export function useDeviceAuth() {
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const deviceId = getDeviceId()
      try {
        const records = await pb
          .collection('devices')
          .getFullList<PairedDevice>({
            filter: `device_id = "${deviceId}"`,
            expand: 'user',
          })
        if (!cancelled && records.length > 0) {
          setPairedDevice(records[0])
        }
      } catch {
        // not paired or network error
      }
      if (!cancelled) setLoading(false)
    }
    check()
    return () => { cancelled = true }
  }, [])

  const logout = useCallback(async () => {
    if (!pairedDevice) return
    try {
      await pb.collection('devices').delete(pairedDevice.id)
      setPairedDevice(null)
    } catch {
      // best effort
    }
  }, [pairedDevice])

  return { pairedDevice, loading, logout }
}
