import client from '../../client'
import type { MasterGroup, PaginationResponse } from '../../types'

export interface SaveMasterGroupRequest {
  name: string
  code: string
  description?: string
  status?: 'active' | 'inactive'
}

export const masterGroupsService = {
  async list(params?: { status?: 'active' | 'inactive'; page?: number; limit?: number; search?: string }) {
    const response = await client.get<{ masterGroups: MasterGroup[]; pagination: PaginationResponse<MasterGroup>['pagination'] }>('/api/admin/master-groups', { params })
    return {
      data: response.data.masterGroups || [],
      pagination: response.data.pagination,
    }
  },

  async create(data: SaveMasterGroupRequest) {
    const response = await client.post<{ masterGroup: MasterGroup }>('/api/admin/master-groups', data)
    return response.data.masterGroup
  },

  async update(id: string, data: Partial<SaveMasterGroupRequest>) {
    const response = await client.put<{ masterGroup: MasterGroup }>(`/api/admin/master-groups/${id}`, data)
    return response.data.masterGroup
  },

  async toggle(id: string) {
    const response = await client.patch<{ masterGroup: MasterGroup }>(`/api/admin/master-groups/${id}/toggle`)
    return response.data.masterGroup
  },

  async delete(id: string) {
    await client.delete(`/api/admin/master-groups/${id}`)
  },
}
