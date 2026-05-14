/**
 * Generate or retrieve a persistent device UUID.
 * Stored in localStorage (Tauri WebView persists across launches).
 */

const DEVICE_ID_KEY = 'androidtv_device_id'

function generateUUID(): string {
  return crypto.randomUUID()
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id || id === '5da8cb74-a335-4ffb-b985-d79764b6f6b6') {
    id = generateUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY)
}
