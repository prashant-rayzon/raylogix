import client from '@/api/client'

export type AdminTransporterOption = {
  _id: string
  name: string
  email?: string
  companyName?: string
  logo?: string
}

// List transporters in the current tenant (admin)
export async function listAdminTransporters(): Promise<AdminTransporterOption[]> {
  // backend: GET /api/admin/transporters
  const res = await client.get<any>(`/admin/transporters`, {
    params: { page: 1, limit: 200 },
  })

  // Different backend versions might return { transporters } or { data: { transporters } }
  const arr = res?.data?.transporters ?? res?.data?.data?.transporters ?? res?.data ?? []
  return Array.isArray(arr) ? arr : []
}

