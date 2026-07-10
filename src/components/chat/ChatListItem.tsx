import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo } from 'react'
import { IconMapPin, IconPackage } from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// Enable relative time formatting
dayjs.extend(relativeTime)

/**
 * Message object type
 */
interface Message {
  content: string
  senderName: string
  timestamp: string | Date
}

/**
 * Load metadata type
 */
interface Load {
  loadId?: string | number
  loadNumber?: number
  loadLabel?: string
  loadRoute?: string
  loadMaterial?: string
  loadStatus?: string
  isArchived?: boolean
}

/**
 * User object with load and messaging info
 */
interface ChatUser extends Load {
  id: string
  fullName?: string
  email: string
  profile?: string
  isOnline: boolean
  lastMessage?: Message
  unreadCount?: number
}

/**
 * Props for ChatListItem component
 */
interface ChatListItemProps {
  user: ChatUser
  isTypingByUserId: Record<string, boolean>
  isSelected: boolean
  onClick: () => void
}

/**
 * Displays a formatted user/load item in a chat list
 */
export default function ChatListItem({
  user,
  isTypingByUserId,
  isSelected,
  onClick,
}: ChatListItemProps) {
  const { displayName, loadText, loadMeta, titleText, lastMessageText } = useMemo(
    () => computeDisplayValues(user, isTypingByUserId),
    [user, isTypingByUserId]
  )

  const getAvatarInitials = () => {
    const name = displayName ?? 'U'
    return name.slice(0, 2).toUpperCase()
  }

  const isTyping = isTypingByUserId[user.id] ?? false
  const hasUnread = (user.unreadCount ?? 0) > 0

  return (
    <button
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all duration-200 hover:border-border hover:bg-muted/50',
        isSelected && 'border-primary/20 bg-primary/5 shadow-sm',
        hasUnread && !isSelected && 'bg-muted/30'
      )}
      onClick={onClick}
      title={titleText}
      aria-pressed={isSelected}
      aria-label={`Chat with ${displayName}`}
    >
      {isSelected && (
        <span className="absolute left-0 top-2 h-[calc(100%-1rem)] w-1 rounded-r-full bg-primary" />
      )}

      {/* Avatar Section */}
      <div className="relative shrink-0">
        <Avatar className={cn('h-10 w-10 border', hasUnread && 'ring-2 ring-primary/20')}>
          <AvatarImage src={user.profile} alt={user.fullName || user.email} />
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getAvatarInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Online Indicator */}
        {user.isOnline && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500"
            aria-label="Online"
          />
        )}
      </div>

      {/* Content Section */}
      <div className="min-w-0 flex-1 text-left">
        {/* Header: Name, timestamp, and load badge */}
        <HeaderRow
          displayName={displayName}
          loadText={loadText}
          lastMessage={user.lastMessage}
          hasUnread={hasUnread}
        />

        {/* Metadata Row: Route, Material, Status */}
        {user.loadId && (loadMeta || user.loadStatus || user.isArchived) && (
          <MetadataRow
            loadMeta={loadMeta}
            loadStatus={user.loadStatus}
            isArchived={user.isArchived}
            hasUnread={hasUnread}
          />
        )}

        {/* Message Preview & Unread Badge */}
        <MessageRow
          lastMessageText={lastMessageText}
          isTyping={isTyping}
          unreadCount={user.unreadCount}
          hasUnread={hasUnread}
        />
      </div>
    </button>
  )
}

/**
 * Header row displaying user name, load badge, and timestamp
 */
function HeaderRow({
  displayName,
  loadText,
  lastMessage,
  hasUnread,
}: {
  displayName: string
  loadText: string
  lastMessage?: Message
  hasUnread: boolean
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm leading-5 text-foreground',
            hasUnread ? 'font-bold' : 'font-semibold'
          )}
          title={displayName}
        >
          {displayName}
        </span>
        {lastMessage && (
          <time className={cn('shrink-0 whitespace-nowrap text-[11px]', hasUnread ? 'font-semibold text-primary' : 'text-muted-foreground')}>
            {dayjs(lastMessage.timestamp).fromNow()}
          </time>
        )}
      </div>
      {loadText && (
        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-4 text-primary">
          <IconPackage className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{loadText}</span>
        </span>
      )}
    </div>
  )
}

/**
 * Metadata row displaying load route, material, and status
 */
function MetadataRow({
  loadMeta,
  loadStatus,
  isArchived,
  hasUnread,
}: {
  loadMeta: string
  loadStatus?: string
  isArchived?: boolean
  hasUnread: boolean
}) {
  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      {loadMeta && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <IconMapPin className="h-3 w-3 shrink-0" />
          <span className={cn('min-w-0 truncate', hasUnread && 'text-foreground/80')}>{loadMeta}</span>
        </span>
      )}
      {loadStatus && !isArchived && (
        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize', getStatusClass(loadStatus))}>
          {loadStatus}
        </span>
      )}
      {isArchived && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          closed
        </span>
      )}
    </div>
  )
}

/**
 * Message preview row with typing indicator and unread badge
 */
function MessageRow({
  lastMessageText,
  isTyping,
  unreadCount,
  hasUnread,
}: {
  lastMessageText: string
  isTyping: boolean
  unreadCount?: number
  hasUnread: boolean
}) {
  return (
    <div className="mt-1.5 flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground',
          isTyping && 'font-medium text-primary'
        )}
      >
        {lastMessageText}
      </span>
      {(unreadCount ?? 0) > 0 && (
        <Badge className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs shadow-sm">
          {unreadCount}
        </Badge>
      )}
    </div>
  )
}

/**
 * Computes all display values for the chat list item
 * Memoized to avoid recalculation on every render
 */
function computeDisplayValues(
  user: ChatUser,
  isTypingByUserId: Record<string, boolean>
) {
  const displayName = user.fullName || user.email || 'Unknown'

  const loadText = user.loadLabel
    ? user.loadLabel
    : user.loadNumber
      ? `Load ${user.loadNumber}`
      : user.loadId
        ? `Load ${String(user.loadId).slice(-6)}`
        : ''

  const loadRoute = user.loadRoute || ''
  const loadMeta = [loadRoute, user.loadMaterial].filter(Boolean).join(' · ')

  const titleText = user.loadId
    ? [displayName, loadText, loadMeta, user.loadStatus].filter(Boolean).join(' · ')
    : displayName

  const isTyping = isTypingByUserId[user.id] ?? false
  const lastMessageText = isTyping
    ? 'typing...'
    : user.lastMessage
      ? formatLastMessage(user.lastMessage)
      : 'No messages yet'

  return {
    displayName,
    loadText,
    loadMeta,
    titleText,
    lastMessageText,
  }
}

/**
 * Formats the last message for display
 */
function formatLastMessage(message: Message): string {
  const prefix = message.senderName === 'You' ? 'You: ' : ''
  const content = message.content?.trim() || 'Attachment'
  return `${prefix}${content}`
}

function getStatusClass(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'open') return 'bg-emerald-50 text-emerald-700'
  if (normalized === 'assigned') return 'bg-amber-50 text-amber-700'
  if (normalized === 'in_transit') return 'bg-sky-50 text-sky-700'
  if (normalized === 'delivered') return 'bg-slate-100 text-slate-700'
  if (normalized === 'canceled' || normalized === 'cancelled') return 'bg-red-50 text-red-700'
  return 'bg-muted text-muted-foreground'
}

// Export types for use in other components
export type { ChatUser, ChatListItemProps }
