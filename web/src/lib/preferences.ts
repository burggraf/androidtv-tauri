import { pb } from './pocketbase'

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FavoriteRecord {
  id: string
  user: string
  playlist: string
  stream_id: string
  type: 'live' | 'vod' | 'series'
  name?: string
  thumbnail?: string
  created: string
  updated: string
}

export interface CategoryPrefRecord {
  id: string
  user: string
  playlist: string
  type: 'live' | 'vod' | 'series'
  category_id: string
  hidden: boolean
  sort_order: number
  created: string
  updated: string
}

export interface DisplaySettings {
  view_mode?: 'grid' | 'list'
  default_view?: 'live' | 'vod' | 'series'
  show_unavailable?: boolean
  parental_pin?: string
  epg_enabled?: boolean
  logo_fallback?: string
  stream_format?: 'auto' | 'ts' | 'm3u8'
}

export interface DisplayPrefRecord {
  id: string
  user: string
  playlist: string
  settings: DisplaySettings
  created: string
  updated: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentUserId(): string {
  const uid = pb.authStore.model?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

/** Escape value for PB filter string interpolation (prevents filter injection) */
function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export async function addFavorite(
  playlistId: string,
  streamId: string,
  type: 'live' | 'vod' | 'series',
  name?: string,
  thumbnail?: string,
): Promise<FavoriteRecord> {
  const userId = currentUserId()

  // Optimistic create — race condition handled via unique index catch
  try {
    return await pb.collection('favorites').create<FavoriteRecord>({
      user: userId,
      playlist: playlistId,
      stream_id: streamId,
      type,
      name,
      thumbnail,
    })
  } catch (err) {
    // Unique constraint violation — return existing record
    const existing = await pb.collection('favorites').getList<FavoriteRecord>(1, 1, {
      filter: `user = "${userId}" && playlist = "${playlistId}" && stream_id = "${esc(streamId)}" && type = "${type}"`,
    })
    if (existing.items.length > 0) return existing.items[0]
    throw err
  }
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  await pb.collection('favorites').delete(favoriteId)
}

export async function removeFavoriteByStream(
  playlistId: string,
  streamId: string,
  type: 'live' | 'vod' | 'series',
): Promise<void> {
  const userId = currentUserId()

  const existing = await pb.collection('favorites').getFullList<FavoriteRecord>({
    filter: `user = "${userId}" && playlist = "${playlistId}" && stream_id = "${esc(streamId)}" && type = "${type}"`,
  })
  for (const fav of existing) {
    await pb.collection('favorites').delete(fav.id)
  }
}

export async function getFavorites(
  playlistId?: string,
  type?: 'live' | 'vod' | 'series',
): Promise<FavoriteRecord[]> {
  const userId = currentUserId()

  const filterParts = [`user = "${userId}"`]
  if (playlistId) filterParts.push(`playlist = "${playlistId}"`)
  if (type) filterParts.push(`type = "${type}"`)

  return pb.collection('favorites').getFullList<FavoriteRecord>({
    filter: filterParts.join(' && '),
    expand: 'playlist',
    sort: '-created',
  })
}

export async function isFavorite(
  playlistId: string,
  streamId: string,
  type: 'live' | 'vod' | 'series',
): Promise<boolean> {
  const userId = currentUserId()

  const result = await pb.collection('favorites').getList<FavoriteRecord>(1, 1, {
    filter: `user = "${userId}" && playlist = "${playlistId}" && stream_id = "${esc(streamId)}" && type = "${type}"`,
  })
  return result.totalItems > 0
}

// ---------------------------------------------------------------------------
// Category Preferences
// ---------------------------------------------------------------------------

export async function setCategoryHidden(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  categoryId: string,
  hidden: boolean,
): Promise<CategoryPrefRecord> {
  const userId = currentUserId()

  const existing = await pb.collection('category_prefs').getFullList<CategoryPrefRecord>({
    filter: `user = "${userId}" && playlist = "${playlistId}" && type = "${type}" && category_id = "${esc(categoryId)}"`,
  })

  if (existing.length > 0) {
    return pb.collection('category_prefs').update<CategoryPrefRecord>(existing[0].id, {
      hidden,
    })
  }

  return pb.collection('category_prefs').create<CategoryPrefRecord>({
    user: userId,
    playlist: playlistId,
    type,
    category_id: categoryId,
    hidden,
    sort_order: 0,
  })
}

export async function toggleCategoryHidden(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  categoryId: string,
): Promise<CategoryPrefRecord> {
  const prefs = await getCategoryPrefs(playlistId, type)
  const existing = prefs.find((p) => p.category_id === categoryId)

  return setCategoryHidden(playlistId, type, categoryId, !existing?.hidden)
}

export async function reorderCategories(
  playlistId: string,
  type: 'live' | 'vod' | 'series',
  orderedCategoryIds: string[],
): Promise<CategoryPrefRecord[]> {
  const allPrefs = await getCategoryPrefs(playlistId, type)
  const orderedSet = new Set(orderedCategoryIds)

  // Categories not in ordered list — append at end preserving relative order
  const appended = allPrefs
    .filter((p) => !orderedSet.has(p.category_id))
    .map((p) => p.category_id)
  const finalOrder = [...orderedCategoryIds, ...appended]

  const updates = finalOrder.map((categoryId, index) => {
    const existing = allPrefs.find((p) => p.category_id === categoryId)
    if (existing) {
      return pb.collection('category_prefs').update<CategoryPrefRecord>(existing.id, {
        sort_order: index,
      })
    }
    return pb.collection('category_prefs').create<CategoryPrefRecord>({
      user: currentUserId(),
      playlist: playlistId,
      type,
      category_id: categoryId,
      hidden: false,
      sort_order: index,
    })
  })

  return Promise.all(updates)
}

export async function getCategoryPrefs(
  playlistId: string,
  type?: 'live' | 'vod' | 'series',
): Promise<CategoryPrefRecord[]> {
  const userId = currentUserId()

  const filterParts = [`user = "${userId}"`, `playlist = "${playlistId}"`]
  if (type) filterParts.push(`type = "${type}"`)

  return pb.collection('category_prefs').getFullList<CategoryPrefRecord>({
    filter: filterParts.join(' && '),
    expand: 'playlist',
    sort: 'sort_order, created',
  })
}

// ---------------------------------------------------------------------------
// Display Preferences
// ---------------------------------------------------------------------------

export async function getDisplayPrefs(
  playlistId: string,
): Promise<DisplayPrefRecord | null> {
  const userId = currentUserId()

  const result = await pb.collection('display_prefs').getList<DisplayPrefRecord>(1, 1, {
    filter: `user = "${userId}" && playlist = "${playlistId}"`,
    expand: 'playlist',
  })
  return result.items[0] ?? null
}

export async function updateDisplayPrefs(
  playlistId: string,
  settings: Partial<DisplaySettings>,
): Promise<DisplayPrefRecord> {
  const userId = currentUserId()

  const existing = await getDisplayPrefs(playlistId)
  if (existing) {
    const merged: DisplaySettings = { ...(existing.settings ?? {}), ...settings }
    return pb.collection('display_prefs').update<DisplayPrefRecord>(existing.id, {
      settings: merged,
    })
  }

  return pb.collection('display_prefs').create<DisplayPrefRecord>({
    user: userId,
    playlist: playlistId,
    settings,
  })
}

// ---------------------------------------------------------------------------
// Orphaned Cleanup
// ---------------------------------------------------------------------------

export async function cleanupOrphanedCategoryPrefs(
  playlistId: string,
  validCategoryIds: Set<string>,
  type: 'live' | 'vod' | 'series',
): Promise<number> {
  const allPrefs = await getCategoryPrefs(playlistId, type)

  const orphaned = allPrefs.filter((p) => !validCategoryIds.has(p.category_id))

  await Promise.all(orphaned.map((p) => pb.collection('category_prefs').delete(p.id)))

  return orphaned.length
}
