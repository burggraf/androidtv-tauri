import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Playlist, type PlaylistInput, type SyncResult } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { xstreamAuthenticate } from '@/lib/xstream'
import SyncProgress from '@/components/SyncProgress'

const playlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  url: z.string().url('Must be a valid URL'),
  type: z.enum(['m3u', 'xstream']),
  enabled: z.boolean().default(true),
  username: z.string().max(200).optional().default(''),
  password: z.string().max(200).optional().default(''),
}).superRefine((data, ctx) => {
  if (data.type === 'xstream') {
    if (!data.username?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['username'], message: 'Username is required for Xtream Codes' })
    }
    if (!data.password?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required for Xtream Codes' })
    }
  }
})

type PlaylistFormValues = z.infer<typeof playlistSchema>

interface AuthTestResult {
  status: string
  expiry?: string
  maxConnections?: number
  activeConnections?: number
}

interface PlaylistFormProps {
  playlist?: Playlist
  onSubmit: (data: PlaylistInput) => Promise<void>
  onSync?: (id: string) => Promise<SyncResult | void>
  onCancel: () => void
  defaultType?: 'm3u' | 'xstream'
}

export default function PlaylistForm({ playlist, onSubmit, onSync, onCancel, defaultType }: PlaylistFormProps) {
  const { register, handleSubmit, control, getValues, trigger, formState: { errors, isSubmitting } } = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: playlist
      ? {
          name: playlist.name,
          url: playlist.url,
          type: playlist.type,
          enabled: playlist.enabled,
          username: playlist.username ?? '',
          password: playlist.password ?? '',
        }
      : { name: '', url: '', type: defaultType ?? 'm3u', enabled: true, username: '', password: '' },
  })

  const type = useWatch({ control, name: 'type' })
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<AuthTestResult | null>(null)

  const handleTest = async () => {
    setTestError(null)
    setTestResult(null)

    // Validate schema before testing
    const valid = await trigger(['url', 'username', 'password'])
    if (!valid) return

    setTesting(true)

    try {
      const values = getValues()
      const auth = await xstreamAuthenticate(values.url, values.username ?? '', values.password ?? '')
      const info = auth.user_info!

      const expDate = info.exp_date ? new Date(parseInt(info.exp_date) * 1000) : null

      setTestResult({
        status: info.status ?? 'Unknown',
        expiry: expDate?.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        maxConnections: info.max_connections ? parseInt(info.max_connections) : undefined,
        activeConnections: info.active_cons ? parseInt(info.active_cons) : undefined,
      })
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const isXstream = playlist?.type === 'xstream' || type === 'xstream'
  const isEditing = !!playlist

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Playlist Name</Label>
        <Input id="name" placeholder="My IPTV Playlist" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Type toggle */}
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="m3u" {...register('type')} className="accent-primary" />
            M3U
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="xstream" {...register('type')} className="accent-primary" />
            Xtream Codes
          </label>
        </div>
      </div>

      {/* URL */}
      <div className="space-y-2">
        <Label htmlFor="url">
          {type === 'xstream' ? 'Server URL' : 'Playlist URL'}
        </Label>
        <Input
          id="url"
          type="url"
          placeholder={type === 'xstream' ? 'http://example.com' : 'https://.../playlist.m3u8'}
          {...register('url')}
        />
        {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
      </div>

      {/* Xstream credentials — only shown when type === 'xstream' */}
      {type === 'xstream' && (
        <div className="rounded-md border border-zinc-700 p-4 space-y-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Xtream Codes Credentials
          </p>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="your_username" {...register('username')} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-10" {...register('password')} />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          {/* Test Connection button (xstream only) */}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className="rounded-md border border-green-900/50 bg-green-950/30 p-3 space-y-1">
              <div className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Connected — Status: {testResult.status}</span>
              </div>
              {testResult.expiry && (
                <p className="text-xs text-zinc-400 ml-5">Expires: {testResult.expiry}</p>
              )}
              {testResult.maxConnections != null && (
                <p className="text-xs text-zinc-400 ml-5">
                  Connections: {testResult.activeConnections ?? 0} / {testResult.maxConnections}
                </p>
              )}
            </div>
          )}
          {testError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{testError}</span>
            </div>
          )}
        </div>
      )}

      {/* Enabled */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="enabled" {...register('enabled')} className="accent-primary" />
        <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : playlist ? 'Update' : 'Create'}
        </Button>
      </div>

      {/* Sync progress during initial sync after create */}
      {isEditing && isXstream && onSync && (
        <SyncProgress playlistId={playlist.id} onSync={onSync} />
      )}
    </form>
  )
}
