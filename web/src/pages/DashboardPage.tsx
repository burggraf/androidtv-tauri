import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlaylists, type PlaylistInput } from '@/hooks/usePlaylists'
import { useProviders, type ProviderInput } from '@/hooks/useProviders'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PlaylistCard from '@/components/PlaylistCard'
import PlaylistForm from '@/components/PlaylistForm'
import ProviderCard from '@/components/ProviderCard'
import ProviderForm from '@/components/ProviderForm'
import { Plus, LogOut, List, Server, type LucideIcon } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { playlists, loading: playlistsLoading, error: playlistsError, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()
  const { providers, loading: providersLoading, error: providersError, createProvider, updateProvider, deleteProvider } = useProviders()

  const [activeTab, setActiveTab] = useState<'playlists' | 'providers'>('playlists')
  const [creating, setCreating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleCreatePlaylist = async (data: PlaylistInput) => {
    try {
      setSubmitError(null)
      await createPlaylist(data)
      setCreating(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create playlist')
    }
  }

  const handleCreateProvider = async (data: ProviderFormData) => {
    try {
      setSubmitError(null)
      await createProvider(data)
      setCreating(false)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create provider')
    }
  }

  const tabs: { key: 'playlists' | 'providers'; label: string; icon: LucideIcon }[] = [
    { key: 'playlists', label: 'Playlists', icon: List },
    { key: 'providers', label: 'Providers', icon: Server },
  ]

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
        {/* Tab toggle */}
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

          {activeTab === 'playlists' && (
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
                <PlaylistForm onSubmit={handleCreatePlaylist} onCancel={() => setCreating(false)} />
              </DialogContent>
            </Dialog>
          )}

          {activeTab === 'providers' && (
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Provider</DialogTitle>
                </DialogHeader>
                <ProviderForm onSubmit={handleCreateProvider} onCancel={() => setCreating(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Errors */}
        {(submitError || (activeTab === 'playlists' && playlistsError) || (activeTab === 'providers' && providersError)) && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                {submitError || playlistsError || providersError}
              </p>
              {submitError && (
                <button className="text-xs text-muted-foreground underline mt-1" onClick={() => setSubmitError(null)}>Dismiss</button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          playlistsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="h-6 w-40 rounded bg-zinc-800" />
                      <div className="h-4 w-64 rounded bg-zinc-800" />
                      <div className="h-4 w-24 rounded bg-zinc-800" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <List className="mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-medium">No playlists yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add your first M3U or Xtream Codes playlist to get started.
                </p>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Playlist
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {playlists.map((playlist) => (
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
          )
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          providersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="h-6 w-40 rounded bg-zinc-800" />
                      <div className="h-4 w-64 rounded bg-zinc-800" />
                      <div className="h-4 w-24 rounded bg-zinc-800" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Server className="mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-medium">No providers yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add your first Xtream Codes provider to get started.
                </p>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onUpdate={async (id, data) => {
                    try {
                      setSubmitError(null)
                      await updateProvider(id, data)
                    } catch (err: unknown) {
                      setSubmitError(err instanceof Error ? err.message : 'Failed to update provider')
                    }
                  }}
                  onDelete={deleteProvider}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
