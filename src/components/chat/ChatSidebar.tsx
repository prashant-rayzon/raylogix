import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IconArchive,
  IconCircleCheck,
  IconFilter,
  IconMessages,
  IconRefresh,
  IconSearch,
  IconSortDescending,
  IconTruck,
  IconUserPlus,
  IconWifi,
  IconX,
} from '@tabler/icons-react'

import type { ChatUser } from '@/api/schema'
import { Button } from '@/components/custom/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ChatListItem from './ChatListItem'

type ChatFilter = 'all' | 'unread' | 'online' | 'loads' | 'archived'
type ChatSort = 'recent' | 'unread' | 'name' | 'load'
type LoadOption = {
  value: string
  label: string
  route?: string
  material?: string
  count: number
}

interface ChatSidebarProps {
  users: ChatUser[]
  selectedUser?: ChatUser | null
  isTypingByUserId: Record<string, boolean>
  error?: string | null
  loading?: boolean
  onPickUser: (id: string) => void
  onNewChat: () => void
  onRetry?: () => void
}

const filters: Array<{ value: ChatFilter; label: string; icon: ReactNode }> = [
  { value: 'all', label: 'All', icon: <IconMessages size={13} /> },
  { value: 'unread', label: 'Unread', icon: <IconCircleCheck size={13} /> },
  { value: 'online', label: 'Online', icon: <IconWifi size={13} /> },
  { value: 'loads', label: 'Loads', icon: <IconFilter size={13} /> },
  { value: 'archived', label: 'Closed', icon: <IconArchive size={13} /> },
]

const getChatKey = (user?: ChatUser | null) => user?.conversationId || user?.id || ''

const getDisplayName = (user: ChatUser) =>
  user.fullName || user.username || user.email || user.name || 'Unknown'

const getLastMessageTime = (user: ChatUser) => {
  const timestamp = user.lastMessage?.timestamp
  return timestamp ? new Date(timestamp).getTime() : 0
}

const inactiveLoadStatuses = new Set([
  'delivered',
  'canceled',
  'cancelled',
  'closed',
  'completed',
  'rejected',
])

const isActiveLoadConversation = (user: ChatUser) => {
  if (!user.loadId && !user.loadNumber && !user.loadLabel) return false
  if (user.isArchived) return false
  const status = String(user.loadStatus || '').toLowerCase()
  return !status || !inactiveLoadStatuses.has(status)
}

const getLoadRequestKey = (user: ChatUser) => {
  if (user.loadId) return `id:${user.loadId}`
  if (user.loadNumber) return `number:${user.loadNumber}`
  if (user.loadLabel) return `label:${user.loadLabel}`
  return ''
}

const getLoadRequestLabel = (user: ChatUser) => {
  if (user.loadLabel) return user.loadLabel
  if (user.loadNumber) return `Load ${user.loadNumber}`
  if (user.loadId) return `Load ${String(user.loadId).slice(-6)}`
  return 'Load'
}

