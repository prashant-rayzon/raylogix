/**
 * Permission management utilities for Rayson TMS
 * Handles role-based and permission-based access control
 */

import type { UserRole, AuthUser } from '@/api/types';

/**
 * All available permissions in the system
 */
export const ALL_PERMISSIONS = {
  // Company Management
  COMPANY_READ: 'company.read',
  COMPANY_WRITE: 'company.write',
  COMPANY_CREATE: 'company.create',
  COMPANY_DELETE: 'company.delete',
  MASTER_READ: 'master.read',
  MASTER_WRITE: 'master.write',
  MASTER_CREATE: 'master.create',
  MASTER_GROUP_READ: 'master_group.read',
  MASTER_GROUP_WRITE: 'master_group.write',
  MASTER_GROUP_CREATE: 'master_group.create',

  // Tenant Management
  TENANT_MANAGE: 'tenant.manage',

  // User Management
  USER_READ: 'user.read',
  USER_INVITE: 'user.invite',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DEACTIVATE: 'user.deactivate',
  USER_DELETE: 'user.delete',

  // Branch Operations
  BRANCH_READ: 'branch.read',
  BRANCH_CREATE: 'branch.create',
  BRANCH_UPDATE: 'branch.update',
  BRANCH_ASSIGN_STAFF: 'branch.assign_staff',
  BRANCH_MOVEMENT_CREATE: 'branch.movement.create',
  BRANCH_GATE_IN: 'branch.gate_in',
  BRANCH_INSPECT: 'branch.inspect',
  BRANCH_GATE_OUT: 'branch.gate_out',

  // Role Management
  ROLE_MANAGE: 'role.manage',

  // Load Management
  LOAD_READ: 'load.read',
  LOAD_WRITE: 'load.write',
  LOAD_CREATE: 'load.create',
  LOAD_UPDATE: 'load.update',
  LOAD_DELETE: 'load.delete',
  LOAD_MANAGE: 'load.manage', // Full control
  LOAD_ASSIGN: 'load.assign', // Assign bids/winners
  LOAD_CANCEL: 'load.cancel', // Cancel loads

  // Outbound Load Management
  OUTBOUND_READ: 'outbound.read',
  OUTBOUND_CREATE: 'outbound.create',
  OUTBOUND_UPDATE: 'outbound.update',
  OUTBOUND_DELETE: 'outbound.delete',

  // Inbound Load Management
  INBOUND_READ: 'inbound.read',
  INBOUND_CREATE: 'inbound.create',
  INBOUND_UPDATE: 'inbound.update',
  INBOUND_DELETE: 'inbound.delete',

  // Bid Management
  BID_READ: 'bid.read',
  BID_CREATE: 'bid.create',
  BID_UPDATE: 'bid.update',
  BID_DELETE: 'bid.delete',
  BID_ACCEPT: 'bid.accept',

  // Chat
  CHAT_CREATE: 'chat.create',
  CHAT_READ: 'chat.read',
  CHAT_UPDATE: 'chat.update',
  CHAT_DELETE: 'chat.delete',

  // Transporter Management
  TRANSPORTER_READ: 'transporter.read',
  TRANSPORTER_WRITE: 'transporter.write',
  TRANSPORTER_CREATE: 'transporter.create',
  TRANSPORTER_UPDATE: 'transporter.update',

  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_MANAGE: 'billing.manage',

  // Reports
  REPORT_VIEW: 'report.view',

  // Audit & System
  AUDIT_VIEW: 'audit.view',
  SYSTEM_MANAGE: 'system.manage',
} as const;

