import client from '@/api/client';

export type BranchStatus = 'active' | 'inactive';
export type BranchType = 'company' | 'customer' | 'all'; // company = own branches, customer = external locations
export type OperationalRole = 'none' | 'branch_manager' | 'watchman' | 'inspection_officer';
export type VehicleRequestType = 'outbound' | 'inbound';
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

export interface Branch {
  _id: string;
  name: string;
  code: string;
  branchType?: BranchType; // 'company' = own branches, 'customer' = external addresses
  address?: {
    line1?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
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
  dpNum?: string;
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
  loadId?: string | { _id: string; loadNumber?: string; material?: string; status?: string; dpNum?: string };
  bidId?: string | { _id: string; bidAmount?: number; currency?: string; status?: string };
  expectedAt?: string;
  status: VehicleMovementStatus;
  referenceSnapshot?: {
    loadNumber?: string;
    dpNum?: string;
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
  workflow?: {
    lookupResult?: any;
  };
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
  evidence?: {
    gateInPhotos?: Array<{ name?: string; url?: string; uploadedAt?: string }>;
    gateOutPhotos?: Array<{ name?: string; url?: string; uploadedAt?: string }>;
  };
  createdAt: string;
}

export interface VehicleMovementGroup {
  key: string;
  label: string;
  load?: BranchAssignedLoad;
  movements: VehicleMovement[];
  transporters?: Record<
    string,
    { key: string; name: string; movements: VehicleMovement[] }
  >;
}

export interface BranchFormData {
  name: string;
  code: string;
  branchType?: BranchType;
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
  workflow?: {
    lookupResult?: any;
  };
  photos?: File[];
}

function appendMovementFormData(formData: FormData, data: VehicleMovementFormData) {
  formData.append('branchId', data.branchId);
  formData.append('vehicleNumber', data.vehicleNumber);
  formData.append('toDestination', data.toDestination);
  if (data.requestType) formData.append('requestType', data.requestType);
  if (data.transporterId) formData.append('transporterId', data.transporterId);
  if (data.loadId) formData.append('loadId', data.loadId);
  if (data.bidId) formData.append('bidId', data.bidId);
  if (data.transporterName) formData.append('transporterName', data.transporterName);
  if (data.driverName) formData.append('driverName', data.driverName);
  if (data.driverPhone) formData.append('driverPhone', data.driverPhone);
  if (data.fromDestination) formData.append('fromDestination', data.fromDestination);
  if (data.purpose) formData.append('purpose', data.purpose);
  if (data.expectedAt) formData.append('expectedAt', data.expectedAt);
  if (data.workflow) formData.append('workflow', JSON.stringify(data.workflow));
  data.photos?.forEach(photo => formData.append('photos', photo));
}

function appendActionPayload(formData: FormData, payload?: Record<string, any>) {
  if (!payload) return;
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'object') formData.append(key, JSON.stringify(value));
    else formData.append(key, String(value));
  });
}

