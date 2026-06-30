import { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import type { RootState } from '@/store'
import { hasPermission, hasAnyPermission, isAdmin, isSuperAdmin } from '@/lib/permissions'
import GeneralError from '@/pages/errors/general-error'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: string
  requiredPermissions?: string[] // All permissions required
  requiredAnyPermission?: string[] // Any of these permissions required
  requiredRole?: string
  requireAdmin?: boolean
  fallbackPath?: string
}

/**
 * PermissionGate - Render content only if user has required permission
 */
export const PermissionGate = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredAnyPermission,
  fallbackPath = '/unauthorized',
  fallback,
}: ProtectedRouteProps & { fallback?: ReactNode }) => {
  const user = useSelector((state: RootState) => state.auth.user)

  // Check single permission
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return fallback || <Navigate to={fallbackPath} replace />
  }

  // Check all permissions
  if (requiredPermissions) {
    const hasAll = requiredPermissions.every((perm) => hasPermission(user, perm))
    if (!hasAll) {
      return fallback || <Navigate to={fallbackPath} replace />
    }
  }

  // Check any permission
  if (requiredAnyPermission && !hasAnyPermission(user, requiredAnyPermission)) {
    return fallback || <Navigate to={fallbackPath} replace />
  }

  return children
}

/**
 * ProtectedRoute - Guard entire route with permissions
 */
export const ProtectedRoute = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredAnyPermission,
  requiredRole,
  requireAdmin,
}: ProtectedRouteProps) => {
  const user = useSelector((state: RootState) => state.auth.user)

  // Check admin requirement
  if (requireAdmin && !isAdmin(user)) {
    return <GeneralError />
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole) {
    return <GeneralError />
  }

  // Check single permission
  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <GeneralError />
  }

  // Check all permissions
  if (requiredPermissions) {
    const hasAll = requiredPermissions.every((perm) => hasPermission(user, perm))
    if (!hasAll) {
      return <GeneralError />
    }
  }

  // Check any permission
  if (requiredAnyPermission && !hasAnyPermission(user, requiredAnyPermission)) {
    return <GeneralError />
  }

  return <>{children}</>
}

/**
 * RoleGate - Render content only if user has required role
 */
export const RoleGate = ({
  children,
  requiredRole,
  fallback,
}: {
  children: ReactNode
  requiredRole: string
  fallback?: ReactNode
}) => {
  const user = useSelector((state: RootState) => state.auth.user)

  if (user?.role !== requiredRole) {
    return fallback || null
  }

  return children
}

/**
 * AdminGate - Render content only if user is admin
 */
export const AdminGate = ({
  children,
  fallback,
}: {
  children: ReactNode
  fallback?: ReactNode
}) => {
  const user = useSelector((state: RootState) => state.auth.user)

  if (!isAdmin(user)) {
    return fallback || null
  }

  return children
}

/**
 * SuperAdminGate - Render content only if user is super admin
 */
export const SuperAdminGate = ({
  children,
  fallback,
}: {
  children: ReactNode
  fallback?: ReactNode
}) => {
  const user = useSelector((state: RootState) => state.auth.user)

  if (!isSuperAdmin(user)) {
    return fallback || null
  }

  return children
}
