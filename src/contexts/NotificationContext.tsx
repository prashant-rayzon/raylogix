import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import {
  notificationsService,
  NotificationData,
} from '@/api/services/notifications/notifications.service'
import { io, Socket } from 'socket.io-client'
import { useAppSelector } from '@/store'

/* ─────────────────────────── types ─────────────────────────── */

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'message' | 'conversation_started'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  icon?: React.ReactNode
  userId?: string
  senderId?: string
  senderName?: string
  conversationId?: string
  messageId?: string
  metadata?: Record<string, any>
  readAt?: Date
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error?: string
  toasts: Notification[]
  socket: Socket | null
  pushSupported: boolean
  pushPermission: NotificationPermission | 'unsupported'
  pushSubscribed: boolean
  addNotification: (
    notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & {
      id?: string
      timestamp?: Date
    }
  ) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  refreshNotifications: () => Promise<void>
  fetchNotifications: (limit?: number, offset?: number) => Promise<void>
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>
  enablePushNotifications: () => Promise<PushSubscription | null>
  disablePushNotifications: () => Promise<void>
  dismissToast: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

/* ────────────────────────── helpers ────────────────────────── */

const isMongoId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id)

function convertNotificationData(data: NotificationData): Notification {
  return {
    id: data.id,
    type: data.type,
    title: data.title,
    message: data.message,
    timestamp: new Date(data.timestamp),
    read: data.read,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    userId: data.userId,
    senderId: data.senderId,
    senderName: data.senderName,
    conversationId: data.conversationId,
    messageId: data.messageId,
    metadata: data.metadata,
    readAt: data.readAt ? new Date(data.readAt) : undefined,
  }
}

function getReplyUrl(notification: Notification) {
  if (!notification.actionUrl) return '/chats?reply=1'
  const url = new URL(notification.actionUrl, window.location.origin)
  url.searchParams.set('reply', '1')
  return `${url.pathname}${url.search}${url.hash}`
}

function getNotificationIcon(type: Notification['type']) {
  const icons: Record<Notification['type'], string> = {
    message: '/images/notifications/message.svg',
    conversation_started: '/images/notifications/message.svg',
    success: '/images/notifications/success.svg',
    warning: '/images/notifications/warning.svg',
    error: '/images/notifications/error.svg',
    info: '/images/notifications/info.svg',
  }

  return icons[type] || '/images/favicon.ico'
}

function getNotificationTitle(notification: Notification) {
  const labels: Record<Notification['type'], string> = {
    message: 'Message',
    conversation_started: 'New chat',
    success: 'Success',
    warning: 'Warning',
    error: 'Action needed',
    info: 'Update',
  }
  const label = labels[notification.type]

  return label && !notification.title.startsWith(`${label}:`)
    ? `${label}: ${notification.title}`
    : notification.title
}

async function showBrowserNotification(notification: Notification) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (window.Notification.permission !== 'granted') return

  const notificationOptions = {
    body: notification.message,
    tag: notification.id,
    icon: getNotificationIcon(notification.type),
    badge: '/images/favicon.png',
    requireInteraction: ['error', 'warning'].includes(notification.type),
    renotify: true,
    timestamp: notification.timestamp.getTime(),
    data: {
      url: notification.actionUrl || '/notifications',
      replyUrl:
        notification.type === 'message' || notification.type === 'conversation_started'
          ? getReplyUrl(notification)
          : undefined,
      notificationId: notification.id,
    },
  } as NotificationOptions & { renotify?: boolean }

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(getNotificationTitle(notification), {
      ...notificationOptions,
      actions: [
        ...(notification.type === 'message' || notification.type === 'conversation_started'
          ? [{ action: 'reply', title: 'Reply' }]
          : []),
        { action: 'open', title: notification.actionLabel || 'Open' },
      ],
    } as NotificationOptions)
    return
  }

  const browserNotification = new window.Notification(
    getNotificationTitle(notification),
    notificationOptions
  )

  browserNotification.onclick = () => {
    window.focus()
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
    browserNotification.close()
  }
}

