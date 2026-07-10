import axios from 'axios'
import { API_BASE_URL, API_PREFIX } from '@/api/base'
import { getAuthStore } from '@/lib/auth'
import { ConversationsResponse } from '@/api/schema'

const token = () => getAuthStore()?.accessToken || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

export async function getConversations(
  params?: any,
): Promise<ConversationsResponse> {
  const res = await api.get('/conversations', {
    params,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data as ConversationsResponse
}

export async function createBidNegotiation(
  bidId: string,
): Promise<{ success: boolean; data: { _id: string; loadId?: string; bidId?: string } }> {
  const res = await api.post('/conversations/negotiate', { bidId }, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function updateConversationBlockStatus(
  conversationId: string,
  isBlocked: boolean,
  reason?: string,
): Promise<any> {
  const endpoint = isBlocked
    ? `/conversations/${conversationId}/block`
    : `/conversations/${conversationId}/unblock`

  const res = await api.patch(
    endpoint,
    { isBlocked, reason },
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    },
  )

  return res.data
}

