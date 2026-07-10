import { useState } from 'react'
import { IconBell, IconBellOff, IconRefresh } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/custom/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useNotifications } from '@/contexts/NotificationContext'
import { cn } from '@/lib/utils'
import { Notification } from '@/contexts/NotificationContext'
import { Link } from 'react-router-dom'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconMessage,
  IconInfoCircle,
  IconTrash,
} from '@tabler/icons-react'

function getTypeIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return <IconCheck className='h-4 w-4 text-green-500' />
    case 'error':
      return <IconAlertCircle className='h-4 w-4 text-red-500' />
    case 'warning':
      return <IconAlertTriangle className='h-4 w-4 text-amber-500' />
    case 'message':
    case 'conversation_started':
      return <IconMessage className='h-4 w-4 text-blue-500' />
    default:
      return <IconInfoCircle className='h-4 w-4 text-indigo-500' />
  }
}

function getAccentClass(type: Notification['type']) {
  switch (type) {
    case 'success':        return 'border-l-2 border-l-green-500'
    case 'error':          return 'border-l-2 border-l-red-500'
    case 'warning':        return 'border-l-2 border-l-amber-500'
    case 'message':
    case 'conversation_started': return 'border-l-2 border-l-blue-500'
    default:               return 'border-l-2 border-l-indigo-500'
  }
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NotificationIcon() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    refreshNotifications,
    enablePushNotifications,
    pushSupported,
    pushPermission,
    pushSubscribed,
    error,
  } = useNotifications()
  const [open, setOpen] = useState(false)
  const [isEnablingPush, setIsEnablingPush] = useState(false)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      // Refresh from server every time the dropdown opens
      refreshNotifications()
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id)
    if (notification.actionUrl) {
      setOpen(false)
      window.location.href = notification.actionUrl
    }
  }

  const handleEnablePush = async () => {
    try {
      setIsEnablingPush(true)
      await enablePushNotifications()
    } finally {
      setIsEnablingPush(false)
    }
  }

  const recentNotifications = notifications.slice(0, 8)

  return (
    <TooltipProvider delayDuration={0}>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='relative h-10 w-10'
                aria-label='Notifications'
              >
                <IconBell className='h-5 w-5' />
                {unreadCount > 0 && (
                  <span className='absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-background'>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side='bottom'>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align='end' className='w-96 p-0 overflow-hidden'>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 bg-muted/30 border-b'>
            <div className='flex items-center gap-2'>
              <IconBell className='h-4 w-4 text-muted-foreground' />
              <span className='font-semibold text-sm'>Notifications</span>
              {unreadCount > 0 && (
                <span className='inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold'>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className='flex items-center gap-1'>
              <button
                onClick={() => refreshNotifications()}
                disabled={isLoading}
                className='p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50'
                title='Refresh'
              >
                <IconRefresh className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className='text-xs text-primary hover:text-primary/80 font-medium px-2 py-1 rounded-md hover:bg-muted transition-colors'
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => { clearNotifications(); setOpen(false) }}
                  className='p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors'
                  title='Clear all'
                >
                  <IconTrash className='h-3.5 w-3.5' />
                </button>
              )}
            </div>
          </div>

          {pushSupported && pushPermission !== 'denied' && !pushSubscribed && (
            <div className='border-b bg-blue-50 px-4 py-3 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100'>
              <div className='flex items-start gap-3'>
                <IconBell className='mt-0.5 h-4 w-4 flex-shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-sm font-semibold'>Chrome push is off</p>
                  <p className='mt-0.5 text-xs opacity-80'>
                    Enable it to receive chat and action notifications even after a DB reset.
                  </p>
                  {error && (
                    <p className='mt-1 text-xs text-red-600 dark:text-red-300'>
                      {error}
                    </p>
                  )}
                </div>
                <Button
                  type='button'
                  size='sm'
                  className='h-8 shrink-0 px-3 text-xs'
                  disabled={isEnablingPush}
                  onClick={handleEnablePush}
                >
                  {isEnablingPush ? 'Enabling...' : 'Enable'}
                </Button>
              </div>
            </div>
          )}

          {pushSupported && pushPermission === 'denied' && (
            <div className='border-b bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100'>
              <div className='flex items-start gap-3'>
                <IconAlertTriangle className='mt-0.5 h-4 w-4 flex-shrink-0' />
                <div>
                  <p className='text-sm font-semibold'>Chrome notifications are blocked</p>
                  <p className='mt-0.5 text-xs opacity-80'>
                    Allow notifications in Chrome site settings, then open this menu again.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          {notifications.length === 0 ? (
            <div className='py-12 text-center'>
              <IconBellOff className='h-10 w-10 text-muted-foreground/40 mx-auto mb-3' />
              <p className='text-sm text-muted-foreground font-medium'>No notifications</p>
              <p className='text-xs text-muted-foreground/60 mt-1'>You're all caught up!</p>
            </div>
          ) : (
            <div className='max-h-[420px] overflow-y-auto divide-y divide-border/50'>
              {recentNotifications.map((notification, index) => {
                const notificationKey = [
                  notification.id,
                  notification.messageId,
                  notification.conversationId,
                  notification.timestamp?.toString(),
                  index,
                ].filter(Boolean).join('-')

                return (
                <div
                  key={notificationKey}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    getAccentClass(notification.type),
                    !notification.read && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className='mt-0.5 flex-shrink-0'>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-1'>
                      <p className={cn(
                        'text-sm line-clamp-1',
                        !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className='flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1' />
                      )}
                    </div>
                    <p className='text-xs text-muted-foreground line-clamp-2 mt-0.5'>
                      {notification.message}
                    </p>
                    <p className='text-[11px] text-muted-foreground/60 mt-1'>
                      {timeAgo(new Date(notification.timestamp))}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeNotification(notification.id)
                    }}
                    className='flex-shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10'
                    title='Remove'
                  >
                    <IconTrash className='h-3 w-3' />
                  </button>
                </div>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <DropdownMenuSeparator />
          <Link
            to='/notifications'
            onClick={() => setOpen(false)}
            className='flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors'
          >
            View all notifications →
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
