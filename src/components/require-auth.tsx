import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAppSelector } from '@/store'

interface RequireAuthProps {
  children: ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const auth = useAppSelector((s) => s.auth)

  if (!auth.user) {
    return <Navigate to='/sign-in' state={{ from: location }} replace />
  }

  return <>{children}</>
}

