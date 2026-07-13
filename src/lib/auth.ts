import type { AuthUser } from '@/api/types'
import { API_ORIGIN } from '@/api/origin'

const AUTH_STORE_KEY = 'auth'

export interface AuthStore {
  user: AuthUser | null
  accessToken?: string
  refreshToken?: string
}

export function getAuthStore(): AuthStore {
  const item = localStorage.getItem(AUTH_STORE_KEY)
  if (!item) return { user: null }
  try {
    return JSON.parse(item) as AuthStore
  } catch {
    return { user: null }
  }
}

export function isAuthenticated(): boolean {
  return getAuthStore().user !== null
}

export function loginUser(store: AuthStore) {
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(store))
}

export function logoutUser() {
  localStorage.removeItem(AUTH_STORE_KEY)
}

export async function refreshAuthToken(): Promise<boolean> {
  const store = getAuthStore()
  if (!store.refreshToken) return false

  try {
    const base = API_ORIGIN
    const res = await fetch(`${base}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: store.refreshToken }),
    })
    if (!res.ok) return false
    const body = await res.json()
    loginUser({ user: store.user, accessToken: body.accessToken, refreshToken: body.refreshToken })
    return true
  } catch (err) {
    console.error('refreshAuthToken error', err)
    return false
  }
}

export async function logoutApi(): Promise<void> {
  const store = getAuthStore()
  try {
    const base = API_ORIGIN
    if (store.refreshToken) {
      await fetch(`${base}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: store.refreshToken }),
      })
    }
  } catch {
    // Logout should be best-effort. The local session is cleared below even if
    // the server token is already expired or the network is unavailable.
  } finally {
    logoutUser()
  }
}
