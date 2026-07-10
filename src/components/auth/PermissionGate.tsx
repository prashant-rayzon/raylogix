import React from 'react';
import { useAnyPermission, usePermission } from '@/lib/hooks/usePermission';
import { useRole } from '@/lib/hooks/useRole';
import type { UserRole } from '@/api/types';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: string;
  /** Array of permissions - at least one must match (OR logic) */
  permissions?: string[];
  /** Single role to check */
  role?: UserRole;
  /** Array of roles - at least one must match (OR logic) */
  roles?: UserRole[];
  /** Fallback UI to show if user doesn't have permission */
  fallback?: React.ReactNode;
  /** Custom error message for accessibility */
  fallbackMessage?: string;
  /** Whether to show nothing or custom fallback */
  hideOnDenied?: boolean;
  children: React.ReactNode;
}

/**
 * PermissionGate - Controls rendering based on permissions and roles
 *
 * @example
 * // Check single permission
 * <PermissionGate permission="load.create">
 *   <Button>Create Load</Button>
 * </PermissionGate>
 *
 * @example
 * // Check multiple permissions (any)
 * <PermissionGate permissions={["load.create", "load.manage"]}>
 *   <Button>Create Load</Button>
 * </PermissionGate>
 *
 * @example
 * // Check role
 * <PermissionGate role="company_admin">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Check multiple roles (any)
 * <PermissionGate roles={["super_admin", "company_admin"]}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // With fallback UI
 * <PermissionGate
 *   permission="load.create"
 *   fallback={<span className="text-gray-400">Not allowed</span>}
 * >
 *   <Button>Create Load</Button>
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  fallbackMessage,
  hideOnDenied = false,
  children,
}) => {
  const hasPermission = permission ? usePermission(permission) : true;
  const hasAnyPermission = permissions ? useAnyPermission(permissions) : true;
  const hasRole = role ? useRole(role) : true;
  const hasAnyRole = roles ? useRole(...roles) : true;

  const canRender = hasPermission && hasAnyPermission && hasRole && hasAnyRole;

  if (!canRender) {
    // For accessibility, optionally render the fallback message
    if (fallbackMessage && !hideOnDenied) {
      return (
        <div 
          title={fallbackMessage}
          role="status"
          className="text-sm text-destructive"
        >
          {fallback}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGate;
