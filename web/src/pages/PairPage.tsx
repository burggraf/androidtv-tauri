import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { pb } from '@/lib/pocketbase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PairPage() {
  const [searchParams] = useSearchParams()
  const deviceId = searchParams.get('device_id') || ''
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [deviceName, setDeviceName] = useState('Android TV')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [existingDevice, setExistingDevice] = useState<{ name: string } | null>(null)

  // Check if device already paired
  useEffect(() => {
    if (!deviceId) return
    pb.collection('devices')
      .getFirstListItem(`device_id = "${deviceId}"`)
      .then((record) => {
        setExistingDevice({ name: record.device_name })
      })
      .catch(() => {
        // not found — ok, proceed with pairing
      })
  }, [deviceId])

  const handlePair = async () => {
    if (!deviceId || !deviceName.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await pb.collection('devices').create({
        device_id: deviceId,
        device_name: deviceName.trim(),
        user: user!.id,
      })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to pair device')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!deviceId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <p className="text-lg text-muted-foreground">No device ID provided.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (existingDevice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Device Already Paired</CardTitle>
            <CardDescription>
              <strong>{existingDevice.name}</strong> is already linked to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              The device should load your content automatically. If it doesn't, try restarting the app.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
        <Card className="w-full max-w-md border-green-800">
          <CardHeader>
            <CardTitle className="text-green-400">Device Paired!</CardTitle>
            <CardDescription>
              <strong>{deviceName}</strong> has been linked to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">
              Your Android TV should now load your content automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pair a Device</CardTitle>
          <CardDescription>
            Link an Android TV device to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Login prompt if not authenticated */}
          {!isAuthenticated ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                You need to be logged in to pair a device.
              </p>
              <a
                href={`/login?redirect=${encodeURIComponent(`/pair?device_id=${deviceId}`)}`}
                className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Log In
              </a>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="device_name">Device Name</Label>
                <Input
                  id="device_name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Living Room TV"
                  maxLength={100}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handlePair} disabled={submitting || !deviceName.trim()}>
                  {submitting ? 'Pairing…' : 'Pair Device'}
                </Button>
                <a
                  href="/dashboard"
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
