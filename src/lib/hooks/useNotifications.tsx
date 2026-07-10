import { useEffect, useRef } from 'react'
import {
  useNotifications as useNotificationContext,
  type Notification,
} from '@/contexts/NotificationContext'

type UseNotificationsOptions = {
  autoConnect?: boolean
  enableBrowserNotifications?: boolean
  onNewNotification?: (notification: Notification) => void
}

export type { Notification }

export function useNotifications(options: UseNotificationsOptions = {}) {
  const context = useNotificationContext()
  const lastSeenIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!options.onNewNotification || context.notifications.length === 0) return

    const latest = context.notifications[0]
    if (lastSeenIdRef.current === latest.id) return

    lastSeenIdRef.current = latest.id
    options.onNewNotification(latest)
  }, [context.notifications, options])

  return {
    ...context,
    isConnected: Boolean(context.socket?.connected),
    connect: () => context.socket?.connect(),
    disconnect: () => context.socket?.disconnect(),
    deleteNotification: context.removeNotification,
    subscribeToPushNotifications: context.enablePushNotifications,
    refreshUnreadCount: context.refreshNotifications,
  }
}
