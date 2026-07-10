import { useEffect, useRef, useState } from 'react'
import { useNotifications, Notification } from '@/contexts/NotificationContext'
import {
  IconBell,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconMessage,
  IconInfoCircle,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

const DURATIONS: Record<Notification['type'], number> = {
  message: 8000,
  conversation_started: 8000,
  success: 5000,
  error: 7000,
  warning: 6000,
  info: 5000,
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return (
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40'>
          <IconCheck className='h-4 w-4 text-green-600 dark:text-green-400' />
        </span>
      )
    case 'error':
      return (
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40'>
          <IconAlertTriangle className='h-4 w-4 text-red-600 dark:text-red-400' />
        </span>
      )
    case 'warning':
      return (
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40'>
          <IconAlertTriangle className='h-4 w-4 text-amber-600 dark:text-amber-400' />
        </span>
      )
    case 'message':
    case 'conversation_started':
      return (
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40'>
          <IconMessage className='h-4 w-4 text-blue-600 dark:text-blue-400' />
        </span>
      )
    default:
      return (
        <span className='flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40'>
          <IconInfoCircle className='h-4 w-4 text-indigo-600 dark:text-indigo-400' />
        </span>
      )
  }
}

function getAccentColor(type: Notification['type']) {
  switch (type) {
    case 'success':        return 'border-l-green-500'
    case 'error':          return 'border-l-red-500'
    case 'warning':        return 'border-l-amber-500'
    case 'message':
    case 'conversation_started': return 'border-l-blue-500'
    default:               return 'border-l-indigo-500'
  }
}

/* ── Individual Toast Item ── */
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Notification
  onDismiss: (id: string) => void
}) {
  const duration = DURATIONS[toast.type] ?? 5000
  const [progress, setProgress] = useState(100)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(Date.now())
  const [exiting, setExiting] = useState(false)

  const dismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 280)
  }

  // countdown bar
  useEffect(() => {
    startRef.current = Date.now()
    const tick = 50
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      const remaining = Math.max(0, 1 - elapsed / duration)
      setProgress(remaining * 100)
      if (elapsed >= duration) {
        clearInterval(intervalRef.current!)
        dismiss()
      }
    }, tick)
    return () => clearInterval(intervalRef.current!)
  }, []) // run once on mount

  return (
    <div
      className={cn(
        'relative flex min-w-[320px] max-w-[400px] items-start gap-3 overflow-hidden',
        'rounded-xl border border-l-4 bg-white/95 dark:bg-zinc-900/95 p-4 shadow-2xl',
        'backdrop-blur-md transition-all duration-300',
        getAccentColor(toast.type),
        exiting
          ? 'opacity-0 translate-x-full'
          : 'opacity-100 translate-x-0 animate-in slide-in-from-right-4 fade-in duration-300'
      )}
      role='alert'
    >
      {/* Icon */}
      <div className='mt-0.5 flex-shrink-0'>{getIcon(toast.type)}</div>

      {/* Content */}
      <div className='flex-1 min-w-0 pr-2'>
        <p className='font-semibold text-sm text-foreground leading-snug line-clamp-1'>
          {toast.title}
        </p>
        <p className='text-xs text-muted-foreground mt-0.5 line-clamp-2'>
          {toast.message}
        </p>
        {toast.senderName && (
          <p className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1'>
            <IconBell className='h-3 w-3' />
            from <span className='font-medium text-foreground'>{toast.senderName}</span>
          </p>
        )}
        {toast.actionUrl && toast.actionLabel && (
          <a
            href={toast.actionUrl}
            className='mt-1.5 inline-block text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2'
            onClick={dismiss}
          >
            {toast.actionLabel} →
          </a>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        className='flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors rounded-md p-0.5 hover:bg-muted'
        aria-label='Close'
      >
        <IconX className='h-4 w-4' />
      </button>

      {/* Progress bar */}
      <div className='absolute bottom-0 left-0 h-0.5 bg-muted w-full'>
        <div
          className='h-full bg-primary/50 transition-none'
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

/* ── Toast Container ── */
export function NotificationToast() {
  const { toasts, dismissToast } = useNotifications()

  // Show max 4 toasts at once
  const visibleToasts = toasts.slice(0, 4)

  if (visibleToasts.length === 0) return null

  return (
    <div
      className='fixed bottom-4 right-4 z-[200] flex flex-col gap-2.5 items-end pointer-events-none'
      aria-live='polite'
      aria-label='Notifications'
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className='pointer-events-auto'>
          <ToastItem toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  )
}