/**
 * Define role hierarchy and default permissions
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    // All permissions
    ALL_PERMISSIONS.COMPANY_READ,
    ALL_PERMISSIONS.COMPANY_WRITE,
    ALL_PERMISSIONS.COMPANY_CREATE,
    ALL_PERMISSIONS.COMPANY_DELETE,
    ALL_PERMISSIONS.TENANT_MANAGE,
    ALL_PERMISSIONS.USER_READ,
    ALL_PERMISSIONS.USER_INVITE,
    ALL_PERMISSIONS.USER_CREATE,
    ALL_PERMISSIONS.USER_UPDATE,
    ALL_PERMISSIONS.USER_DEACTIVATE,
    ALL_PERMISSIONS.USER_DELETE,
    ALL_PERMISSIONS.BRANCH_READ,
    ALL_PERMISSIONS.BRANCH_CREATE,
    ALL_PERMISSIONS.BRANCH_UPDATE,
    ALL_PERMISSIONS.BRANCH_ASSIGN_STAFF,
    ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE,
    ALL_PERMISSIONS.BRANCH_GATE_IN,
    ALL_PERMISSIONS.BRANCH_INSPECT,
    ALL_PERMISSIONS.BRANCH_GATE_OUT,
    ALL_PERMISSIONS.ROLE_MANAGE,
    ALL_PERMISSIONS.LOAD_READ,
    ALL_PERMISSIONS.LOAD_WRITE,
    ALL_PERMISSIONS.LOAD_CREATE,
    ALL_PERMISSIONS.LOAD_UPDATE,
    ALL_PERMISSIONS.LOAD_DELETE,
    ALL_PERMISSIONS.LOAD_MANAGE,
    ALL_PERMISSIONS.LOAD_ASSIGN,
    ALL_PERMISSIONS.LOAD_CANCEL,
    ALL_PERMISSIONS.OUTBOUND_READ,
    ALL_PERMISSIONS.OUTBOUND_CREATE,
    ALL_PERMISSIONS.OUTBOUND_UPDATE,
    ALL_PERMISSIONS.OUTBOUND_DELETE,
    ALL_PERMISSIONS.INBOUND_READ,
    ALL_PERMISSIONS.INBOUND_CREATE,
    ALL_PERMISSIONS.INBOUND_UPDATE,
    ALL_PERMISSIONS.INBOUND_DELETE,
    ALL_PERMISSIONS.TRANSPORTER_READ,
    ALL_PERMISSIONS.TRANSPORTER_WRITE,
    ALL_PERMISSIONS.TRANSPORTER_CREATE,
    ALL_PERMISSIONS.TRANSPORTER_UPDATE,
    ALL_PERMISSIONS.BILLING_VIEW,
    ALL_PERMISSIONS.BILLING_MANAGE,
    ALL_PERMISSIONS.REPORT_VIEW,
    ALL_PERMISSIONS.AUDIT_VIEW,
    ALL_PERMISSIONS.SYSTEM_MANAGE,
  ],
  company_admin: [
    ALL_PERMISSIONS.MASTER_READ,
    ALL_PERMISSIONS.MASTER_WRITE,
    ALL_PERMISSIONS.MASTER_CREATE,
    ALL_PERMISSIONS.MASTER_GROUP_READ,
    ALL_PERMISSIONS.MASTER_GROUP_WRITE,
    ALL_PERMISSIONS.MASTER_GROUP_CREATE,
    // User Management
    ALL_PERMISSIONS.USER_READ,
    ALL_PERMISSIONS.USER_INVITE,
    ALL_PERMISSIONS.USER_CREATE,
    ALL_PERMISSIONS.USER_UPDATE,
    ALL_PERMISSIONS.USER_DEACTIVATE,
    ALL_PERMISSIONS.ROLE_MANAGE,
    ALL_PERMISSIONS.BRANCH_READ,
    ALL_PERMISSIONS.BRANCH_CREATE,
    ALL_PERMISSIONS.BRANCH_UPDATE,
    ALL_PERMISSIONS.BRANCH_ASSIGN_STAFF,
    ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE,
    ALL_PERMISSIONS.BRANCH_GATE_IN,
    ALL_PERMISSIONS.BRANCH_INSPECT,
    ALL_PERMISSIONS.BRANCH_GATE_OUT,
    // Load Management
    ALL_PERMISSIONS.LOAD_READ,
    ALL_PERMISSIONS.LOAD_WRITE,
    ALL_PERMISSIONS.LOAD_CREATE,
    ALL_PERMISSIONS.LOAD_UPDATE,
    ALL_PERMISSIONS.LOAD_DELETE,
    ALL_PERMISSIONS.LOAD_MANAGE,
    ALL_PERMISSIONS.LOAD_ASSIGN,
    ALL_PERMISSIONS.LOAD_CANCEL,
    // Outbound & Inbound
    ALL_PERMISSIONS.OUTBOUND_READ,
    ALL_PERMISSIONS.OUTBOUND_CREATE,
    ALL_PERMISSIONS.OUTBOUND_UPDATE,
    ALL_PERMISSIONS.OUTBOUND_DELETE,
    ALL_PERMISSIONS.INBOUND_READ,
    ALL_PERMISSIONS.INBOUND_CREATE,
    ALL_PERMISSIONS.INBOUND_UPDATE,
    ALL_PERMISSIONS.INBOUND_DELETE,
    // Transporter Management
    ALL_PERMISSIONS.TRANSPORTER_READ,
    ALL_PERMISSIONS.TRANSPORTER_WRITE,
    ALL_PERMISSIONS.TRANSPORTER_CREATE,
    ALL_PERMISSIONS.TRANSPORTER_UPDATE,
    // Reports & Billing
    ALL_PERMISSIONS.REPORT_VIEW,
    ALL_PERMISSIONS.BILLING_VIEW,
  ],
  company_user: [
    // Read-only access + load creation
    ALL_PERMISSIONS.MASTER_READ,
    ALL_PERMISSIONS.MASTER_GROUP_READ,
    ALL_PERMISSIONS.USER_READ,
    ALL_PERMISSIONS.REPORT_VIEW,
    ALL_PERMISSIONS.BRANCH_READ,
    ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE,
    ALL_PERMISSIONS.BRANCH_GATE_IN,
    ALL_PERMISSIONS.BRANCH_INSPECT,
    ALL_PERMISSIONS.BRANCH_GATE_OUT,
    ALL_PERMISSIONS.LOAD_READ,
    ALL_PERMISSIONS.LOAD_CREATE,
    ALL_PERMISSIONS.LOAD_UPDATE,
    ALL_PERMISSIONS.OUTBOUND_READ,
    ALL_PERMISSIONS.OUTBOUND_CREATE,
    ALL_PERMISSIONS.INBOUND_READ,
    ALL_PERMISSIONS.INBOUND_UPDATE,
    ALL_PERMISSIONS.TRANSPORTER_READ,
  ],
  transporter: [
    // Load Viewing (only available loads)
    ALL_PERMISSIONS.LOAD_READ,
    // Bid Management
    ALL_PERMISSIONS.BID_CREATE,
    // Bid Update
    ALL_PERMISSIONS.BID_UPDATE,
    ALL_PERMISSIONS.BID_DELETE,
  ],
  finance: [
    'company.read',
    'load.read',
    'billing.read',
    'billing.verify',
    'billing.approve',
    'billing.reject',
  ],
};

/**
 * Check if a user has a specific permission
 * @param user - The user to check (can be null for public access)
 * @param permission - The permission to check
 * @returns true if user has permission, false otherwise
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return user.permissions?.includes(permission) ? true : false;
}

/**
 * Check if a user has any of the given permissions
 * @param user - The user to check
 * @param permissions - Array of permissions (at least one must match)
 * @returns true if user has any permission, false otherwise
 */
