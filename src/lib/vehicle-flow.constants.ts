/**
 * Vehicle Flow Constants and Role-Based Access Matrix
 * Production-ready configuration for all vehicle movement operations
 */

export type VehicleMovementStatus = 
  | 'expected'
  | 'gate_in_recorded'
  | 'inspection_verified'
  | 'inspection_rejected'
  | 'loading_in_progress'
  | 'loading_error'
  | 'unloading_in_progress'
  | 'unloaded_verified'
  | 'loading_completed'
  | 'transit_approved'
  | 'gate_out_recorded'
  | 'cancelled';

export type MovementAction = 
  | 'gate-in'
  | 'verify'
  | 'reject'
  | 'start-loading'
  | 'report-loading-error'
  | 'start-unloading'
  | 'verify-unloaded'
  | 'grant-reload'
  | 'complete-loading'
  | 'approve-transit'
  | 'gate-out'
  | 'reopen'
  | 'cancel';

export type OperationalRole = 
  | 'none'
  | 'branch_manager'
  | 'watchman'
  | 'inspection_officer'
  | 'admin';

export type UserRole = 
  | 'super_admin'
  | 'company_admin'
  | 'company_user'
  | 'transporter'
  | 'guest';

/**
 * Status Display Information
 */
export const MOVEMENT_STATUS_CONFIG: Record<VehicleMovementStatus, {
  label: string;
  color: string;
  icon: string;
  description: string;
  badge: string;
}> = {
  expected: {
    label: 'Expected',
    color: 'text-blue-600',
    icon: '🕐',
    description: 'Vehicle is scheduled to arrive',
    badge: 'bg-blue-100 text-blue-700'
  },
  gate_in_recorded: {
    label: 'Gate In',
    color: 'text-green-600',
    icon: '📥',
    description: 'Vehicle has entered the branch',
    badge: 'bg-green-100 text-green-700'
  },
  inspection_verified: {
    label: 'Verified',
    color: 'text-purple-600',
    icon: '✅',
    description: 'Inspection passed, vehicle verified',
    badge: 'bg-purple-100 text-purple-700'
  },
  inspection_rejected: {
    label: 'Rejected',
    color: 'text-red-600',
    icon: '❌',
    description: 'Inspection failed, awaiting action',
    badge: 'bg-red-100 text-red-700'
  },
  loading_in_progress: {
    label: 'Loading',
    color: 'text-amber-600',
    icon: '📦',
    description: 'Vehicle is currently being loaded',
    badge: 'bg-amber-100 text-amber-700'
  },
  loading_error: {
    label: 'Loading Error',
    color: 'text-rose-600',
    icon: '⚠️',
    description: 'Cargo/packing issue, requires unloading',
    badge: 'bg-rose-100 text-rose-700'
  },
  unloading_in_progress: {
    label: 'Unloading',
    color: 'text-orange-600',
    icon: '📤',
    description: 'Vehicle is being unloaded to correct issues',
    badge: 'bg-orange-100 text-orange-700'
  },
  unloaded_verified: {
    label: 'Unloaded Verified',
    color: 'text-indigo-600',
    icon: 'ℹ️',
    description: 'Vehicle unloaded, awaiting reload authorization',
    badge: 'bg-indigo-100 text-indigo-700'
  },
  loading_completed: {
    label: 'Loading Completed',
    color: 'text-emerald-600',
    icon: '🏁',
    description: 'Vehicle loaded, awaiting transit approval',
    badge: 'bg-emerald-100 text-emerald-700'
  },
  transit_approved: {
    label: 'Transit Approved',
    color: 'text-teal-600',
    icon: '🛣️',
    description: 'Transit approved, ready to gate out',
    badge: 'bg-teal-100 text-teal-700'
  },
  gate_out_recorded: {
    label: 'Gate Out',
    color: 'text-slate-600',
    icon: '📤',
    description: 'Vehicle has exited the branch',
    badge: 'bg-slate-100 text-slate-700'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-orange-600',
    icon: '🚫',
    description: 'Entry has been cancelled',
    badge: 'bg-orange-100 text-orange-700'
  }
};

