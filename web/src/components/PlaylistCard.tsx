import { useState } from 'react'
import { type Playlist, type PlaylistInput, type SyncResult, usePlaylistSync } from '@/hooks/usePlaylists'
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
import SyncProgress from '@/components/SyncProgress'
import { Pencil, Trash2, Tv, Film, Clapperboard, Radio, Users, Clock, RefreshCw, AlertCircle } from 'lucide-react'

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

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 0) return 'just now'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function PlaylistCard({ playlist, onUpdate, onDelete }: PlaylistCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { syncing, progress, sync, syncingByOther } = usePlaylistSync(playlist.id)

  const handleUpdate = async (data: PlaylistInput) => {
    await onUpdate(playlist.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(playlist.id)
    setDeleting(false)
  }

  const handleSync = async () => {
    try { await sync() } catch { /* error shown in UI */ }
  }

  const isXstream = playlist.type === 'xstream'

  // Content counts — use new sync fields, fall back to legacy xstream fields
  const channelsCount = playlist.channels_count || playlist.channels || null
  const moviesCount = playlist.movies_count || playlist.movies || null
  const seriesCount = playlist.series_count || playlist.series || null
  const maxConns = playlist.max_connections || playlist.max_streams || null
  const activeConns = playlist.active_connections || playlist.current_streams || null
  const hasContent = isXstream && (channelsCount != null || moviesCount != null || seriesCount != null)

  const expiry = formatExpiry(playlist.expires)

  const hasLegacyMetadata = isXstream && !hasContent && (
    playlist.expires || playlist.max_streams != null || playlist.channels != null ||
    playlist.movies != null || playlist.series != null
  )

  // Sync status
  const syncStatus = syncing || syncingByOther ? 'syncing' as const
    : playlist.last_sync_status === 'error' || progress?.step === 'error' ? 'error' as const
    : playlist.last_sync_status === 'success' ? 'success' as const
    : 'idle' as const

  return (
    <>
      <Card className="transition-colors hover:bg-zinc-900/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tv className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{playlist.name}</CardTitle>
              {isXstream && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                  <Clock className="h-3 w-3" />
                  <span className="truncate">Last synced: {relativeTime(playlist.last_sync_at)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1 ml-2">
            {isXstream && (
              <Button variant="ghost" size="icon" onClick={handleSync} disabled={syncing || syncingByOther}>
                <RefreshCw className={`h-4 w-4 ${(syncing || syncingByOther) ? 'animate-spin' : ''}`} />
              </Button>
            )}
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

          {/* Sync status badge + error */}
          {isXstream && (
            <>
              <div className="flex items-center gap-2">
                {syncStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    Sync failed
                  </span>
                )}
                {syncStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
                    Synced
                  </span>
                )}
                {(syncing || syncingByOther) && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-900/30 px-2 py-0.5 text-xs text-blue-400">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    {progress?.message ?? 'Syncing...'}
                  </span>
                )}
              </div>

              {/* Sync progress bar */}
              {(syncing || syncingByOther) && progress && (
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress.progress * 100}%` }}
                  />
                </div>
              )}

              {/* Error message with retry */}
              {syncStatus === 'error' && (playlist.last_sync_error || progress?.step === 'error') && (
                <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 space-y-2">
                  <p className="text-xs text-red-400 truncate">{playlist.last_sync_error || progress?.message}</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSync} disabled={syncing || syncingByOther}>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Retry Sync
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Content counts from sync */}
          {hasContent && (
            <div className="border-t border-zinc-800 pt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {channelsCount != null && <MetaStat icon={Radio} label="Live" value={channelsCount.toLocaleString()} />}
              {moviesCount != null && <MetaStat icon={Film} label="Movies" value={moviesCount.toLocaleString()} />}
              {seriesCount != null && <MetaStat icon={Clapperboard} label="Series" value={seriesCount.toLocaleString()} />}
              {maxConns != null && <MetaStat icon={Users} label="Streams" value={`${activeConns ?? 0} / ${maxConns}`} />}
              {expiry && (
                <div className={`col-span-2 flex items-center gap-1.5 text-xs ${expiry.color}`}>
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-zinc-500">Expires:</span>
                  <span className="font-medium">{expiry.formatted}</span>
                </div>
              )}
            </div>
          )}

          {/* Legacy xstream metadata (before sync) */}
          {hasLegacyMetadata && (
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
              {playlist.channels != null && <MetaStat icon={Radio} label="Live" value={playlist.channels.toLocaleString()} />}
              {playlist.movies != null && <MetaStat icon={Film} label="Movies" value={playlist.movies.toLocaleString()} />}
              {playlist.series != null && <MetaStat icon={Clapperboard} label="Series" value={playlist.series.toLocaleString()} />}
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
