import apiClient from '@/api/client'

export interface NotificationData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'message' | 'conversation_started'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  userId?: string
  senderId?: string
  senderName?: string
  conversationId?: string
  messageId?: string
  metadata?: Record<string, any>
  readAt?: string
}

export interface NotificationResponse {
  success: boolean
  data?: NotificationData[] | any
  message?: string
  unreadCount?: number
  pagination?: {
    total: number
    limit: number
    page?: number
    offset?: number
    pages: number
  }
}

const BASE = '/notifications'

export const notificationsService = {
  /** Get all notifications for the current user (paginated) */
  getNotifications: async (limit = 50, offset = 0) => {
    const page = Math.floor(offset / limit) + 1
    return apiClient.get<NotificationResponse>(BASE, {
      params: { page, limit },
    })
  },

  /** Get unread notification count */
  getUnreadCount: async () => {
    return apiClient.get<{ success: boolean; count: number }>(
      `${BASE}/unread-count`
    )
  },

  /** Mark a single notification as read */
  markAsRead: async (notificationId: string) => {
    return apiClient.put<NotificationResponse>(`${BASE}/${notificationId}/read`)
  },

  /** Mark ALL notifications as read */
  markAllAsRead: async () => {
    return apiClient.put<NotificationResponse>(`${BASE}/mark-all-read`)
  },

  /** Delete a single notification */
  deleteNotification: async (notificationId: string) => {
    return apiClient.delete<NotificationResponse>(`${BASE}/${notificationId}`)
  },

  /** Clear ALL notifications for the current user */
  clearAll: async () => {
    return apiClient.delete<NotificationResponse>(`${BASE}/clear-all`)
  },

  getVapidPublicKey: async () => {
    return apiClient.get<{ success: boolean; publicKey: string }>(
      `${BASE}/push/vapid-public-key`
    )
  },

  subscribeToPush: async (data: {
    subscription: PushSubscriptionJSON
    deviceInfo: {
      deviceId: string
      deviceName: string
      browser: string
      os: string
    }
  }) => {
    return apiClient.post(`${BASE}/push/subscribe`, data)
  },

  unsubscribeFromPush: async (endpoint: string) => {
    return apiClient.post(`${BASE}/push/unsubscribe`, { endpoint })
  },

  /** Create a notification through the development test route */
  createTestNotification: async (data: {
    type?: string
    title: string
    message: string
  }) => {
    return apiClient.post('/test/send-notification', data)
  },

  /** Get notifications filtered by type client-side by asking for a page */
  getNotificationsByType: async (type: string, limit = 50, offset = 0) => {
    const page = Math.floor(offset / limit) + 1
    return apiClient.get<NotificationResponse>(BASE, {
      params: { type, page, limit },
    })
  },

  /** Get notifications for a specific conversation */
  getConversationNotifications: async (
    conversationId: string,
    limit = 50,
    offset = 0
  ) => {
    const page = Math.floor(offset / limit) + 1
    return apiClient.get<NotificationResponse>(BASE, {
      params: { page, limit, conversationId },
    })
  },
}
