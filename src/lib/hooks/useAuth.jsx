import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { loginThunk, logout } from '@/store/authSlice'

export default function useAuth() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth)

  const login = useCallback(
    async (email, password) => {
      const result = await dispatch(loginThunk({ email, password }))
      // result may be fulfilled or rejected
      // return a consistent shape for callers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyRes = result
      if (anyRes?.meta?.requestStatus === 'fulfilled') {
        return { ok: true, payload: anyRes.payload }
      }
      return { ok: false, error: anyRes?.payload || anyRes?.error?.message }
    },
    [dispatch]
  )

  const signOut = useCallback(() => dispatch(logout()), [dispatch])

  return {
    user: auth.user,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    isLoading: auth.status === 'loading',
    error: auth.error,
    login,
    signOut,
  }
}
