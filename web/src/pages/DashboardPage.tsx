import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlaylists, type PlaylistInput } from '@/hooks/usePlaylists'
import { useDevices, type Device } from '@/hooks/useDevices'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PlaylistCard from '@/components/PlaylistCard'
import PlaylistForm from '@/components/PlaylistForm'
import { Plus, LogOut, List, Monitor, Trash2, Edit2, type LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { playlists, loading, error, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()
  const { devices: pairedDevices, loading: devicesLoading, deleteDevice } = useDevices()

  const [activeTab, setActiveTab] = useState<'m3u' | 'xstream'>('m3u')
  const [activeSection, setActiveSection] = useState<'playlists' | 'devices'>('playlists')
  const [creating, setCreating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleCreate = async (data: PlaylistInput) => {
    try {
      setSubmitError(null)
      await createPlaylist(data)
      setCreating(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create playlist')
    }
  }

  const tabs: { key: 'm3u' | 'xstream'; label: string; icon: LucideIcon }[] = [
    { key: 'm3u', label: 'M3U', icon: List },
    { key: 'xstream', label: 'Xtream', icon: List },
  ]

  const filtered = useMemo(
    () => playlists.filter((p) => p.type === activeTab),
    [playlists, activeTab],
  )

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <List className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Playlist Manager</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Section switcher */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeSection === 'playlists' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('playlists')}
          >
            <List className="mr-2 h-4 w-4" />
            Playlists
          </Button>
          <Button
            variant={activeSection === 'devices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('devices')}
          >
            <Monitor className="mr-2 h-4 w-4" />
            Devices ({pairedDevices.length})
          </Button>
        </div>

        {/* Devices Section */}
        {activeSection === 'devices' && (
          <DevicesSection
            devices={pairedDevices}
            loading={devicesLoading}
            onDelete={deleteDevice}
          />
        )}

        {/* Playlists Section */}
        {activeSection === 'playlists' && (
          <PlaylistsSection
            playlists={playlists}
            loading={loading}
            error={error}
            submitError={submitError}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            filtered={filtered}
            creating={creating}
            setCreating={setCreating}
            handleCreate={handleCreate}
            updatePlaylist={updatePlaylist}
            deletePlaylist={deletePlaylist}
            setSubmitError={setSubmitError}
          />
        )}
      </main>
    </div>
  )
}

/* ── Playlists Section (extracted) ── */

function PlaylistsSection({
  playlists,
  loading,
  error,
  submitError,
  activeTab,
  setActiveTab,
  filtered,
  creating,
  setCreating,
  handleCreate,
  updatePlaylist,
  deletePlaylist,
  setSubmitError,
}: {
  playlists: unknown[]
  loading: boolean
  error: string | null
  submitError: string | null
  activeTab: 'm3u' | 'xstream'
  setActiveTab: (t: 'm3u' | 'xstream') => void
  filtered: unknown[]
  creating: boolean
  setCreating: (v: boolean) => void
  handleCreate: (data: PlaylistInput) => Promise<void>
  updatePlaylist: (id: string, data: Partial<PlaylistInput>) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  setSubmitError: (v: string | null) => void
}) {
  const tabs: { key: 'm3u' | 'xstream'; label: string; icon: LucideIcon }[] = [
    { key: 'm3u', label: 'M3U', icon: List },
    { key: 'xstream', label: 'Xtream', icon: List },
  ]

  return (
    <>
      {/* Tab toggle + Add button */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {tabs.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setActiveTab(key); setSubmitError(null) }}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Playlist</DialogTitle>
            </DialogHeader>
            <PlaylistForm
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
              defaultType={activeTab}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Errors */}
      {(submitError || error) && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{submitError || error}</p>
            {submitError && (
              <button className="text-xs text-muted-foreground underline mt-1" onClick={() => setSubmitError(null)}>Dismiss</button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="h-6 w-40 rounded bg-zinc-800" />
                  <div className="h-4 w-64 rounded bg-zinc-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <List className="mb-4 h-12 w-12 text-zinc-700" />
            <h3 className="mb-2 text-lg font-medium">
              No {activeTab === 'm3u' ? 'M3U' : 'Xtream'} playlists yet
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your first {activeTab === 'm3u' ? 'M3U' : 'Xtream Codes'} playlist to get started.
            </p>
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Playlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((playlist: any) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              onUpdate={async (id: string, data: Partial<PlaylistInput>) => {
                try {
                  setSubmitError(null)
                  await updatePlaylist(id, data)
                } catch (err: unknown) {
                  setSubmitError(err instanceof Error ? err.message : 'Failed to update playlist')
                }
              }}
              onDelete={deletePlaylist}
            />
          ))}
        </div>
      )}
    </>
  )
}

/* ── Devices Section ── */

function DevicesSection({
  devices,
  loading,
  onDelete,
}: {
  devices: Device[]
  loading: boolean
  onDelete: (id: string) => Promise<void>
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-zinc-800" />
                <div className="h-4 w-48 rounded bg-zinc-800" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Monitor className="mb-4 h-12 w-12 text-zinc-700" />
          <h3 className="mb-2 text-lg font-medium">No paired devices</h3>
          <p className="text-sm text-muted-foreground">
            Open the app on your Android TV and scan the QR code to pair.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {devices.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          deleting={deletingId === device.id}
          onConfirmDelete={async () => {
            setDeletingId(device.id)
            await onDelete(device.id)
            setDeletingId(null)
          }}
        />
      ))}
    </div>
  )
}

function DeviceCard({
  device,
  deleting,
  onConfirmDelete,
}: {
  device: Device
  deleting: boolean
  onConfirmDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(device.device_name)

  const handleSave = useCallback(async () => {
    setEditing(false)
  }, [])

  const pairedDate = new Date(device.created).toLocaleDateString()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-5 w-5 text-zinc-500" />
            <div>
              {editing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-7 w-48 text-sm"
                    maxLength={100}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <Button size="sm" variant="ghost" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setName(device.device_name); setEditing(false) }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <h3 className="font-medium text-lg">{device.device_name}</h3>
              )}
              <p className="text-sm text-muted-foreground">
                Paired {pairedDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onConfirmDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
