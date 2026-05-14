/**
 * PocketBase client for the TV app.
 *
 * Assumes user is already authenticated via login page.
 * Auth state is shared through pb.authStore.
 */
import PocketBase from 'pocketbase'

const PB_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090'

export const pb = new PocketBase(PB_URL)
pb.autoCancellation(false)

export { PB_URL }
