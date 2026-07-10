import axios from 'axios'
import { API_BASE_URL, API_PREFIX } from '@/api/base'

import { getAuthStore } from '@/lib/auth'

const token = () => getAuthStore()?.accessToken || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

/**
 * Get messages by conversation ID
 * GET /api/api/messages/conversation/:conversationId
 */
export async function getMessagesByConversation(
  conversationId: string,
  params?: { limit?: number; offset?: number; before?: string; after?: string }
): Promise<any> {
  const res = await api.get(`/messages/conversation/${conversationId}`, {
    params,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function getMessages(
  userId1: string,
  userId2: string,
  params?: { limit?: number; offset?: number; before?: string; after?: string }
): Promise<any> {
  const res = await api.get(`/api/messages/${userId1}/${userId2}`, {
    params,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function getUnreadCount(): Promise<any> {
  const res = await api.get(`/api/messages/unread/count`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function getMessageStats(): Promise<any> {
  const res = await api.get(`/api/messages/stats`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function markAllAsRead(senderId: string): Promise<any> {
  const res = await api.put(
    `/api/messages/read/all/${senderId}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function markAsRead(messageId: string): Promise<any> {
  const res = await api.put(
    `/api/messages/${messageId}/read`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function searchMessages(
  query: string,
  params?: { limit?: number; offset?: number }
): Promise<any> {
  const res = await api.get(`/api/messages/search/${encodeURIComponent(query)}`, {
    params,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function forwardMessage(data: {
  messageId: string
  recipientIds: string[]
  content?: string
}): Promise<any> {
  const res = await api.post('/api/messages/forward', data, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function bulkDeleteMessages(data: {
  messageIds: string[]
  deleteFor?: 'all' | 'self'
}): Promise<any> {
  const res = await api.delete('/api/messages/bulk/delete', {
    data,
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function getPinnedMessages(userId: string): Promise<any> {
  const res = await api.get(`/api/messages/pinned/${userId}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function togglePinMessage(messageId: string): Promise<any> {
  const res = await api.put(
    `/api/messages/${messageId}/pin`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function editMessage(messageId: string, content: string): Promise<any> {
  const res = await api.put(
    `/api/messages/${messageId}`,
    { content },
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function deleteMessage(
  messageId: string,
  deleteFor: 'all' | 'self' = 'all'
): Promise<any> {
  const res = await api.delete(`/api/messages/${messageId}`, {
    data: { deleteFor },
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function addReaction(messageId: string, emoji: string): Promise<any> {
  const res = await api.post(
    `/api/messages/${messageId}/reactions`,
    { emoji },
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function removeReaction(messageId: string, emoji: string): Promise<any> {
  const res = await api.delete(
    `/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

export async function getMessage(messageId: string): Promise<any> {
  const res = await api.get(`/api/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function sendMessageRest(data: {
  recipientId: string
  content: string
  type?: string
  replyToId?: string
  attachments?: any[]
  conversationId?: string
  metadata?: any
}): Promise<any> {
  const res = await api.post('/api/messages', data, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

export async function uploadFile(
  file: File,
  conversationId: string,
  onProgress?: (progress: number) => void
): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('conversationId', conversationId)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress?.(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText)
          // Return the data property if available, otherwise return the full response
          if (response.data) {
            resolve(response.data)
          } else {
            resolve(response)
          }
        } catch (err) {
          reject(new Error('Failed to parse response'))
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText)
          reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('POST', `${API_BASE_URL}${API_PREFIX}/chat/files/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`)
    xhr.send(formData)
  })
}

