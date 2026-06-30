import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions';

export const usePermission = (permission: string): boolean => {
  const user = useSelector((state: RootState) => state.auth.user);
  return hasPermission(user, permission);
};

/**
 * Check if user has any of the given permissions
 * Useful for "OR" permission checks
 */
export const useAnyPermission = (permissions: string[]): boolean => {
  const user = useSelector((state: RootState) => state.auth.user);
  return hasAnyPermission(user, permissions);
};

/**
 * Check if user has all of the given permissions
 * Useful for "AND" permission checks
 */
export const useAllPermissions = (permissions: string[]): boolean => {
  const user = useSelector((state: RootState) => state.auth.user);
  return hasAllPermissions(user, permissions);
};