/**
 * ROLE-BASED ACCESS CONTROL MATRIX
 * Defines which roles can perform which actions
 */
export const ROLE_ACTION_MATRIX: Record<OperationalRole, Record<VehicleMovementStatus, MovementAction[]>> = {
  admin: {
    expected: ['gate-in', 'cancel'],
    gate_in_recorded: ['verify', 'reject', 'cancel'],
    inspection_verified: ['gate-out', 'start-loading', 'reopen', 'cancel'],
    inspection_rejected: ['reopen', 'cancel'],
    loading_in_progress: ['complete-loading', 'report-loading-error', 'cancel'],
    loading_error: ['start-unloading', 'cancel'],
    unloading_in_progress: ['verify-unloaded', 'cancel'],
    unloaded_verified: ['grant-reload', 'cancel'],
    loading_completed: ['approve-transit', 'report-loading-error', 'cancel'],
    transit_approved: ['gate-out', 'cancel'],
    gate_out_recorded: [],
    cancelled: []
  },
  
  branch_manager: {
    expected: ['gate-in', 'cancel'],
    gate_in_recorded: ['verify', 'reject', 'cancel'],
    inspection_verified: ['gate-out', 'start-loading', 'reopen', 'cancel'],
    inspection_rejected: ['reopen', 'cancel'],
    loading_in_progress: ['complete-loading', 'report-loading-error', 'cancel'],
    loading_error: ['start-unloading', 'cancel'],
    unloading_in_progress: ['verify-unloaded', 'cancel'],
    unloaded_verified: ['grant-reload', 'cancel'],
    loading_completed: ['approve-transit', 'report-loading-error', 'cancel'],
    transit_approved: ['gate-out', 'cancel'],
    gate_out_recorded: [],
    cancelled: []
  },
  
  watchman: {
    expected: ['gate-in', 'cancel'],
    gate_in_recorded: [],
    inspection_verified: ['gate-out', 'cancel'],
    inspection_rejected: ['cancel'],
    loading_in_progress: [],
    loading_error: ['cancel'],
    unloading_in_progress: [],
    unloaded_verified: ['cancel'],
    loading_completed: [],
    transit_approved: ['gate-out', 'cancel'],
    gate_out_recorded: [],
    cancelled: []
  },
  
  inspection_officer: {
    expected: [],
    gate_in_recorded: ['verify', 'reject'],
    inspection_verified: ['gate-out', 'start-loading', 'reopen'],
    inspection_rejected: ['reopen'],
    loading_in_progress: ['complete-loading', 'report-loading-error'],
    loading_error: ['start-unloading'],
    unloading_in_progress: ['verify-unloaded'],
    unloaded_verified: ['grant-reload'],
    loading_completed: ['approve-transit', 'report-loading-error'],
    transit_approved: ['gate-out'],
    gate_out_recorded: [],
    cancelled: []
  },
  
  none: {
    expected: [],
    gate_in_recorded: [],
    inspection_verified: [],
    inspection_rejected: [],
    loading_in_progress: [],
    loading_error: [],
    unloading_in_progress: [],
    unloaded_verified: [],
    loading_completed: [],
    transit_approved: [],
    gate_out_recorded: [],
    cancelled: []
  }
};

/**
 * PERMISSION REQUIREMENTS FOR EACH ACTION
 */
