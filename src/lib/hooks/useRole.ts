import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { UserRole } from '@/api/types';

export const useRole = (...roles: UserRole[]): boolean => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) return false;

  return roles.includes(user.role);
};