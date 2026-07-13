import api from '@/api/client'
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  MeResponse,
} from '@/api/types'

const AUTH_API_PREFIX = '/api/auth'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>(`${AUTH_API_PREFIX}/login`, payload)
  return res.data
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<RefreshResponse> {
  const res = await api.post<RefreshResponse>(`${AUTH_API_PREFIX}/refresh-token`, {
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
  const res = await api.get<MeResponse>(`${AUTH_API_PREFIX}/me`)
  return res.data
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  const res = await api.get<{ success: boolean; data: ActiveSession[] }>(`${AUTH_API_PREFIX}/sessions`)
  return res.data.data || []
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete(`${AUTH_API_PREFIX}/sessions/${sessionId}`)
}

export async function logoutAllSessions(): Promise<void> {
  await api.post(`${AUTH_API_PREFIX}/logout-all`)
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

export async function getCompanyProfile(): Promise<any> {
  const res = await api.get<any>('/api/admin/company')
  return res.data
}

export interface CompanySettingsPayload {
  themeColor?: string
  glowSystem?: string
  lightLogo?: string
  darkLogo?: string
}

export async function updateCompanySettings(payload: CompanySettingsPayload): Promise<any> {
  const res = await api.put<any>('/api/admin/company/settings', payload)
  return res.data
}
