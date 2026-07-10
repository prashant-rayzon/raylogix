import { createContext, useContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { AuthUser } from '@/api/types';

interface BranchContextValue {
  currentBranchId: string | null;
  isBranchStaff: boolean;
  canAccessBranch: (branchId: string) => boolean;
  getBranchFilter: () => { branchId?: string } | Record<string, never>;
  hasPermission: (permission: string) => boolean;
  canManageBranches: boolean;
  canRecordGate: boolean;
  canInspect: boolean;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user) as AuthUser | null;
  
  const value: BranchContextValue = {
    // Branch staff have a fixed branch, admins can access all
    currentBranchId: user?.branchId || null,
    
    isBranchStaff: user?.accessLevel?.isBranchStaff || false,
    
    // Check if user can access a specific branch
    canAccessBranch: (branchId: string) => {
      if (!user) return false;
      if (user.accessLevel?.isAdmin) return true;
      if (user.branchId === branchId) return true;
      return false;
    },
    
    // Get filter for API requests (auto-adds branchId for branch staff)
    getBranchFilter: () => {
      if (!user) return {};
      if (user.accessLevel?.isAdmin) return {};
      if (user.branchId) return { branchId: user.branchId };
      return {};
    },
    
    // Check if user has a specific permission flag
    hasPermission: (permission: string) => {
      if (!user?.accessLevel) return false;
      return (user.accessLevel as any)[permission] || false;
    },
    
    // Quick access to common permissions
    canManageBranches: user?.accessLevel?.canManageBranches || false,
    canRecordGate: user?.accessLevel?.canRecordGate || false,
    canInspect: user?.accessLevel?.canInspect || false,
  };
  
  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
}

// Helper functions for use outside React components
export const isBranchStaff = (user: AuthUser | null): boolean => {
  return user?.accessLevel?.isBranchStaff || false;
};

export const getUserBranchId = (user: AuthUser | null): string | null => {
  return user?.branchId || null;
};

export const canAccessBranch = (user: AuthUser | null, branchId: string): boolean => {
  if (!user) return false;
  if (user.accessLevel?.isAdmin) return true;
  if (user.branchId === branchId) return true;
  return false;
};
