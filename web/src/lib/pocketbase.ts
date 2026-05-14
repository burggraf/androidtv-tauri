import PocketBase from 'pocketbase'

const PB_URL = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(PB_URL)

// Disable auto-cancellation for SPA usage.
// PB SDK cancels in-flight requests on auth store changes,
// which causes "request was aborted" errors in React components.
pb.autoCancellation(false)
