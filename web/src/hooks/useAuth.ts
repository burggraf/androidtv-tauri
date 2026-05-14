import { useState, useEffect, useCallback } from 'react'
import { pb } from '@/lib/pocketbase'

export interface User {
  id: string
  email: string
  created: string
  updated: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sync with PB authStore changes
    const unsub = pb.authStore.onChange((token, record) => {
      setUser(record as User | null)
    })

    // Check if already authenticated
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(pb.authStore.record as User)
    }
    setLoading(false)

    return unsub
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    return authData
  }, [])

  const signup = useCallback(async (email: string, password: string) => {
    // Create user account
    await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      emailVisibility: true,
    })
    // Auto-login after signup
    return login(email, password)
  }, [login])

  const logout = useCallback(() => {
    pb.authStore.clear()
    setUser(null)
  }, [])

  return { user, loading, login, signup, logout, isAuthenticated: !!user }
}
