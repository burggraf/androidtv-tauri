import { RefreshCw } from 'lucide-react'
import { type SyncProgress as SyncProgressType } from '@/lib/sync'

const STEP_LABELS: Record<string, string> = {
  auth: 'Authenticating...',
  fetching_categories: 'Fetching categories...',
  fetching_live: 'Fetching live streams...',
  fetching_vod: 'Fetching VOD streams...',
  fetching_series: 'Fetching series...',
  packaging: 'Packaging data...',
  uploading: 'Uploading to server...',
  updating_metadata: 'Updating metadata...',
  cleanup: 'Cleaning up...',
  done: 'Sync complete',
  error: 'Sync failed',
}

interface SyncProgressProps {
  progress: SyncProgressType
}

export default function SyncProgress({ progress }: SyncProgressProps) {
  const pct = Math.round(progress.progress * 100)
  const label = STEP_LABELS[progress.step] ?? progress.message

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs">
        {progress.step !== 'error' && progress.step !== 'done' && (
          <RefreshCw className="h-3 w-3 animate-spin text-blue-400 shrink-0" />
        )}
        <span className="text-zinc-300 truncate">{label}</span>
        <span className="text-zinc-500 ml-auto shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.step === 'error'
              ? 'bg-red-500'
              : progress.step === 'done'
                ? 'bg-green-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
