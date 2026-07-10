import client from '../../client';
import { AuthUser } from '../../types';

export interface BillingAudit {
  status: 'pending' | 'verified' | 'approved' | 'rejected';
  invoiceNumber?: string;
  invoiceAmount?: number;
  matchedRatePerVehicle?: number;
  deviationReason?: string;
  verifiedBy?: AuthUser | string;
  verifiedAt?: string;
  approvedBy?: AuthUser | string;
  approvedAt?: string;
  remarks?: string;
}

export interface BillingLoad {
  _id: string;
  loadNumber: string;
  pickupLocation: {
    address: string;
    city?: string;
    state?: string;
  };
  deliveryLocation: {
    address: string;
    city?: string;
    state?: string;
  };
  material: string;
  vehicleType: string;
  numberOfVehicles: number;
  assignedTransporter?: {
    _id: string;
    name: string;
    companyName: string;
  };
  status: string;
  billingAudit?: BillingAudit;
  vehicleMovements?: any[];
}

export interface BillingLoadsResponse {
  success: boolean;
  loads: BillingLoad[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const billingService = {
  list: async (params?: any) => {
    const response = await client.get<BillingLoadsResponse>('/api/admin/billing/loads', { params });
    return response.data;
  },

  verify: async (id: string, data: {
    status: 'pending' | 'verified' | 'approved' | 'rejected';
    invoiceNumber?: string;
    invoiceAmount?: number;
    matchedRatePerVehicle?: number;
    deviationReason?: string;
    remarks?: string;
  }) => {
    const response = await client.patch<{ success: boolean; load: BillingLoad }>(`/api/admin/billing/loads/${id}/verify`, data);
    return response.data;
  }
};
