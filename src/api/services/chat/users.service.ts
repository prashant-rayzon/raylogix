import api from '@/api/client'

export type GetUsersResponse = any

export async function getUsers(): Promise<GetUsersResponse> {
  const res = await api.get('/users')
  return res.data
}