const matchesSearch = (user: ChatUser, query: string) => {
  if (!query) return true

  const haystack = [
    user.fullName,
    user.username,
    user.email,
    user.name,
    user.loadLabel,
    user.loadNumber,
    user.loadRoute,
    user.loadMaterial,
    user.loadStatus,
    user.lastMessage?.content,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

const matchesFilter = (user: ChatUser, filter: ChatFilter) => {
  if (filter === 'unread') return (user.unreadCount || 0) > 0
  if (filter === 'online') return !!user.isOnline
  if (filter === 'loads') return isActiveLoadConversation(user)
  if (filter === 'archived') return !!user.isArchived
  return true
}

export default function ChatSidebar({
  users,
  selectedUser,
  isTypingByUserId,
  error,
  loading,
  onPickUser,
  onNewChat,
  onRetry,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ChatFilter>('all')
  const [sortBy, setSortBy] = useState<ChatSort>('recent')
  const [selectedLoad, setSelectedLoad] = useState('all')

  const query = search.trim().toLowerCase()
  const selectedKey = getChatKey(selectedUser)

  const counts = useMemo(() => {
    return {
      all: users.length,
      unread: users.filter((user) => (user.unreadCount || 0) > 0).length,
      online: users.filter((user) => user.isOnline).length,
      loads: users.filter(isActiveLoadConversation).length,
      archived: users.filter((user) => user.isArchived).length,
    }
  }, [users])

  const loadOptions = useMemo<LoadOption[]>(() => {
    const options = new Map<string, LoadOption>()

    users.forEach((user) => {
      if (!isActiveLoadConversation(user)) return
      const value = getLoadRequestKey(user)
      if (!value) return

      const existing = options.get(value)
      if (existing) {
        existing.count += 1
        return
      }

      options.set(value, {
        value,
        label: getLoadRequestLabel(user),
        route: user.loadRoute,
        material: user.loadMaterial,
        count: 1,
      })
    })

    return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [users])

  const visibleFilters = useMemo(
    () => filters.filter((item) => item.value === 'all' || counts[item.value] > 0 || filter === item.value),
    [counts, filter]
  )

  const selectedLoadOption = useMemo(
    () => loadOptions.find((load) => load.value === selectedLoad),
    [loadOptions, selectedLoad]
  )

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => matchesSearch(user, query))
      .filter((user) => matchesFilter(user, filter))
      .filter((user) => selectedLoad === 'all' || getLoadRequestKey(user) === selectedLoad)
      .slice()
      .sort((a, b) => {
        if (sortBy === 'unread') {
          const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0)
          if (unreadDiff !== 0) return unreadDiff
          return getLastMessageTime(b) - getLastMessageTime(a)
        }
        if (sortBy === 'name') return getDisplayName(a).localeCompare(getDisplayName(b))
        if (sortBy === 'load') {
          const aLoad = a.loadNumber || a.loadLabel || a.loadId || ''
          const bLoad = b.loadNumber || b.loadLabel || b.loadId || ''
          return String(aLoad).localeCompare(String(bLoad))
        }
        return getLastMessageTime(b) - getLastMessageTime(a)
      })
  }, [filter, query, selectedLoad, sortBy, users])

  const hasActiveFilters = !!query || filter !== 'all' || selectedLoad !== 'all'

  const clearFilters = () => {
    setSearch('')
    setFilter('all')
    setSelectedLoad('all')
  }

  return (
    <aside className="flex w-full flex-col gap-2 sm:w-72 lg:w-80 2xl:w-86">
      <div className="sticky top-0 z-10 -mx-4 border-b bg-background px-4 pb-3 shadow-sm sm:static sm:z-auto sm:mx-0 sm:border-b-0 sm:p-0 sm:shadow-none">
        <div className="flex items-center justify-between py-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-2xl font-bold">Chats</h1>
            <Badge variant="secondary" className="text-xs">
              {counts.all}
            </Badge>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-lg"
                  onClick={onNewChat}
                  aria-label="Start a new conversation"
                >
                  <IconUserPlus size={20} className="stroke-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="relative">
          <IconSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 stroke-muted-foreground"
          />
          <input
            type="text"
            aria-label="Search chats"
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Search name, load, route..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch('')}
            >
              <IconX size={16} />
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(132px,0.62fr)] md:items-end">
          {loadOptions.length > 0 && (
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Load request
                </span>
               
              </div>
              <Select value={selectedLoad} onValueChange={setSelectedLoad}>
                <SelectTrigger className="h-9 bg-background px-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <IconTruck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-left">
                      {selectedLoad === 'all'
                        ? 'All active loads'
                        : `${selectedLoadOption?.label || 'Selected load'} (${selectedLoadOption?.count || 0})`}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active load requests</SelectItem>
                  {loadOptions.map((load) => (
                    <SelectItem key={load.value} value={load.value}>
                      <div className="min-w-0">
                        <div className="truncate text-sm">
                          {load.label} ({load.count})
                        </div>
                        {load.route && (
                          <div className="truncate text-xs text-muted-foreground">
                            {load.route}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={cn(' min-w-0 gap-2', loadOptions.length === 0 && 'md:col-span-2')}>
             {selectedLoad !== 'all' && (
                  <button
                    type="button"
                    className="text-[11px] font-medium text-primary hover:underline block ml-auto"
                    onClick={() => setSelectedLoad('all')}
                  >
                    Reset
                  </button>
                )}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as ChatSort)}>
              <SelectTrigger className="h-9 min-w-0 flex-1 bg-background px-3 text-xs">
                <IconSortDescending className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent first</SelectItem>
                <SelectItem value="unread">Unread first</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="load">Load number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {visibleFilters.map((item) => {
            const count = counts[item.value]
            return (
              <button
                key={item.value}
                type="button"
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  filter === item.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
                )}
                onClick={() => setFilter(item.value)}
              >
                {item.icon}
                {item.label}
                <span className={cn('text-[10px]', filter === item.value ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ScrollArea className="-mx-3 h-full px-3">
        {error ? (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-red-500">Error: {error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={onRetry || (() => window.location.reload())}
              >
                <IconRefresh className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          </div>
        ) : loading && users.length === 0 ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl px-3 py-3">
                <div className="h-11 w-11 rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center">
            <IconMessages className="mx-auto h-12 w-12 stroke-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {hasActiveFilters ? 'No conversations match your filters' : 'No conversations yet'}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map((chatUser) => (
              <ChatListItem
                key={chatUser.conversationId || chatUser.id}
                user={chatUser as any}
                isTypingByUserId={isTypingByUserId}
                isSelected={selectedKey === getChatKey(chatUser)}
                onClick={() => onPickUser(getChatKey(chatUser))}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
