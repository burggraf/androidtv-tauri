import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePlaylists, type PlaylistInput } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PlaylistCard from '@/components/PlaylistCard'
import PlaylistForm from '@/components/PlaylistForm'
import { Plus, LogOut, List } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { playlists, loading, error, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists()
  const [creating, setCreating] = useState(false)

  const handleCreate = async (data: PlaylistInput) => {
    await createPlaylist(data)
    setCreating(false)
  }

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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your Playlists</h2>
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
              <PlaylistForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-6 w-40 rounded bg-zinc-800" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
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
                onUpdate={updatePlaylist}
                onDelete={deletePlaylist}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