export function hasAnyPermission(
  user: AuthUser | null,
  permissions: string[]
): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has all of the given permissions
 * @param user - The user to check
 * @param permissions - Array of permissions (all must match)
 * @returns true if user has all permissions, false otherwise
 */
export function hasAllPermissions(
  user: AuthUser | null,
  permissions: string[]
): boolean {
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has a specific role
 * @param user - The user to check
 * @param role - The role to check (single role)
 * @returns true if user has the role, false otherwise
 */
export function hasRole(user: AuthUser | null, role: UserRole): boolean {
  return user?.role === role;
}

/**
 * Check if a user has any of the given roles
 * @param user - The user to check
 * @param roles - Array of roles (at least one must match)
 * @returns true if user has any role, false otherwise
 */
export function hasAnyRole(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Check if a user is Super Admin
 */
export function isSuperAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'super_admin');
}

/**
 * Check if a user is Company Admin
 */
export function isCompanyAdmin(user: AuthUser | null): boolean {
  return hasRole(user, 'company_admin');
}

/**
 * Check if a user is Company User
 */
export function isCompanyUser(user: AuthUser | null): boolean {
  return hasRole(user, 'company_user');
}

/**
 * Check if a user is an admin (Super Admin or Company Admin)
 */
export function isAdmin(user: AuthUser | null): boolean {
  return hasAnyRole(user, ['super_admin', 'company_admin']);
}

/**
 * Get all permissions for a user
 * @param user - The user
 * @returns Array of all permissions the user has
 */
