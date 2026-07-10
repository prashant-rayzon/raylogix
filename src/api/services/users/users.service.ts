import client from '../../client';
import type { AuthUser, PaginationResponse, UserRole } from '../../types';

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
  role?: UserRole;
  permissions?: string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: UserRole;
}

export const usersService = {
  // List users in tenant
  async list(params?: { page?: number; limit?: number; role?: string }) {
    const response = await client.get<PaginationResponse<AuthUser>>('/api/admin/users', {
      params,
    });
    return response.data;
  },

  // Get user by ID
  async getById(id: string) {
    const response = await client.get<{ user: AuthUser }>(`/api/admin/users/${id}`);
    return response.data.user;
  },

  // Create new user
  async create(data: CreateUserRequest) {
    const response = await client.post<{ user: AuthUser }>('/api/admin/users', data);
    return response.data.user;
  },

  // Update user
  async update(id: string, data: UpdateUserRequest) {
    const response = await client.put<{ user: AuthUser }>(`/api/admin/users/${id}`, data);
    return response.data.user;
  },

  // Deactivate user
  async deactivate(id: string) {
    const response = await client.patch<{ user: AuthUser }>(`/api/admin/users/${id}/deactivate`);
    return response.data.user;
  },
  // Update user permissions
  async updatePermissions(id: string, permissions: string[]) {
    const response = await client.patch<{ user: AuthUser }>(
      `/api/admin/users/${id}/permissions`,
      { permissions }
    );
    return response.data.user;
  }
};
