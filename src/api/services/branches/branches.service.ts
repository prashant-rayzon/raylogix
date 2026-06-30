import client from '@/api/client';

export type BranchStatus = 'active' | 'inactive';
export type OperationalRole = 'none' | 'branch_manager' | 'watchman' | 'inspection_officer';
export type VehicleRequestType = 'outbound' | 'inbound';
export type VehicleMovementStatus =
  | 'expected'
  | 'gate_in_recorded'
  | 'inspection_verified'
  | 'inspection_rejected'
  | 'gate_out_recorded'
  | 'cancelled';

export interface Branch {
  _id: string;
  name: string;
  code: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  gstNumber?: string;
  phone?: string;
  email?: string;
  contactPerson?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  managerUserId?: string | {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  managerName?: string;
  status: BranchStatus;
}

export interface BranchUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  branchId?: string;
  operationalRole?: OperationalRole;
  currentAssignment?: {
    _id: string;
    branchId: string;
    branchName: string;
    operationalRole: OperationalRole;
  } | null;
}

export interface BranchStaffAssignment {
  _id: string;
  branchId: string;
  branch?: {
    _id: string;
    name: string;
    code: string;
    status: BranchStatus;
  };
  userId: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    isActive?: boolean;
  };
  operationalRole: OperationalRole;
  status: 'active' | 'inactive';
  assignedAt: string;
  notes?: string;
}

export interface BranchTransporter {
  _id: string;
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
}

export interface BranchAcceptedBid {
  _id: string;
  loadId: string;
  transporterId?: string | BranchTransporter;
  bidAmount?: number;
  currency?: string;
  allocatedVehicles?: number;
  remainingAllocatedVehicles?: number;
  finalRate?: number;
  allocationStatus?: string;
  estimatedPickupDate?: string;
  estimatedDeliveryDate?: string;
  vehicleDetails?: {
    vehicleNumber?: string;
    vehicleType?: string;
    capacity?: number;
  };
  driverDetails?: {
    driverName?: string;
    mobile?: string;
    licenseNumber?: string;
  };
}

export interface BranchAssignedLoad {
  _id: string;
  loadNumber: string;
  material?: string;
  vehicleType?: string;
  numberOfVehicles?: number;
  status: string;
  pickupDate?: string;
  deliveryDate?: string;
  pickupLocation?: { address?: string; city?: string };
  deliveryLocation?: { address?: string; city?: string };
  allocations?: Array<{
    transporterId?: string | BranchTransporter;
    bidId?: string;
    allocatedVehicles?: number;
    finalRate?: number;
    status?: string;
  }>;
  assignedTransporter?: string | BranchTransporter;
  acceptedBids?: BranchAcceptedBid[];
  bidWinningPrice?: number;
  activeVehicleEntries?: number;
  remainingVehicleSlots?: number;
}

export interface VehicleMovement {
  _id: string;
  branchId: string | Branch;
  transporterId?: string | BranchTransporter;
  transporterName: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  fromDestination?: string;
  toDestination: string;
  requestType?: VehicleRequestType;
  purpose: string;
  loadId?: string | { _id: string; loadNumber?: string; material?: string; status?: string };
  bidId?: string | { _id: string; bidAmount?: number; currency?: string; status?: string };
  expectedAt?: string;
  status: VehicleMovementStatus;
  referenceSnapshot?: {
    loadNumber?: string;
    bidAmount?: number;
    currency?: string;
    vehicleType?: string;
    numberOfVehicles?: number;
    expectedVehicleNumber?: string;
    expectedDriverName?: string;
    expectedDriverPhone?: string;
    expectedTransporterName?: string;
    pickup?: string;
    delivery?: string;
    pickupDate?: string;
    deliveryDate?: string;
    requestType?: VehicleRequestType;
  };
  gateIn?: { recordedAt?: string; notes?: string };
  inspection?: {
    status?: 'pending' | 'verified' | 'rejected';
    verifiedAt?: string;
    notes?: string;
    checkedTransporter?: boolean;
    checkedVehicle?: boolean;
    checkedRoute?: boolean;
    checkedBid?: boolean;
    documents?: {
      rcBook?: boolean;
      insurance?: boolean;
      permit?: boolean;
      puc?: boolean;
      fitness?: boolean;
      driverLicense?: boolean;
    };
    verificationSummary?: {
      transporterMatched?: boolean;
      vehicleMatched?: boolean;
      driverMatched?: boolean;
      routeMatched?: boolean;
      bidMatched?: boolean;
    };
  };
  gateOut?: {
    recordedAt?: string;
    notes?: string;
    checks?: {
      loadingComplete?: boolean;
      documentsReturned?: boolean;
      sealChecked?: boolean;
      exitApproved?: boolean;
    };
  };
  createdAt: string;
}