export const ACTION_PERMISSION_MAP: Record<MovementAction, {
  permission: string;
  roles: OperationalRole[];
  requiresPhotos?: boolean;
  requiresChecks?: boolean;
  description: string;
}> = {
  'gate-in': {
    permission: 'branch.gate_in',
    roles: ['admin', 'branch_manager', 'watchman'],
    requiresPhotos: true,
    description: 'Record vehicle entry at gate'
  },
  
  verify: {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    requiresChecks: true,
    description: 'Verify vehicle inspection and approve'
  },
  
  reject: {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Reject vehicle inspection'
  },
  
  'start-loading': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Authorize vehicle to begin loading cargo'
  },

  'report-loading-error': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Record error/cargo issue during loading'
  },

  'start-unloading': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Authorize worker to unload vehicle'
  },

  'verify-unloaded': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    requiresPhotos: true,
    description: 'Confirm unloading is complete and upload empty vehicle photo'
  },

  'grant-reload': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Grant authorization to reload the vehicle'
  },

  'complete-loading': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    requiresPhotos: true,
    description: 'Complete cargo loading and upload loaded vehicle photos'
  },

  'approve-transit': {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Verify loading completeness and grant transit permission'
  },

  'gate-out': {
    permission: 'branch.gate_out',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    requiresPhotos: true,
    requiresChecks: true,
    description: 'Record vehicle exit at gate'
  },
  
  reopen: {
    permission: 'branch.inspect',
    roles: ['admin', 'branch_manager', 'inspection_officer'],
    description: 'Reopen rejected inspection for re-verification'
  },
  
  cancel: {
    permission: 'branch.gate_in',
    roles: ['admin', 'branch_manager', 'watchman'],
    description: 'Cancel vehicle entry'
  }
};

/**
 * USER ROLE TO OPERATIONAL ROLE MAPPING
 */
export const USER_ROLE_OPERATIONAL_ROLE_MAP: Record<UserRole, OperationalRole> = {
  super_admin: 'admin',
  company_admin: 'admin',
  company_user: 'branch_manager', // Company users need explicit assignment
  transporter: 'none',
  guest: 'none'
};

/**
 * FLOW PROGRESS STEPS
 */
export const FLOW_PROGRESS_STEPS: Array<{
  phase: string;
  step: number;
  title: string;
  action: MovementAction;
  description: string;
  icon: string;
  requiredStatus?: VehicleMovementStatus[];
}> = [
  {
    phase: 'entry',
    step: 1,
    title: 'Expected',
    action: 'gate-in',
    description: 'Vehicle scheduled',
    icon: '📋',
    requiredStatus: ['expected']
  },
  {
    phase: 'entry',
    step: 2,
    title: 'Gate In',
    action: 'gate-in',
    description: 'Record vehicle arrival',
    icon: '📥',
    requiredStatus: ['expected']
  },
  {
    phase: 'verification',
    step: 3,
    title: 'Inspection',
    action: 'verify',
    description: 'Verify documentation & vehicle',
    icon: '🔍',
    requiredStatus: ['gate_in_recorded']
  },
  {
    phase: 'verification',
    step: 4,
    title: 'Verified',
    action: 'verify',
    description: 'Inspection approved',
    icon: '✅',
    requiredStatus: ['inspection_verified']
  },
  {
    phase: 'exit',
    step: 5,
    title: 'Gate Out',
    action: 'gate-out',
    description: 'Record vehicle departure',
    icon: '📤',
    requiredStatus: ['inspection_verified']
  },
  {
    phase: 'exit',
    step: 6,
    title: 'Complete',
    action: 'gate-out',
    description: 'Movement complete',
    icon: '🏁',
    requiredStatus: ['gate_out_recorded']
  }
];

/**
 * VALIDATION RULES
 */
export const VALIDATION_CONFIG = {
  VEHICLE_NUMBER: {
    pattern: /^[A-Z]{2}\d{2}[A-Z]{0,2}\d{4}$/i,
    message: 'Vehicle number format: GJ01AB1234'
  },
  
  DRIVER_PHONE: {
    pattern: /^[6-9]\d{9}$/,
    pattern_alt: /^[\+]?[0-9+\-\s]{8,20}$/,
    message: 'Driver phone: Indian (10 digits) or international'
  },
  
  DESTINATION: {
    minLength: 3,
    maxLength: 180,
    message: 'Destination: 3-180 characters'
  },
  
  NOTES: {
    maxLength: 1000,
    message: 'Notes: maximum 1000 characters'
  },
  
  PHOTOS: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxPhotosPerPhase: 10,
    minPhotosPerPhase: 1,
    message: {
      fileSize: 'Photo must be <5MB',
      fileType: 'Allowed: JPEG, PNG, WebP',
      maxPhotos: 'Maximum 10 photos',
      minPhotos: 'Minimum 1 photo required'
    }
  }
};

