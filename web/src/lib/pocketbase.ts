import PocketBase from 'pocketbase'

// In dev, use empty base so requests go to /api/collections/...
// Vite proxy forwards /api → PocketBase on :8090
// This works from any device on the LAN.
const PB_URL = import.meta.env.VITE_PB_URL || ''
export const pb = new PocketBase(PB_URL || '/')

pb.autoCancellation(false)
