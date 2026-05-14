import { useState, useEffect, useCallback } from 'react'
import { usePlaylistSync } from '@/hooks/usePlaylists'
import { RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SyncProgressProps {
  playlistId: string
  onSync?: (id: string) => Promise<void>
}

const STATUS_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  idle: { icon: RefreshCw, color: 'text-zinc-500', label: 'Ready' },
  syncing: { icon: Loader2, color: 'text-blue-400', label: 'Syncing' },
  success: { icon: CheckCircle2, color: 'text-green-400', label: 'Synced' },
  error: { icon: AlertCircle, color: 'text-red-400', label: 'Error' },
}

export default function SyncProgress({ playlistId, onSync }: SyncProgressProps) {
  const { syncing, progress, sync, syncingByOther } = usePlaylistSync(playlistId)

  // Auto-trigger sync when component mounts (for initial sync after create)
  const autoSync = useCallback(async () => {
    try {
      await sync()
    } catch {
      // error shown in UI
    }
    if (onSync) {
      try { await onSync(playlistId) } catch {}
    }
  }, [sync, onSync, playlistId])

  // Only auto-sync once on mount
  useEffect(() => {
    void autoSync()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const status = syncing || syncingByOther ? 'syncing'
    : progress?.step === 'error' ? 'error'
    : progress?.step === 'done' ? 'success'
    : 'idle'

  const meta = STATUS_META[status] ?? STATUS_META.idle
  const Icon = meta.icon

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-xs ${meta.color}`}>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${status === 'syncing' ? 'animate-spin' : ''}`} />
          <span className="font-medium">{meta.label}</span>
        </div>
        {status === 'idle' && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { void sync(); void (onSync?.(playlistId)) }}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Sync Now
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {(status === 'syncing' || status === 'error') && (
        <>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(progress?.progress ?? 0) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400">{progress?.message}</p>
        </>
      )}

      {status === 'success' && (
        <p className="text-xs text-zinc-500">Data synced successfully.</p>
      )}
    </div>
  )
}
