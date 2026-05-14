import { useState } from 'react'
import { type Provider, type ProviderInput, useProviderSync } from '@/hooks/useProviders'
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
import ProviderForm from '@/components/ProviderForm'
import SyncProgress from '@/components/SyncProgress'
import {
  Tv, Film, Clapperboard, RefreshCw, Pencil, Trash2,
  AlertCircle, CheckCircle, Clock, Globe,
} from 'lucide-react'

interface ProviderCardProps {
  provider: Provider
  onUpdate: (id: string, data: Partial<ProviderInput>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSync?: (id: string) => Promise<void>
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
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

function SyncBadge({ status }: { status: 'idle' | 'syncing' | 'success' | 'error' }) {
  const config = {
    idle: { icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-800', label: 'Idle' },
    syncing: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-900/50', label: 'Syncing' },
    success: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/50', label: 'Synced' },
    error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/50', label: 'Error' },
  }
  const { icon: Icon, color, bg, label } = config[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${bg} ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

export default function ProviderCard({ provider, onUpdate, onDelete, onSync }: ProviderCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { syncing, progress, sync } = useProviderSync(provider.id)

  const handleUpdate = async (data: ProviderInput) => {
    await onUpdate(provider.id, data)
    setEditing(false)
  }

  const handleDelete = async () => {
    await onDelete(provider.id)
    setDeleting(false)
  }

  const handleSync = async () => {
    try {
      await sync()
    } catch {
      // error shown in progress
    }
    onSync?.(provider.id)
  }

  const syncStatus: 'idle' | 'syncing' | 'success' | 'error' =
    syncing ? 'syncing'
    : provider.last_sync_status === 'error' || progress?.step === 'error' ? 'error'
    : provider.last_sync_status === 'success' ? 'success'
    : 'idle'

  const expiry = formatExpiry(provider.expires)
  const hasContent = provider.channels_count != null || provider.movies_count != null || provider.series_count != null

  return (
    <>
      <Card className="transition-colors hover:bg-zinc-900/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tv className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold truncate">{provider.name}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{provider.base_url}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-1 ml-2">
            <Button variant="ghost" size="icon" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Sync badge + last sync */}
          <div className="flex items-center gap-3">
            <SyncBadge status={syncStatus} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {relativeTime(provider.last_sync_at)}
            </span>
          </div>

          {/* Content counts */}
          {hasContent && (
            <div className="border-t border-zinc-800 pt-3 grid grid-cols-3 gap-x-4 gap-y-1.5">
              {provider.channels_count != null && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Tv className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-zinc-500">Live:</span>
                  <span className="font-medium text-zinc-300">{provider.channels_count.toLocaleString()}</span>
                </div>
              )}
              {provider.movies_count != null && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Film className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-zinc-500">Movies:</span>
                  <span className="font-medium text-zinc-300">{provider.movies_count.toLocaleString()}</span>
                </div>
              )}
              {provider.series_count != null && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Clapperboard className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-zinc-500">Series:</span>
                  <span className="font-medium text-zinc-300">{provider.series_count.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Expiry */}
          {expiry && (
            <div className={`flex items-center gap-1.5 text-xs ${expiry.color}`}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-zinc-500">Expires:</span>
              <span className="font-medium">{expiry.formatted}</span>
            </div>
          )}

          {/* Connection info */}
          {provider.max_connections != null && (
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-500">Connections:</span>{' '}
              <span className="font-medium text-zinc-300">{provider.active_connections ?? 0} / {provider.max_connections}</span>
            </div>
          )}

          {/* Sync progress */}
          {syncing && progress && (
            <SyncProgress progress={progress} />
          )}

          {/* Error message */}
          {(provider.last_sync_error || progress?.step === 'error') && syncStatus === 'error' && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{provider.last_sync_error || progress?.message}</span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSync} disabled={syncing}>
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry Sync
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
          </DialogHeader>
          <ProviderForm onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{provider.name}"? This will remove all synced data. This action cannot be undone.
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
