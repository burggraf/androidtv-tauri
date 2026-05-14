import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlaylists, type PlaylistInput } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PlaylistCard from '@/components/PlaylistCard'
import PlaylistForm from '@/components/PlaylistForm'
import { Plus, LogOut, List, type LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { playlists, loading, error, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()

  const [activeTab, setActiveTab] = useState<'m3u' | 'xstream'>('m3u')
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
            {filtered.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                onUpdate={async (id, data) => {
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
      </main>
    </div>
  )
}
