import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { type Playlist, type PlaylistInput } from '@/hooks/usePlaylists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const playlistSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be under 200 characters'),
  url: z.string().url('Must be a valid URL').min(1, 'URL is required'),
  type: z.enum(['m3u', 'xstream']),
  enabled: z.boolean().default(true),
})

type PlaylistFormValues = z.infer<typeof playlistSchema>

interface PlaylistFormProps {
  playlist?: Playlist
  onSubmit: (data: PlaylistInput) => Promise<void>
  onCancel: () => void
}

export default function PlaylistForm({ playlist, onSubmit, onCancel }: PlaylistFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: playlist
      ? { name: playlist.name, url: playlist.url, type: playlist.type, enabled: playlist.enabled }
      : { name: '', url: '', type: 'm3u', enabled: true },
  })

  const handleFormSubmit = async (data: PlaylistFormValues) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Playlist Name</Label>
        <Input id="name" placeholder="My IPTV Playlist" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">Playlist URL</Label>
        <Input id="url" type="url" placeholder="https://example.com/playlist.m3u" {...register('url')} />
        {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="m3u" {...register('type')} className="accent-primary" />
            M3U
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" value="xstream" {...register('type')} className="accent-primary" />
            Xtream Codes
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="enabled" {...register('enabled')} className="accent-primary" />
        <Label htmlFor="enabled" className="cursor-pointer">Enabled</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : playlist ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
