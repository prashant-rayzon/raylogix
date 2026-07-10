import client from '../../client';
import type { PaginationResponse } from '../../types';

export interface TransporterAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export type TransporterStatus = 'active' | 'inactive' | 'suspended' | 'blocked';
export type VehicleType =
  | 'truck'
  | 'van'
  | 'bike'
  | 'car'
  | 'bus'
  | 'flatbed'
  | 'container'
  | 'tanker';

export interface TransporterFormData {
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  companyName?: string;
  password: string;
  confirmPassword: string;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;

  address?: TransporterAddress;

  operationAreas?: string[];
  vehicleTypes?: VehicleType[];
  averageCapacity?: number;

  status?: TransporterStatus;
  isAvailable?: boolean;
  availableUntil?: string; // ISO

  isVerified?: boolean;
  notes?: string;

  contactPerson?: {
    name?: string;
    designation?: string;
    phone?: string;
    email?: string;
  };

  profilePicture?: File;
}

export interface Transporter {
  _id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  status?: TransporterStatus;
  isAvailable?: boolean;
  isVerified?: boolean;
  address?: TransporterAddress;
  operationAreas?: string[];
  vehicleTypes?: VehicleType[];
  availableUntil?: string;
  profilePicture?: string;
  profile?: string;
  profileImage?: string;
  profilePhoto?: string;
  avatar?: string;
  user?: {
    profile?: string;
    profilePicture?: string;
    avatar?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// NOTE: Backend currently only exposes explicit admin users routes.
// Transporter CRUD is expected to be available via tenant resource routing.
// If the backend paths differ, only this service file should be updated.
export const transportersService = {
  async list(params?: { page?: number; limit?: number; status?: string }) {
    // expected: /api/admin/transporters
    const response = await client.get<PaginationResponse<Transporter>>('/api/admin/transporters', { params });
    return response.data;
  },

  async getById(id: string) {
    const response = await client.get<{ transporter: Transporter }>(`/api/admin/transporters/${id}`);
    return response.data.transporter;
  },

  async create(data: TransporterFormData) {
    const formData = new FormData();
    
    // Add all text fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profilePicture' || key === 'confirmPassword') {
        return; // Skip file and confirmPassword
      }
      
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    // Add file if present
    if (data.profilePicture) {
      formData.append('profilePicture', data.profilePicture);
    }

    const response = await client.post<{ transporter: Transporter }>(`/api/admin/transporters`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.transporter;
  },

  async update(id: string, data: Partial<TransporterFormData>) {
    const formData = new FormData();
    
    // Add all text fields
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profilePicture' || key === 'confirmPassword') {
        return; // Skip file and confirmPassword
      }
      
      if (value === undefined || value === null) {
        return;
      }

      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    });

    // Add file if present
    if (data.profilePicture) {
      formData.append('profilePicture', data.profilePicture);
    }

    const response = await client.put<{ transporter: Transporter }>(`/api/admin/transporters/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.transporter;
  },

  async deactivate(id: string) {
    const response = await client.patch<{ transporter: Transporter }>(`/api/admin/transporters/${id}/deactivate`);
    return response.data.transporter;
  },

  async delete(id: string) {
    const response = await client.delete(`/api/admin/transporters/${id}`);
    return response.data;
  },

  async getTransporterLoads(transporterId: string, params?: { page?: number; limit?: number; status?: string }) {
    const response = await client.get<any>(`/api/admin/transporters/${transporterId}/loads`, { params });
    return response.data;
  },
};

