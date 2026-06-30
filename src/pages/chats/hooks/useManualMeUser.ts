import { useEffect, useMemo, useState } from 'react'
import { getMe } from '@/api/services/auth'

import { useAppSelector } from '@/store'

type MeProfile = {
  _id?: string
  id?: string
  firstName?: string
  lastName?: string
  avatar?: string
  isOnline?: boolean
  username?: string
  email?: string
}

export function useManualMeUser() {
  const authUser = useAppSelector((s) => s.auth.user) as any | null
  const [me, setMe] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const profile = (await getMe()) as unknown as MeProfile
        if (!cancelled) setMe(profile)
      } catch {
        if (!cancelled) {
          setMe({
            _id: authUser?.id || authUser?._id,
            id: authUser?.id || authUser?._id,
            email: authUser?.email,
            firstName: (authUser as any)?.firstName || (authUser as any)?.name?.split(' ')[0],
            lastName: (authUser as any)?.lastName || (authUser as any)?.name?.split(' ')[1],
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authUser?.id, authUser?._id])

  const meUserId = useMemo(() => {
    const id = me?._id || me?.id
    return id ? String(id) : ''
  }, [me])

  const senderName = useMemo(() => {
    const firstName = me?.firstName?.trim()
    const lastName = me?.lastName?.trim()

    const full = [firstName, lastName].filter(Boolean).join(' ')
    if (full) return full

    if (me?.username) return String(me.username)
    if (me?.email) return String(me.email).split('@')[0]
    return 'User'
  }, [me])

  const profileImage = useMemo(() => {
    return me?.avatar ? String(me.avatar) : ''
  }, [me])

  return {
    meUserId,
    senderName,
    profileImage,
    isOnline: !!me?.isOnline,
    loading,
  }
}