/**
 * REQUIRED INSPECTION CHECKS BY PHASE
 */
export const REQUIRED_INSPECTION_CHECKS = {
  gateIn: [
    'checkedTransporter',
    'checkedVehicle',
    'checkedRoute',
    'checkedBid'
  ],
  
  verification: [
    'checkedTransporter',
    'checkedVehicle',
    'checkedRoute',
    'checkedBid',
    'rcBook',
    'insurance',
    'permit',
    'puc',
    'fitness',
    'driverLicense'
  ],
  
  gateOut: [
    'loadingComplete',
    'documentsReturned',
    'sealChecked',
    'exitApproved'
  ]
};

/**
 * ERROR MESSAGES
 */
export const ERROR_MESSAGES: Record<string, {
  title: string;
  message: string;
  action?: string;
}> = {
  // Permission errors
  NO_PERMISSION: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action'
  },
  
  NO_BRANCH_ASSIGNMENT: {
    title: 'Not Assigned',
    message: 'You must be assigned to a branch to perform this action'
  },
  
  // Validation errors
  INVALID_VEHICLE_NUMBER: {
    title: 'Invalid Vehicle Number',
    message: 'Please enter a valid vehicle number (e.g., GJ01AB1234)'
  },
  
  INVALID_PHONE: {
    title: 'Invalid Phone',
    message: 'Please enter a valid phone number'
  },
  
  MISSING_PHOTOS: {
    title: 'Photos Required',
    message: 'At least 1 photo is required for this action'
  },
  
  INCOMPLETE_CHECKS: {
    title: 'Incomplete Verification',
    message: 'Please complete all required checks before proceeding'
  },
  
  // Status errors
  INVALID_STATUS: {
    title: 'Invalid Status',
    message: 'This vehicle entry is not in a state that allows this action'
  },
  
  DUPLICATE_VEHICLE: {
    title: 'Duplicate Vehicle Entry',
    message: 'This vehicle already has an open entry at this branch'
  },
  
  DUPLICATE_LOAD_VEHICLE: {
    title: 'Vehicle Already Recorded',
    message: 'This vehicle is already recorded for this load'
  },
  
  LOAD_LIMIT_REACHED: {
    title: 'Vehicle Limit Reached',
    message: 'Maximum vehicles for this load have been recorded'
  },
  
  BID_EXPIRED: {
    title: 'Bid Expired',
    message: 'The bid associated with this entry has expired'
  },
  
  LOAD_NOT_SCHEDULED: {
    title: 'Load Not Scheduled',
    message: 'This load is not scheduled for today'
  },
  
  VEHICLE_MISMATCH: {
    title: 'Vehicle Mismatch',
    message: 'Vehicle number does not match the bid'
  },
  
  VERIFICATION_FAILED: {
    title: 'Verification Failed',
    message: 'Unable to verify vehicle details. Check all required fields.'
  },
  
  // Operation errors
  REQUEST_IN_PROGRESS: {
    title: 'Request In Progress',
    message: 'A request is already being processed. Please wait.',
    action: 'retry'
  },
  
  REQUEST_DUPLICATE: {
    title: 'Duplicate Request',
    message: 'This request was already processed',
    action: 'reload'
  },
  
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to server. Please try again.',
    action: 'retry'
  },
  
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'An unexpected error occurred. Please try again later.',
    action: 'report'
  }
};

/**
 * SUCCESS MESSAGES
 */
