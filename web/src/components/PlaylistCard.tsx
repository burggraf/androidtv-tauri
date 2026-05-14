import { useState } from 'react'
import { type Playlist, type PlaylistInput } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PlaylistForm from '@/components/PlaylistForm'
import { Pencil, Trash2, Tv, Film, Clapperboard, Radio, Users, Clock } from 'lucide-react'

interface PlaylistCardProps {
  playlist: Playlist
  onUpdate: (id: string, data: Partial<PlaylistInput>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function MetaStat({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
      <Icon className="h-3.5 w-3.5 text-zinc-500" />
      <span className="text-zinc-500">{label}:</span>
      <span className="font-medium text-zinc-300">{value}</span>
    </div>
  )
}

function formatExpiry(expires?: string) {
  if (!expires) return null
  const d = new Date(expires)
  const now = new Date()
  const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  const color = daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-yellow-400' : 'text-zinc-300'
  const suffix = daysLeft < 0 ? ' (expired)' : daysLeft === 0 ? ' (today)' : ` (${daysLeft}d left)`
  return { formatted: formatted + suffix, color }
}

export default function PlaylistCard({ playlist, onUpdate, onDelete }: PlaylistCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleUpdate = async (data: PlaylistInput) => {
    await onUpdate(playlist.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(playlist.id)
    setDeleting(false)
  }

  const expiry = formatExpiry(playlist.expires)
  const hasMetadata = playlist.type === 'xstream' && (
    playlist.expires || playlist.max_streams != null || playlist.channels != null ||
    playlist.movies != null || playlist.series != null
  )

  return (
    <>
      <Card className="transition-colors hover:bg-zinc-900/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tv className="h-5 w-5 shrink-0 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold truncate">{playlist.name}</CardTitle>
          </div>
          <div className="flex shrink-0 gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* URL */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground shrink-0">URL:</span>
            <span className="truncate text-zinc-400 text-xs">{playlist.url}</span>
          </div>

          {/* Type + status */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              {playlist.type === 'xstream' ? 'Xtream' : 'M3U'}
            </span>
            <span className={`text-xs font-medium ${playlist.enabled ? 'text-green-400' : 'text-zinc-500'}`}>
              {playlist.enabled ? '● Active' : '○ Disabled'}
            </span>
          </div>

          {/* Xstream metadata */}
          {hasMetadata && (
            <div className="border-t border-zinc-800 pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {expiry && (
                <div className={`col-span-2 flex items-center gap-1.5 text-xs ${expiry.color}`}>
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-zinc-500">Expires:</span>
                  <span className="font-medium">{expiry.formatted}</span>
                </div>
              )}
              {playlist.max_streams != null && (
                <MetaStat icon={Users} label="Streams" value={`${playlist.current_streams ?? 0} / ${playlist.max_streams}`} />
              )}
              {playlist.channels != null && (
                <MetaStat icon={Radio} label="Live" value={playlist.channels.toLocaleString()} />
              )}
              {playlist.movies != null && (
                <MetaStat icon={Film} label="Movies" value={playlist.movies.toLocaleString()} />
              )}
              {playlist.series != null && (
                <MetaStat icon={Clapperboard} label="Series" value={playlist.series.toLocaleString()} />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <PlaylistForm playlist={playlist} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
