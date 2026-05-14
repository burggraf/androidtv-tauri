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
import { Pencil, Trash2, Tv } from 'lucide-react'

interface PlaylistCardProps {
  playlist: Playlist
  onUpdate: (id: string, data: Partial<PlaylistInput>) => Promise<void>
  onDelete: (id: string) => Promise<void>
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

  return (
    <>
      <Card className="transition-colors hover:bg-zinc-900/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">{playlist.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleting(true)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">URL:</span>
              <span className="truncate text-zinc-400">{playlist.url}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium uppercase text-zinc-400">
                {playlist.type}
              </span>
              <span className={`text-xs font-medium ${playlist.enabled ? 'text-green-400' : 'text-zinc-500'}`}>
                {playlist.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