export const branchesService = {
  async list(params?: { page?: number; limit?: number; status?: string; branchType?: string; search?: string }) {
    const response = await client.get('/api/admin/branches', { params });
    return response.data as { branches: Branch[]; pagination: any };
  },

  async create(data: BranchFormData) {
    const response = await client.post('/api/admin/branches', data);
    return response.data.branch as Branch;
  },

  async update(id: string, data: BranchFormData) {
    const response = await client.put(`/api/admin/branches/${id}`, data);
    return response.data.branch as Branch;
  },

  async assignUser(data: { branchId: string; userId: string; operationalRole: OperationalRole }) {
    const response = await client.post('/api/admin/branches/staff/assignments', data);
    return response.data.assignment as BranchStaffAssignment;
  },

  async getLookups(params?: { requestType?: VehicleRequestType; branchId?: string }) {
    const response = await client.get('/api/admin/branches/lookups', { params });
    return response.data as {
      branches: Branch[];
      transporters: BranchTransporter[];
      assignedLoads: BranchAssignedLoad[];
    };
  },

  async listAssignableUsers(params?: { page?: number; limit?: number; search?: string }) {
    const response = await client.get('/api/admin/branches/staff/candidates', { params });
    return response.data as { items: BranchUser[]; pagination: any };
  },

  async listStaffAssignments(params?: { page?: number; limit?: number; branchId?: string; operationalRole?: OperationalRole; search?: string }) {
    const response = await client.get('/api/admin/branches/staff/assignments', { params });
    return response.data as { items: BranchStaffAssignment[]; pagination: any };
  },

  async unassignUser(assignmentId: string) {
    const response = await client.delete(`/api/admin/branches/staff/assignments/${assignmentId}`);
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
    vehicleType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await client.get('/api/admin/branches/vehicle-movements', { params });
    return response.data as {
      movements?: VehicleMovement[];
      groupedLoads?: VehicleMovementGroup[];
      loadRequirements?: VehicleMovementGroup[];
      pagination: any;
      counts?: any;
    };
  },

  async createMovement(data: VehicleMovementFormData) {
    const formData = new FormData();
    appendMovementFormData(formData, data);
    // Use the shared intercepted client — do NOT set Content-Type manually;
    // the browser sets the correct multipart boundary automatically.
    const response = await client.post('/api/admin/branches/vehicle-movements', formData);
    return response.data.movement as VehicleMovement;
  },
  async gateIn(id: string, payload?: { notes?: string; photos?: File[]; tareWeight?: number; weighbridgeSlipIn?: string }) {
    const formData = new FormData();
    appendActionPayload(formData, { 
      notes: payload?.notes,
      tareWeight: payload?.tareWeight,
      weighbridgeSlipIn: payload?.weighbridgeSlipIn
    });
    payload?.photos?.forEach(photo => formData.append('gateInPhotos', photo));
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/gate-in`, formData);
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
    photos?: File[];
  }) {
    const formData = new FormData();
    appendActionPayload(formData, data);
    data.photos?.forEach(photo => formData.append('inspectionPhotos', photo));
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/inspect`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
    photos?: File[];
    grossWeight?: number;
    weighbridgeSlipOut?: string;
  }) {
    const formData = new FormData();
    const { photos, ...rest } = data || {};
    appendActionPayload(formData, rest);
    photos?.forEach(photo => formData.append('gateOutPhotos', photo));
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/gate-out`, formData);
    return response.data.movement as VehicleMovement;
  },

  async reopenMovement(id: string, data?: { notes?: string }) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/reopen`, data || {});
    return response.data.movement as VehicleMovement;
  },

  async cancelMovement(id: string, data?: { notes?: string }) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/cancel`, data || {});
    return response.data.movement as VehicleMovement;
  },

  async startLoading(id: string) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/start-loading`, {});
    return response.data.movement as VehicleMovement;
  },

  async reportLoadingError(id: string, data: { notes: string }) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/loading-error`, data);
    return response.data.movement as VehicleMovement;
  },

  async startUnloading(id: string) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/start-unloading`, {});
    return response.data.movement as VehicleMovement;
  },

  async verifyUnloaded(id: string, data: { photos?: File[] }) {
    const formData = new FormData();
    data.photos?.forEach(photo => formData.append('unloadPhotos', photo));
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/verify-unloaded`, formData);
    return response.data.movement as VehicleMovement;
  },

  async grantReloadPermission(id: string) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/grant-reload-permission`, {});
    return response.data.movement as VehicleMovement;
  },

  async completeLoading(id: string, data: { photos?: File[] }) {
    const formData = new FormData();
    data.photos?.forEach(photo => formData.append('loadingPhotos', photo));
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/complete-loading`, formData);
    return response.data.movement as VehicleMovement;
  },

  async approveTransit(id: string, data: { notes?: string }) {
    const response = await client.patch(`/api/admin/branches/vehicle-movements/${id}/approve-transit`, data);
    return response.data.movement as VehicleMovement;
  },
};