export interface BranchFormData {
  name: string;
  code: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  contactPerson?: Branch['contactPerson'];
  address?: Branch['address'];
  status?: BranchStatus;
}

export interface VehicleMovementFormData {
  branchId: string;
  requestType?: VehicleRequestType;
  transporterId?: string;
  loadId?: string;
  bidId?: string;
  transporterName?: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  fromDestination?: string;
  toDestination: string;
  purpose?: string;
  expectedAt?: string;
}

export const branchesService = {
  async list(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const response = await client.get('/admin/branches', { params });
    return response.data as { branches: Branch[]; pagination: any };
  },

  async create(data: BranchFormData) {
    const response = await client.post('/admin/branches', data);
    return response.data.branch as Branch;
  },

  async update(id: string, data: BranchFormData) {
    const response = await client.put(`/admin/branches/${id}`, data);
    return response.data.branch as Branch;
  },

  async assignUser(data: { branchId: string; userId: string; operationalRole: OperationalRole }) {
    const response = await client.post('/admin/branches/staff/assignments', data);
    return response.data.assignment as BranchStaffAssignment;
  },

  async getLookups(params?: { requestType?: VehicleRequestType; branchId?: string }) {
    const response = await client.get('/admin/branches/lookups', { params });
    return response.data as {
      branches: Branch[];
      transporters: BranchTransporter[];
      assignedLoads: BranchAssignedLoad[];
    };
  },

  async listAssignableUsers(params?: { page?: number; limit?: number; search?: string }) {
    const response = await client.get('/admin/branches/staff/candidates', { params });
    return response.data as { items: BranchUser[]; pagination: any };
  },

  async listStaffAssignments(params?: { page?: number; limit?: number; branchId?: string; operationalRole?: OperationalRole; search?: string }) {
    const response = await client.get('/admin/branches/staff/assignments', { params });
    return response.data as { items: BranchStaffAssignment[]; pagination: any };
  },

  async unassignUser(assignmentId: string) {
    const response = await client.delete(`/admin/branches/staff/assignments/${assignmentId}`);
    return response.data as { result: { _id: string } };
  },

  async listMovements(params?: {
    page?: number;
    limit?: number;
    branchId?: string;
    status?: string;
    requestType?: VehicleRequestType;
    loadId?: string;
    bidId?: string;
    transporterId?: string;
    vehicleNumber?: string;
    search?: string;
  }) {
    const response = await client.get('/admin/branches/vehicle-movements', { params });
    return response.data as { movements: VehicleMovement[]; pagination: any };
  },

  async createMovement(data: VehicleMovementFormData) {
    const response = await client.post('/admin/branches/vehicle-movements', data);
    return response.data.movement as VehicleMovement;
  },

  async gateIn(id: string, notes?: string) {
    const response = await client.patch(`/admin/branches/vehicle-movements/${id}/gate-in`, { notes });
    return response.data.movement as VehicleMovement;
  },

  async inspect(id: string, data: {
    status: 'verified' | 'rejected';
    notes?: string;
    checkedTransporter?: boolean;
    checkedVehicle?: boolean;
    checkedRoute?: boolean;
    checkedBid?: boolean;
    documents?: {
      rcBook?: boolean;
      insurance?: boolean;
      permit?: boolean;
      puc?: boolean;
      fitness?: boolean;
      driverLicense?: boolean;
    };
  }) {
    const response = await client.patch(`/admin/branches/vehicle-movements/${id}/inspect`, data);
    return response.data.movement as VehicleMovement;
  },

  async gateOut(id: string, data?: {
    notes?: string;
    checks?: {
      loadingComplete?: boolean;
      documentsReturned?: boolean;
      sealChecked?: boolean;
      exitApproved?: boolean;
    };
  }) {
    const response = await client.patch(`/admin/branches/vehicle-movements/${id}/gate-out`, data || {});
    return response.data.movement as VehicleMovement;
  },

  async reopenMovement(id: string, data?: { notes?: string }) {
    const response = await client.patch(`/admin/branches/vehicle-movements/${id}/reopen`, data || {});
    return response.data.movement as VehicleMovement;
  },

  async cancelMovement(id: string, data?: { notes?: string }) {
    const response = await client.patch(`/admin/branches/vehicle-movements/${id}/cancel`, data || {});
    return response.data.movement as VehicleMovement;
  },
};