export const SUCCESS_MESSAGES: Record<MovementAction, {
  title: string;
  message: string;
}> = {
  'gate-in': {
    title: 'Vehicle Recorded',
    message: 'Vehicle entry has been recorded successfully'
  },
  
  verify: {
    title: 'Verified',
    message: 'Vehicle has been verified and approved'
  },
  
  reject: {
    title: 'Rejected',
    message: 'Vehicle inspection has been rejected'
  },
  
  'gate-out': {
    title: 'Exit Recorded',
    message: 'Vehicle exit has been recorded successfully'
  },
  
  reopen: {
    title: 'Reopened',
    message: 'Vehicle inspection has been reopened for re-verification'
  },
  
  cancel: {
    title: 'Cancelled',
    message: 'Vehicle entry has been cancelled'
  },
  'start-loading': {
    title: 'Loading Started',
    message: 'Vehicle has started loading cargo'
  },
  'report-loading-error': {
    title: 'Loading Error',
    message: 'Loading error has been recorded successfully'
  },
  'start-unloading': {
    title: 'Unloading Started',
    message: 'Vehicle unloading has started'
  },
  'verify-unloaded': {
    title: 'Unloaded Verified',
    message: 'Vehicle unloaded status has been verified'
  },
  'grant-reload': {
    title: 'Reload Authorized',
    message: 'Vehicle reload permission has been granted'
  },
  'complete-loading': {
    title: 'Loading Completed',
    message: 'Vehicle loading is completed with photo proof'
  },
  'approve-transit': {
    title: 'Transit Approved',
    message: 'Transit has been approved by manager'
  }
};

/**
 * Check if a role can perform an action in a given status
 */
export function canPerformAction(
  role: OperationalRole,
  status: VehicleMovementStatus,
  action: MovementAction
): boolean {
  const allowedActions = ROLE_ACTION_MATRIX[role]?.[status] || [];
  return allowedActions.includes(action);
}

/**
 * Get all available actions for a role and status
 */
export function getAvailableActions(
  role: OperationalRole,
  status: VehicleMovementStatus
): MovementAction[] {
  return ROLE_ACTION_MATRIX[role]?.[status] || [];
}

/**
 * Get permission requirement for an action
 */
export function getActionPermission(action: MovementAction): string {
  return ACTION_PERMISSION_MAP[action]?.permission || 'unknown';
}

/**
 * Get required roles for an action
 */
export function getActionRoles(action: MovementAction): OperationalRole[] {
  return ACTION_PERMISSION_MAP[action]?.roles || [];
}

/**
 * Get next possible statuses from current status
 */
export function getNextStatuses(
  currentStatus: VehicleMovementStatus,
  action: MovementAction
): VehicleMovementStatus[] {
  const transitions: Partial<Record<VehicleMovementStatus, Partial<Record<MovementAction, VehicleMovementStatus>>>> = {
    expected: {
      'gate-in': 'gate_in_recorded',
      cancel: 'cancelled',
    },
    gate_in_recorded: {
      verify: 'inspection_verified',
      reject: 'inspection_rejected',
      cancel: 'cancelled',
    },
    inspection_verified: {
      'start-loading': 'loading_in_progress',
      reopen: 'gate_in_recorded',
      cancel: 'cancelled',
    },
    inspection_rejected: {
      reopen: 'gate_in_recorded',
      cancel: 'cancelled',
    },
    loading_in_progress: {
      'complete-loading': 'loading_completed',
      'report-loading-error': 'loading_error',
      cancel: 'cancelled',
    },
    loading_error: {
      'start-unloading': 'unloading_in_progress',
      cancel: 'cancelled',
    },
    unloading_in_progress: {
      'verify-unloaded': 'unloaded_verified',
      cancel: 'cancelled',
    },
    unloaded_verified: {
      'grant-reload': 'inspection_verified',
      cancel: 'cancelled',
    },
    loading_completed: {
      'approve-transit': 'transit_approved',
      'report-loading-error': 'loading_error',
      cancel: 'cancelled',
    },
    transit_approved: {
      'gate-out': 'gate_out_recorded',
      cancel: 'cancelled',
    },
    gate_out_recorded: {},
    cancelled: {}
  };
  
  const nextStatus = transitions[currentStatus]?.[action];
  return nextStatus ? [nextStatus] : [];
}
