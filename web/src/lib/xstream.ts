/**
 * Xtream Codes API client — runs entirely in browser.
 * Some providers block datacenter IPs, so server-side fetches would fail.
 * This runs client-side where the user's residential IP lives.
 */

function normalizeBaseUrl(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, '')
  const protoEnd = url.indexOf('://')
  if (protoEnd === -1) return url
  const hostStart = protoEnd + 3
  const slashIdx = url.indexOf('/', hostStart)
  if (slashIdx > -1) {
    url = url.substring(0, slashIdx)
  }
  return url
}

export interface XstreamUserInfo {
  username?: string
  password?: string
  status?: string
  exp_date?: string
  is_trial?: string
  active_cons?: string
  max_connections?: string
  created_at?: string
}

export interface XstreamServerInfo {
  url?: string
  port?: string
  https_port?: string
  server_protocol?: string
  time_now?: string
}

export interface XstreamAuthResponse {
  user_info?: XstreamUserInfo
  server_info?: XstreamServerInfo
}

export interface XstreamMetadata {
  expires: string | null
  max_streams: number | null
  current_streams: number | null
  channels: number | null
  movies: number | null
  series: number | null
}

/**
 * Validate xstream credentials via player_api.php.
 * Returns auth response on success.
 * Throws on failure (bad credentials, network, non-active account).
 */
export async function xstreamAuthenticate(
  rawUrl: string,
  username: string,
  password: string,
): Promise<XstreamAuthResponse> {
  const baseUrl = normalizeBaseUrl(rawUrl)
  const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`

  let res: Response
  try {
    res = await fetch(apiUrl)
  } catch {
    throw new Error('Cannot reach Xtream Codes server. Check the URL and try again.')
  }

  if (res.status !== 200) {
    throw new Error(`Xtream Codes server returned HTTP ${res.status}. Authentication failed.`)
  }

  const data: XstreamAuthResponse = await res.json()

  if (!data.user_info) {
    throw new Error('Invalid Xtream Codes credentials. Authentication failed.')
  }

  if (data.user_info.status && data.user_info.status !== 'Active') {
    throw new Error(`Xtream Codes account is not active. Status: ${data.user_info.status}`)
  }

  return data
}

/**
 * Fetch content count from an xstream endpoint.
 * Returns array length or null on failure (non-fatal).
 */
async function xstreamCount(
  rawUrl: string,
  username: string,
  password: string,
  action: string,
): Promise<number | null> {
  const baseUrl = normalizeBaseUrl(rawUrl)
  const apiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`

  try {
    const res = await fetch(apiUrl)
    if (res.status !== 200) return null
    const json: unknown = await res.json()
    if (Array.isArray(json)) return json.length
  } catch {
    // ignore — count stays null
  }
  return null
}

/**
 * Validate xstream credentials and fetch metadata.
 * Throws on auth failure. Content counts are best-effort (null on failure).
 */
export async function xstreamEnrich(
  rawUrl: string,
  username: string,
  password: string,
): Promise<XstreamMetadata> {
  const auth = await xstreamAuthenticate(rawUrl, username, password)
  const userInfo = auth.user_info!

  const expires = userInfo.exp_date
    ? new Date(parseInt(userInfo.exp_date, 10) * 1000).toISOString()
    : null

  const max_streams = userInfo.max_connections
    ? parseInt(userInfo.max_connections, 10)
    : null

  const current_streams = userInfo.active_cons
    ? parseInt(userInfo.active_cons, 10)
    : null

  const [channels, movies, series] = await Promise.all([
    xstreamCount(rawUrl, username, password, 'get_live_streams'),
    xstreamCount(rawUrl, username, password, 'get_vod_streams'),
    xstreamCount(rawUrl, username, password, 'get_series'),
  ])

  return { expires, max_streams, current_streams, channels, movies, series }
}

// ─── Xtream API Response Interfaces ──────────────────────────────────────

export interface XstreamCategory {
  category_id: string
  category_name: string
  parent_id?: number
}

export interface XstreamLiveStream {
  num: number
  name: string
  stream_type: string
  stream_id: number
  stream_icon?: string
  epg_channel_id?: string
  added?: string
  is_adult?: string
  category_id: string
  custom_sid?: string
  tv_archive?: number
  direct_source?: string
  tv_archive_duration?: number
}

export interface XstreamVodStream {
  num: number
  name: string
  stream_type: string
  stream_id: number
  stream_icon?: string
  rating?: number | string
  rating_5based?: number
  added?: string
  is_adult?: string
  category_id: string
  container_extension?: string
}

export interface XstreamSeriesStream {
  num: number
  name: string
  series_id: number
  cover?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  releaseDate?: string
  last_modified?: string
  rating?: number | string
  rating_5based?: number
  backdrop_path?: string[]
  youtube_trailer?: string
  episode_run_time?: string
  category_id: string
}

export interface XstreamFullData {
  live: { categories: XstreamCategory[]; streams: XstreamLiveStream[] }
  vod: { categories: XstreamCategory[]; streams: XstreamVodStream[] }
  series: { categories: XstreamCategory[]; streams: XstreamSeriesStream[] }
}

export interface XstreamFetchProgress {
  step: 'categories' | 'live' | 'vod' | 'series' | 'done'
  progress: number // 0-1
}

// ─── RateLimitedFetcher ──────────────────────────────────────────────────

/**
 * Fetcher that respects max concurrent connections.
 * Waits when at capacity, properly tracks active connections.
 */
export class RateLimitedFetcher {
  private maxConcurrent: number
  private activeConnections = 0
  private resolveQueue: Array<() => void> = []

