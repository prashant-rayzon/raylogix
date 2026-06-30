import client from '../../client';
import type { Company, PaginationResponse, AuthUser } from '../../types';

export interface CreateCompanyRequest {
  companyName: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  maxUsers?: number;
}

export const companiesService = {
  // Create new company (super_admin only)
  async create(data: CreateCompanyRequest) {
    const response = await client.post<{ company: Company; admin: AuthUser }>(
      '/super-admin/companies',
      data
    );
    return response.data;
  },

  // List all companies (super_admin only)
  async list(params?: { page?: number; limit?: number; isActive?: boolean }) {
    const response = await client.get<PaginationResponse<Company> | { companies: Company[]; pagination: PaginationResponse<Company>['pagination'] }>(
      '/super-admin/companies',
      { params }
    );
    const body: any = response.data;
    return {
      data: body.data || body.companies || [],
      pagination: body.pagination,
    } as PaginationResponse<Company>;
  },

  // Get company by ID
  async getById(id: string) {
    const response = await client.get<Company>(`/super-admin/companies/${id}`);
    return response.data;
  },

  // Update company
  async update(id: string, data: Partial<Company>) {
    const response = await client.put<{ company: Company }>(
      `/super-admin/companies/${id}`,
      data
    );
    return response.data.company;
  },

  // Toggle company active status
  async toggle(id: string) {
    const response = await client.patch<{ company: Company }>(
      `/super-admin/companies/${id}/toggle`
    );
    return response.data.company;
  },
};
