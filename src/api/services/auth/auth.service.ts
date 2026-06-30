import api from '@/api/client'
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  MeResponse,
} from '@/api/types'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', payload)
  return res.data
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<RefreshResponse> {
  const res = await api.post<RefreshResponse>('/auth/refresh-token', {
    refreshToken: refreshTokenValue,
  })
  return res.data
}

export type ActiveSession = {
  id: string
  createdAt: string
  expiresAt?: string
  ip?: string
  userAgent?: string
}

export async function getMe(): Promise<MeResponse> {
  const res = await api.get<MeResponse>('/auth/me')
  return res.data
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  const res = await api.get<{ success: boolean; data: ActiveSession[] }>('/auth/sessions')
  return res.data.data || []
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete(`/auth/sessions/${sessionId}`)
}

export async function logoutAllSessions(): Promise<void> {
  await api.post('/auth/logout-all')
}

export type ChangePasswordRequest = {
  currentPassword: string
  newPassword: string
}

export type ChangePasswordResponse = {
  message: string
}

export async function changePassword(
  payload: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  const res = await api.post<ChangePasswordResponse>(
    '/auth/change-password',
    payload
  )
  return res.data
}

export async function getCompanyProfile(): Promise<unknown> {
  const res = await api.get<unknown>('/admin/company')
  return res.data
}