  constructor(maxConcurrent: number) {
    this.maxConcurrent = Math.max(1, maxConcurrent)
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    await this.acquire()
    try {
      return await fetch(url, init)
    } finally {
      this.release()
    }
  }

  private acquire(): Promise<void> {
    if (this.activeConnections < this.maxConcurrent) {
      this.activeConnections++
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      this.resolveQueue.push(resolve)
    })
  }

  private release(): void {
    const next = this.resolveQueue.shift()
    if (next) {
      next()
    } else {
      this.activeConnections--
    }
  }
}

// ─── Individual Data Fetch Functions ─────────────────────────────────────

async function xstreamFetchArray(
  rawUrl: string,
  username: string,
  password: string,
  action: string,
  params?: Record<string, string>,
): Promise<unknown[]> {
  const baseUrl = normalizeBaseUrl(rawUrl)
  const search = new URLSearchParams({ username, password, action, ...params })
  const apiUrl = `${baseUrl}/player_api.php?${search.toString()}`

  const res = await fetch(apiUrl)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${action}`)
  }

  try {
    const json: unknown = await res.json()
    return Array.isArray(json) ? json : []
  } catch {
    return [] // non-fatal for data fetches
  }
}

/**
 * Fetch live stream categories.
 */
export async function xstreamGetLiveCategories(
  url: string,
  username: string,
  password: string,
): Promise<XstreamCategory[]> {
  return xstreamFetchArray(url, username, password, 'get_live_categories') as Promise<XstreamCategory[]>
}

/**
 * Fetch live streams. Optionally filter by categoryId.
 */
export async function xstreamGetLiveStreams(
  url: string,
  username: string,
  password: string,
  categoryId?: string,
): Promise<XstreamLiveStream[]> {
  const params = categoryId ? { category_id: categoryId } : undefined
  return xstreamFetchArray(url, username, password, 'get_live_streams', params) as Promise<XstreamLiveStream[]>
}

/**
 * Fetch VOD categories.
 */
export async function xstreamGetVodCategories(
  url: string,
  username: string,
  password: string,
): Promise<XstreamCategory[]> {
  return xstreamFetchArray(url, username, password, 'get_vod_categories') as Promise<XstreamCategory[]>
}

/**
 * Fetch VOD streams. Optionally filter by categoryId.
 */
export async function xstreamGetVodStreams(
  url: string,
  username: string,
  password: string,
  categoryId?: string,
): Promise<XstreamVodStream[]> {
  const params = categoryId ? { category_id: categoryId } : undefined
  return xstreamFetchArray(url, username, password, 'get_vod_streams', params) as Promise<XstreamVodStream[]>
}

/**
 * Fetch series categories.
 */
export async function xstreamGetSeriesCategories(
  url: string,
  username: string,
  password: string,
): Promise<XstreamCategory[]> {
  return xstreamFetchArray(url, username, password, 'get_series_categories') as Promise<XstreamCategory[]>
}

/**
 * Fetch series. Optionally filter by categoryId.
 */
export async function xstreamGetSeries(
  url: string,
  username: string,
  password: string,
  categoryId?: string,
): Promise<XstreamSeriesStream[]> {
  const params = categoryId ? { category_id: categoryId } : undefined
  return xstreamFetchArray(url, username, password, 'get_series', params) as Promise<XstreamSeriesStream[]>
}

// ─── xstreamGetAllData Orchestrator ──────────────────────────────────────

/**
 * Fetch all provider data (categories + streams for live/vod/series).
 *
 * Strategy:
 * 1. Fetch all 3 category types in parallel
 * 2. Fetch all 3 stream types (no categoryId filter — full dataset)
 *    — rate-limited via RateLimitedFetcher respecting max_connections
 * 3. Calls onProgress at each stage
 * 4. Returns structured XstreamFullData
 */
export async function xstreamGetAllData(
  url: string,
  username: string,
  password: string,
  maxConnections = 3,
  onProgress?: (progress: XstreamFetchProgress) => void,
): Promise<XstreamFullData> {
  const report = (step: XstreamFetchProgress['step'], progress: number) => {
    onProgress?.({ step, progress })
  }

  // Phase 1: Fetch all categories in parallel
  report('categories', 0)
  const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
    xstreamGetLiveCategories(url, username, password),
    xstreamGetVodCategories(url, username, password),
    xstreamGetSeriesCategories(url, username, password),
  ])
  report('categories', 1)

  // Phase 2: Fetch all streams with rate limiting
  const fetcher = new RateLimitedFetcher(maxConnections)
  const baseUrl = normalizeBaseUrl(url)

  const buildUrl = (action: string) => {
    const search = new URLSearchParams({ username, password, action })
    return `${baseUrl}/player_api.php?${search.toString()}`
  }

  const fetchStreams = async <T>(action: string): Promise<T[]> => {
    const apiUrl = buildUrl(action)
    const res = await fetcher.fetch(apiUrl)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${action}`)
    }
    try {
      const json: unknown = await res.json()
      return Array.isArray(json) ? (json as T[]) : []
    } catch {
      return []
    }
  }

  report('live', 0)
  const liveStreams = await fetchStreams<XstreamLiveStream>('get_live_streams')
  report('live', 1)

  report('vod', 0)
  const vodStreams = await fetchStreams<XstreamVodStream>('get_vod_streams')
  report('vod', 1)

  report('series', 0)
  const seriesStreams = await fetchStreams<XstreamSeriesStream>('get_series')
  report('series', 1)

  report('done', 1)

  return {
    live: { categories: liveCategories, streams: liveStreams },
    vod: { categories: vodCategories, streams: vodStreams },
    series: { categories: seriesCategories, streams: seriesStreams },
  }
}
