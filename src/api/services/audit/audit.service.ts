import apiClient from '@/api/client'

export interface AuditLogEntry {
  _id: string
  userId?: string
  userName: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  resourceName?: string
  status: 'success' | 'failure' | 'partial'
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  responseStatusCode?: number
  tenantId?: string
  timestamp: string
  context?: Record<string, unknown>
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const auditService = {
  async list(params?: {
    page?: number
    limit?: number
    action?: string
    resource?: string
    status?: string
    search?: string
  }): Promise<AuditLogResponse> {
    const response = await apiClient.get('/audit', { params })
    return response.data
  },
}