export function getUserPermissions(user: AuthUser | { role: UserRole; permissions?: string[] } | null): string[] {
  if (!user) return [];

  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  const customPerms = user.permissions || [];

  // Combine and deduplicate
  return Array.from(new Set([...rolePerms, ...customPerms]));
}

/**
 * Get user role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    super_admin: 'Super Administrator',
    company_admin: 'Company Administrator',
    company_user: 'Company User',
    transporter: 'Transporter',
    finance: 'Finance Auditor',
  };
  return names[role] || role;
}

/**
 * Check if a permission is load-related
 */
export function isLoadPermission(permission: string): boolean {
  return permission.startsWith('load.');
}

/**
 * Check if a permission is user-related
 */
export function isUserPermission(permission: string): boolean {
  return permission.startsWith('user.');
}

/**
 * Get all load-related permissions
 */
export function getLoadPermissions(): string[] {
  return Object.values(ALL_PERMISSIONS).filter((p) => p.startsWith('load.'));
}

/**
 * Get all user-related permissions
 */
export function getUserPermissionsList(): string[] {
  return Object.values(ALL_PERMISSIONS).filter((p) => p.startsWith('user.'));
}

export const PERMISSION_GROUPS: Array<{
  key: string;
  label: string;
  permissions: string[];
}> = [
    {
      key: 'users',
      label: 'Users',
      permissions: [
        ALL_PERMISSIONS.USER_READ,
        ALL_PERMISSIONS.USER_CREATE,
        ALL_PERMISSIONS.USER_UPDATE,
        ALL_PERMISSIONS.USER_DEACTIVATE,
      ],
    },
    {
      key: 'branches',
      label: 'Branches',
      permissions: [
        ALL_PERMISSIONS.BRANCH_READ,
        ALL_PERMISSIONS.BRANCH_CREATE,
        ALL_PERMISSIONS.BRANCH_UPDATE,
        ALL_PERMISSIONS.BRANCH_ASSIGN_STAFF,
      ],
    },
    {
      key: 'branch_flow',
      label: 'Branch Flow',
      permissions: [
        ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE,
        ALL_PERMISSIONS.BRANCH_GATE_IN,
        ALL_PERMISSIONS.BRANCH_INSPECT,
        ALL_PERMISSIONS.BRANCH_GATE_OUT,
      ],
    },
    {
      key: 'loads',
      label: 'Loads',
      permissions: [
        ALL_PERMISSIONS.LOAD_READ,
        ALL_PERMISSIONS.LOAD_CREATE,
        ALL_PERMISSIONS.LOAD_UPDATE,
        ALL_PERMISSIONS.LOAD_DELETE,
      ],
    },
    {
      key: 'transporters',
      label: 'Transporters',
      permissions: [
        ALL_PERMISSIONS.TRANSPORTER_READ,
        ALL_PERMISSIONS.TRANSPORTER_CREATE,
        ALL_PERMISSIONS.TRANSPORTER_UPDATE,
      ],
    },
    {
      key: 'bids',
      label: 'Bids',
      permissions: [
        ALL_PERMISSIONS.BID_READ,
        ALL_PERMISSIONS.BID_CREATE,
        ALL_PERMISSIONS.BID_UPDATE,
        ALL_PERMISSIONS.BID_DELETE,
      ],
    },
    {
      key: 'chat',
      label: 'Chat',
      permissions: [
        ALL_PERMISSIONS.CHAT_READ,
        ALL_PERMISSIONS.CHAT_CREATE,
        ALL_PERMISSIONS.CHAT_UPDATE,
        ALL_PERMISSIONS.CHAT_DELETE,
      ],
    },
    {
      key: 'reports',
      label: 'Reports',
      permissions: [
        ALL_PERMISSIONS.REPORT_VIEW,
        ALL_PERMISSIONS.AUDIT_VIEW,
        ALL_PERMISSIONS.BILLING_VIEW,
        ALL_PERMISSIONS.BILLING_MANAGE,
      ],
    },
  ];

export function getAssignablePermissionsForRole(
  role: UserRole,
  currentPermissions: string[] = []
): Set<string> {
  const roleDefaults = ROLE_PERMISSIONS[role] || [];
  return new Set([...roleDefaults, ...currentPermissions]);
}

