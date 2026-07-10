import client from '../../client'
import type { Master, PaginationResponse } from '../../types'

export interface SaveMasterRequest {
  groupId: string
  name: string
  code: string
  value?: string
  description?: string
  status?: 'active' | 'inactive'
}

export const mastersService = {
  async list(params?: {
    groupId?: string
    groupCode?: string
    status?: 'active' | 'inactive'
    page?: number
    limit?: number
    search?: string
  }) {
    const response = await client.get<{ masters: Master[]; pagination: PaginationResponse<Master>['pagination'] }>('/api/admin/masters', { params })
    return {
      data: response.data.masters || [],
      pagination: response.data.pagination,
    }
  },

  async create(data: SaveMasterRequest) {
    const response = await client.post<{ master: Master }>('/api/admin/masters', data)
    return response.data.master
  },

  async update(id: string, data: Partial<SaveMasterRequest>) {
    const response = await client.put<{ master: Master }>(`/api/admin/masters/${id}`, data)
    return response.data.master
  },

  async toggle(id: string) {
    const response = await client.patch<{ master: Master }>(`/api/admin/masters/${id}/toggle`)
    return response.data.master
  },

  async delete(id: string) {
    await client.delete(`/api/admin/masters/${id}`)
  },

  async listByGroupCode(groupCode: string) {
    const result = await this.list({
      groupCode: groupCode.trim().toUpperCase(),
      status: 'active',
      limit: 100,
    })
    return result.data
  },
}
