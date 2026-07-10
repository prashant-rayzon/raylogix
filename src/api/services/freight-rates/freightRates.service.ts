import client from '../../client';

export interface FreightRate {
  _id: string;
  source: string;
  destination: string;
  vehicleType: string;
  transporterId: {
    _id: string;
    name: string;
    companyName: string;
    email: string;
  } | string;
  ratePerVehicle: number;
  effectiveFrom: string;
  effectiveTo: string;
  isActive: boolean;
}

export interface FreightRatesResponse {
  success: boolean;
  rates: FreightRate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const freightRatesService = {
  list: async (params?: any) => {
    const response = await client.get<FreightRatesResponse>('/api/admin/freight-rates', { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await client.post<{ success: boolean; rate: FreightRate }>('/api/admin/freight-rates', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await client.put<{ success: boolean; rate: FreightRate }>(`/api/admin/freight-rates/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await client.delete<{ success: boolean }>(`/api/admin/freight-rates/${id}`);
    return response.data;
  },

  lookup: async (params: { source: string; destination: string; vehicleType: string; transporterId?: string }) => {
    const response = await client.get<{ success: boolean; matched: boolean; rate?: FreightRate }>('/api/admin/freight-rates/lookup', { params });
    return response.data;
  }
};
