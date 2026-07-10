import { useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/store'
import { meThunk, refreshThunk } from '@/store/slices/authSlice'

export default function AuthBootstrap() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth)

  useEffect(() => {
    // If already have a user in store, no need to refresh.
    if (auth.user) return

    // If we have refresh token in state (restored from localStorage), attempt refresh.
    if (!auth.refreshToken) return

    ;(async () => {
      const refreshed = await dispatch(refreshThunk())
        .unwrap()
        .catch(() => null)

      if (!refreshed) return
      await dispatch(meThunk()).unwrap().catch(() => null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}