function getPushSupport() {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function getStoredDeviceId() {
  const existing = localStorage.getItem('notificationDeviceId')
  if (existing) return existing
  const created = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem('notificationDeviceId', created)
  return created
}

function getBrowserName() {
  const ua = navigator.userAgent
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('Chrome/')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/')) return 'Safari'
  return 'Unknown'
}

function getOSName() {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Android')) return 'Android'
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
  if (ua.includes('Linux')) return 'Linux'
  return 'Unknown'
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function normalizeBase64Url(value: string) {
  return value.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return normalizeBase64Url(window.btoa(binary))
}

function isSubscriptionUsingVapidKey(
  subscription: PushSubscription,
  publicKey: string
) {
  const applicationServerKey = subscription.options?.applicationServerKey
  if (!applicationServerKey) return true

  return (
    arrayBufferToBase64Url(applicationServerKey) ===
    normalizeBase64Url(publicKey)
  )
}

/* ─────────────────────────── provider ─────────────────────────── */

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (!getPushSupport()) return 'unsupported'
    return window.Notification.permission
  })
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Auth from Redux
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const pushSupported = getPushSupport()

  const requestNotificationPermission = useCallback(async () => {
    if (!getPushSupport()) {
      setPushPermission('unsupported')
      return 'unsupported'
    }

    if (window.Notification.permission === 'granted') {
      setPushPermission('granted')
      return 'granted'
    }

    if (window.Notification.permission === 'denied') {
      setPushPermission('denied')
      return 'denied'
    }

    const permission = await window.Notification.requestPermission()
    setPushPermission(permission)
    return permission
  }, [])

  const enablePushNotifications = useCallback(async () => {
    if (!accessToken || !getPushSupport()) {
      setPushPermission(getPushSupport() ? window.Notification.permission : 'unsupported')
      return null
    }

    try {
      setError(undefined)
      const permission = await requestNotificationPermission()
      if (permission !== 'granted') {
        setPushSubscribed(false)
        return null
      }

      const registration = await navigator.serviceWorker.ready
      const { data } = await notificationsService.getVapidPublicKey()
      let subscription = await registration.pushManager.getSubscription()

      if (subscription && !isSubscriptionUsingVapidKey(subscription, data.publicKey)) {
        await subscription.unsubscribe()
        subscription = null
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        })
      }

      await notificationsService.subscribeToPush({
        subscription: subscription.toJSON(),
        deviceInfo: {
          deviceId: getStoredDeviceId(),
          deviceName: navigator.userAgent,
          browser: getBrowserName(),
          os: getOSName(),
        },
      })

      setPushSubscribed(true)
      return subscription
    } catch (err: any) {
      setPushSubscribed(false)
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to enable push notifications'
      setError(message)
      console.error('[NotificationContext] enable push error:', err)
      throw err
    }
  }, [accessToken, requestNotificationPermission])

  const disablePushNotifications = useCallback(async () => {
    if (!getPushSupport()) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await notificationsService.unsubscribeFromPush(subscription.endpoint)
      await subscription.unsubscribe()
    }

    setPushSubscribed(false)
  }, [])

  /* ── refresh (replaces the entire list from server) ── */
  const refreshNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(undefined)
      const response = await notificationsService.getNotifications(100, 0)
      const rawData = response?.data?.data
      if (Array.isArray(rawData)) {
        setNotifications(rawData.map(convertNotificationData))
      } else {
        setNotifications([])
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── fetch with pagination (appends, no dupes) ── */
  const fetchNotifications = useCallback(async (limit = 50, offset = 0) => {
    try {
      setIsLoading(true)
      setError(undefined)
      const response = await notificationsService.getNotifications(limit, offset)
      const rawData = response?.data?.data
      if (Array.isArray(rawData)) {
        const converted = rawData.map(convertNotificationData)
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const uniqueNew = converted.filter((n) => !existingIds.has(n.id))
          return offset === 0 ? converted : [...prev, ...uniqueNew]
        })
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [])

  /* ── load on login, clear on logout ── */
  useEffect(() => {
    if (accessToken) {
      refreshNotifications()
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        enablePushNotifications().catch((err) =>
          console.error('[NotificationContext] push subscription error:', err)
        )
      }
    } else {
      setNotifications([])
      setToasts([])
      setPushSubscribed(false)
    }
  }, [accessToken, enablePushNotifications]) // intentionally exclude refreshNotifications to avoid loops

  /* ── real-time socket ── */
  useEffect(() => {
    if (!accessToken) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
      }
      return
    }

    const serverUrl = (
      (import.meta as any)?.env?.VITE_API_URL ||
      (import.meta as any)?.env?.VITE_API_BASE ||
      window.location.origin
    ).replace(/\/api\/?$/, '')

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    })

    socketRef.current = socket
    setSocket(socket)

    socket.on('connect', () => {
      socket.emit('user-join')
    })

    socket.on('connect_error', () => {
      // Socket disconnect/connect failures are expected during logout,
      // token refresh, server restart, and local development reloads.
    })

    socket.on('notification:new', (payload: any) => {
      if (!payload) return
      const idToUse = (payload.id || payload._id)?.toString()

      const newNotif: Notification = {
        id: idToUse || Date.now().toString(),
        type: payload.type || 'info',
        title: payload.title || 'New Notification',
        message: payload.message || '',
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        read: false,
        actionUrl: payload.actionUrl,
        actionLabel: payload.actionLabel,
        senderId: payload.senderId,
        senderName: payload.senderName,
        conversationId: payload.conversationId,
        messageId: payload.messageId,
      }

      // Add to notification list (avoid duplicates)
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })

      // Always show toast for incoming real-time notification
      setToasts((prev) => {
        if (prev.some((t) => t.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })

      showBrowserNotification(newNotif).catch((err) =>
        console.error('[NotificationContext] browser notification error:', err)
      )
    })

    socket.on('notification:unread-count', () => {
      // The list is kept in sync by notification:new/read/read-all/deleted.
      // This event is still useful for clients that only render a server count.
    })

    socket.on('notification:read', ({ notificationIds }: { notificationIds: string[] }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id)
            ? { ...n, read: true, readAt: new Date() }
            : n
        )
      )
    })

    socket.on('notification:read-all', () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      )
    })

    socket.on('notification:deleted', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setToasts((prev) => prev.filter((n) => n.id !== notificationId))
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setSocket(null)
    }
  }, [accessToken])

  /* ── addNotification (for manual/local triggers) ── */
  const addNotification = useCallback(
    (
      notification: Omit<Notification, 'id' | 'timestamp' | 'read'> & {
        id?: string
        timestamp?: Date
      }
    ) => {
      const newNotif: Notification = {
        ...notification,
        id: notification.id || Date.now().toString(),
        timestamp: notification.timestamp || new Date(),
        read: false,
      }
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
      setToasts((prev) => {
        if (prev.some((t) => t.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
      showBrowserNotification(newNotif).catch((err) =>
        console.error('[NotificationContext] browser notification error:', err)
      )
    },
    []
  )

  /* ── removeNotification ── */
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setToasts((prev) => prev.filter((t) => t.id !== id))
    if (isMongoId(id)) {
      notificationsService
        .deleteNotification(id)
        .catch((err) => console.error('[NotificationContext] delete error:', err))
    }
  }, [])

  /* ── markAsRead ── */
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    if (isMongoId(id)) {
      notificationsService
        .markAsRead(id)
        .catch((err) => console.error('[NotificationContext] markAsRead error:', err))
    }
  }, [])

  /* ── markAllAsRead ── */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    notificationsService
      .markAllAsRead()
      .catch((err) => console.error('[NotificationContext] markAllAsRead error:', err))
  }, [])

  /* ── clearNotifications ── */
  const clearNotifications = useCallback(async () => {
    setNotifications([])
    setToasts([])
    try {
      await notificationsService.clearAll()
    } catch (err) {
      console.error('[NotificationContext] clearAll error:', err)
      // Re-fetch to restore correct state if API failed
      refreshNotifications()
    }
  }, [refreshNotifications])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        const notificationId = event.data.notificationId
        const url = event.data.url

        if (notificationId) {
          markAsRead(notificationId)
        }

        if (url) {
          window.location.href = url
        }
      }

      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && accessToken) {
        enablePushNotifications().catch((err) =>
          console.error('[NotificationContext] push resubscribe error:', err)
        )
      }
    }

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
    }
  }, [accessToken, enablePushNotifications, markAsRead])

  /* ── dismissToast (UI only, does NOT delete from DB) ── */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        toasts,
        socket,
        pushSupported,
        pushPermission,
        pushSubscribed,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
        fetchNotifications,
        requestNotificationPermission,
        enablePushNotifications,
        disablePushNotifications,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
