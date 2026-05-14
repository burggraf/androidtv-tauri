/**
 * Pair Screen — shows QR code linking to web portal pair page.
 * Polls PocketBase for the device record to detect when pairing completes.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { getDeviceId } from '@/lib/device-id'
import { pb } from '@/lib/pb-client'

const POLL_INTERVAL_MS = 3000

function useDevicePairing(deviceId: string) {
  const [isPaired, setIsPaired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const records = await pb
          .collection('devices')
          .getFullList({ filter: `device_id = "${deviceId}" && user != ""`, sort: 'created' })
        if (!cancelled && records.length > 0) {
          setIsPaired(true)
        }
      } catch {
        // device not found yet — keep polling
      }
    }
    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [deviceId])

  return { isPaired, error }
}

export function PairScreen() {
  const deviceId = getDeviceId()
  const { isPaired, error } = useDevicePairing(deviceId)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Build pair URL pointing to the web portal (not PocketBase directly).
  // VITE_WEB_PORTAL_URL = your web portal base URL (e.g. http://192.168.1.100:5173)
  // Falls back to same origin as PB_URL with port swapped to 5173.
  const portalBase = import.meta.env.VITE_WEB_PORTAL_URL || (() => {
    const pbRaw = import.meta.env.VITE_PB_URL || 'http://localhost:8090'
    try {
      const u = new URL(pbRaw)
      u.port = '5173'
      return u.origin
    } catch {
      return 'http://localhost:5173'
    }
  })()
  const pairUrl = `${portalBase.replace(/\/$/, '')}/pair?device_id=${deviceId}`

  useEffect(() => {
    QRCode.toCanvas(canvasRef.current, pairUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#ffffff', light: '#000000' },
    })
  }, [pairUrl])

  // Handle pairing complete — reload to show main app
  if (isPaired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-black">
        <h1 className="text-3xl font-bold text-white">Device Paired!</h1>
        <p className="text-lg text-muted-foreground">Loading your content…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-black">
      <h1 className="text-3xl font-bold text-white">Pair Your Device</h1>
      <p className="text-lg text-zinc-400 max-w-md text-center">
        Scan this QR code with your phone, or visit the URL below on any browser.
      </p>

      {/* QR Code */}
      <div className="bg-white p-4 rounded-xl">
        <canvas ref={canvasRef} />
      </div>

      {/* URL fallback */}
      <div className="text-center mt-2">
        <p className="text-sm text-zinc-500 mb-1">Or visit:</p>
        <p className="text-base text-cyan-400 font-mono select-all">{pairUrl}</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <p className="text-muted-foreground text-sm mt-4">
        Waiting for pairing…
      </p>
    </div>
  )
}
