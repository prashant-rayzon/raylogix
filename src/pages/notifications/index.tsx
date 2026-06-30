import { useState } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { Notification } from '@/contexts/NotificationContext'
import { Button } from '@/components/custom/button'
import {
  IconCheck,
  IconTrash,
  IconAlertCircle,
  IconAlertTriangle,
  IconMessage,
  IconInfoCircle,
  IconFilter,
  IconBellOff,
  IconRefresh,
  IconBell,
  IconExternalLink,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

type NotificationFilter = 'all' | 'unread' | 'success' | 'error' | 'warning' | 'info' | 'message'

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return new Date(date).toLocaleDateString()
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return (
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
          <IconCheck className='h-5 w-5 text-green-600 dark:text-green-400' />
        </span>
      )
    case 'error':
      return (
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30'>
          <IconAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
        </span>
      )
    case 'warning':
      return (
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30'>
          <IconAlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400' />
        </span>
      )
    case 'message':
    case 'conversation_started':
      return (
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30'>
          <IconMessage className='h-5 w-5 text-blue-600 dark:text-blue-400' />
        </span>
      )
    default:
      return (
        <span className='flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30'>
          <IconInfoCircle className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
        </span>
      )
  }
}

function getAccentBorder(type: Notification['type']) {
  switch (type) {
    case 'success':        return 'border-l-green-500'
    case 'error':          return 'border-l-red-500'
    case 'warning':        return 'border-l-amber-500'
    case 'message':
    case 'conversation_started': return 'border-l-blue-500'
    default:               return 'border-l-indigo-500'
  }
}

const FILTER_OPTIONS: { value: NotificationFilter; label: string; icon: any }[] = [
  { value: 'all',     label: 'All',       icon: IconBell },
  { value: 'unread',  label: 'Unread',    icon: IconBell },
  { value: 'message', label: 'Messages',  icon: IconMessage },
  { value: 'success', label: 'Success',   icon: IconCheck },
  { value: 'error',   label: 'Errors',    icon: IconAlertCircle },
  { value: 'warning', label: 'Warnings',  icon: IconAlertTriangle },
  { value: 'info',    label: 'Info',      icon: IconInfoCircle },
]

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    removeNotification,
    markAllAsRead,
    clearNotifications,
    refreshNotifications,
  } = useNotifications()

  const [filter, setFilter] = useState<NotificationFilter>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.read
    if (filter === 'message') return n.type === 'message' || n.type === 'conversation_started'
    return n.type === filter
  })

  const filterCount = (f: NotificationFilter) => {
    if (f === 'all') return notifications.length
    if (f === 'unread') return unreadCount
    if (f === 'message') return notifications.filter(n => n.type === 'message' || n.type === 'conversation_started').length
    return notifications.filter(n => n.type === f).length
  }

  return (
    <div className='min-h-screen bg-background p-4 md:p-8'>
      <div className='max-w-5xl mx-auto'>
        {/* ── Header ── */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight flex items-center gap-3'>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10'>
                <IconBell className='h-6 w-6 text-primary' />
              </span>
              Notifications
            </h1>
            <p className='text-muted-foreground mt-2 ml-1'>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up! No unread notifications.'}
            </p>
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            <Button
              variant='outline'
              size='sm'
              onClick={refreshNotifications}
              disabled={isLoading}
              className='flex items-center gap-2'
            >
              <IconRefresh className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={markAllAsRead}
                className='flex items-center gap-2'
              >
                <IconCheck className='h-4 w-4' />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={clearNotifications}
                className='flex items-center gap-2 text-destructive hover:text-destructive'
              >
                <IconTrash className='h-4 w-4' />
                Clear all
              </Button>
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
          {/* ── Filters ── */}
          <div className='md:col-span-1'>
            <div className='bg-card border rounded-xl p-3 sticky top-4 space-y-1'>
              <div className='flex items-center gap-2 px-2 py-1 mb-2'>
                <IconFilter className='h-4 w-4 text-muted-foreground' />
                <span className='font-semibold text-sm'>Filter</span>
              </div>
              {FILTER_OPTIONS.map((option) => {
                const Icon = option.icon
                const count = filterCount(option.value)
                return (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all',
                      filter === option.value
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className='flex items-center gap-2'>
                      <Icon className='h-4 w-4' />
                      {option.label}
                    </span>
                    {count > 0 && (
                      <span className={cn(
                        'text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center font-semibold',
                        filter === option.value
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Notifications List ── */}
          <div className='md:col-span-3'>
            {isLoading && notifications.length === 0 ? (
              <div className='bg-card border rounded-xl p-12 text-center'>
                <IconRefresh className='h-10 w-10 text-muted-foreground/40 mx-auto mb-3 animate-spin' />
                <p className='text-sm text-muted-foreground'>Loading notifications…</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className='bg-card border rounded-xl p-12 text-center'>
                <IconBellOff className='h-12 w-12 text-muted-foreground/30 mx-auto mb-4' />
                <p className='font-medium text-foreground/70 mb-1'>
                  {filter === 'unread' ? 'No unread notifications' : `No ${filter === 'all' ? '' : filter + ' '}notifications`}
                </p>
                <p className='text-sm text-muted-foreground mb-5'>
                  {filter === 'all' ? "You're all caught up!" : 'Try a different filter.'}
                </p>
                <Link to='/dashboard'>
                  <Button variant='outline' size='sm'>
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'border border-l-4 rounded-xl p-4 transition-all hover:shadow-md bg-card',
                      getAccentBorder(notification.type),
                      !notification.read && 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div className='flex items-start gap-4'>
                      <div className='flex-shrink-0'>{getIcon(notification.type)}</div>

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-start justify-between gap-2'>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <p className={cn(
                                'text-sm',
                                !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                              )}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className='flex-shrink-0 h-2 w-2 rounded-full bg-primary' />
                              )}
                            </div>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                              {notification.message}
                            </p>
                            {notification.senderName && (
                              <p className='text-xs text-muted-foreground mt-0.5'>
                                From: <span className='font-medium'>{notification.senderName}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className='flex items-center justify-between mt-3'>
                          <p className='text-xs text-muted-foreground/60'>
                            {timeAgo(new Date(notification.timestamp))}
                          </p>
                          <div className='flex items-center gap-2'>
                            {notification.actionUrl && notification.actionLabel && (
                              <Link
                                to={notification.actionUrl}
                                className='text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1'
                              >
                                {notification.actionLabel}
                                <IconExternalLink className='h-3 w-3' />
                              </Link>
                            )}
                            {!notification.read && (
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => markAsRead(notification.id)}
                                className='h-7 px-2 text-xs text-muted-foreground hover:text-foreground'
                              >
                                <IconCheck className='h-3 w-3 mr-1' />
                                Read
                              </Button>
                            )}
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => removeNotification(notification.id)}
                              className='h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                            >
                              <IconTrash className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
