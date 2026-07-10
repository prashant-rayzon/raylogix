import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAppSelector } from '@/store'

interface RedirectIfAuthProps {
  children: ReactNode
}

export default function RedirectIfAuth({ children }: RedirectIfAuthProps) {
  const auth = useAppSelector((s) => s.auth)
  if (auth.user) {
    return <Navigate to='/dashboard' replace />
  }

  return <>{children}</>
}

