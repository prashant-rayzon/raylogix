import axios from 'axios'
import { API_BASE_URL, API_PREFIX } from '@/api/base'
import { getAuthStore } from '@/lib/auth'

const token = () => getAuthStore()?.accessToken || ''

const api = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: { 'Content-Type': 'multipart/form-data' },
  withCredentials: true,
})

/**
 * Upload file with progress tracking
 * POST /api/chat/files/upload
 */
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
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const response = JSON.parse(xhr.responseText)
          // Server returns { success: true, data: { id, name, url, ... } }
          // Return the data object directly so callers get file metadata
          if (response.data) {
            resolve(response.data)
          } else {
            resolve(response)
          }
        } catch (err) {
          reject(new Error('Failed to parse upload response'))
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText)
          reject(new Error(errorResponse.error || errorResponse.message || `Upload failed with status ${xhr.status}`))
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'))
    })

    xhr.open('POST', `${API_BASE_URL}${API_PREFIX}/chat/files/upload`)
    xhr.setRequestHeader('Authorization', `Bearer ${token()}`)
    xhr.send(formData)
  })
}

/**
 * Download file
 * GET /api/chat/files/:filename
 */
export async function downloadFile(filename: string): Promise<Blob> {
  const res = await api.get(`/chat/files/${filename}`, {
    responseType: 'blob',
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

/**
 * Delete file
 * DELETE /api/chat/files/:filename
 */
export async function deleteFile(filename: string): Promise<any> {
  const res = await api.delete(`/chat/files/${filename}`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

/**
 * Add reaction to message
 * POST /api/messages/:messageId/reactions
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<any> {
  const res = await api.post(
    `/messages/${messageId}/reactions`,
    { emoji },
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

/**
 * Remove reaction from message
 * DELETE /api/messages/:messageId/reactions/:emoji
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<any> {
  const res = await api.delete(
    `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

/**
 * Get reactions for message
 * GET /api/messages/:messageId/reactions
 */
export async function getReactions(messageId: string): Promise<any> {
  const res = await api.get(`/messages/${messageId}/reactions`, {
    headers: {
      Authorization: `Bearer ${token()}`,
    },
  })
  return res.data
}

/**
 * Toggle pin on message
 * PUT /api/messages/:messageId/pin
 */
export async function togglePin(messageId: string): Promise<any> {
  const res = await api.put(
    `/messages/${messageId}/pin`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}

/**
 * Get pinned messages in conversation
 * GET /api/messages/conversation/:conversationId/pinned
 */
export async function getPinnedMessages(conversationId: string): Promise<any> {
  const res = await api.get(
    `/messages/conversation/${conversationId}/pinned`,
    {
      headers: {
        Authorization: `Bearer ${token()}`,
      },
    }
  )
  return res.data
}
