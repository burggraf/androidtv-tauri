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
