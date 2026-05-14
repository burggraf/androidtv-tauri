import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Playlist, type PlaylistInput } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

interface PlaylistFormProps {
  playlist?: Playlist
  onSubmit: (data: PlaylistInput) => Promise<void>
  onCancel: () => void
}

export default function PlaylistForm({ playlist, onSubmit, onCancel }: PlaylistFormProps) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<PlaylistFormValues>({
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
      : { name: '', url: '', type: 'm3u', enabled: true, username: '', password: '' },
  })

  const type = useWatch({ control, name: 'type' })
  const [showPassword, setShowPassword] = useState(false)

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
          placeholder={type === 'xstream' ? 'http://provider.com:8080' : 'http://provider.com/playlist.m3u'}
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
    </form>
  )
}
