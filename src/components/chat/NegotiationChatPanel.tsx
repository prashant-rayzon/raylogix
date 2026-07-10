import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import {
  IconArrowBackUp,
  IconArrowDown,
  IconCheck,
  IconChecks,
  IconCopy,
  IconDownload,
  IconFlag,
  IconLoader2,
  IconLock,
  IconMessage,
  IconMicrophone,
  IconMoodSmile,
  IconPaperclip,
  IconPlayerStop,
  IconSend,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/custom/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AttachmentRenderer } from '@/pages/chats/MessageTypeComponents'
import { formatMessageTime } from '@/pages/chats/chatUtils'
import { useChat } from '@/pages/chats/hooks/useChat'
import { deleteFile as deleteUploadedFile } from '@/api/services/chat/files.service'
import { format as formatDate, isToday, isYesterday } from 'date-fns'

const API_ORIGIN = (import.meta.env.VITE_API_BASE || 'http://101.53.150.120:5000').replace(/\/api\/?$/, '')
const reactionOptions = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '👏', label: 'Clap' },
]

const formatRecordingTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Improved date formatting with Today/Yesterday support
const formatMessageDate = (date: Date): string => {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return formatDate(date, 'd MMM, yyyy')
}

const getFileUrl = (url?: string) => {
  if (!url) return ''
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

const getAttachmentFilename = (attachment: any) => {
  if (attachment?.id) return String(attachment.id)
  if (!attachment?.url) return ''
  return String(attachment.url).split('/').filter(Boolean).pop() || ''
}

type Props = {
  conversationId: string | null
  recipientId: string | null
  loadId?: string | null
  title: string
}

type EditingMessage = {
  id: string
  originalContent: string
}

type SelectedPhoto = {
  url: string
  name: string
}

// MessageBubble with proper ref forwarding
const MessageBubble = React.forwardRef<HTMLDivElement, any>(
  (
    {
      msg,
      isMe,
      currentUserId,
      onReply,
      onDelete,
      onEdit,
      onCopy,
      onScrollToMessage,
      onPhotoClick,
      showActions,
      setShowActions,
      addReaction,
      removeReaction,
    }: any,
    ref
  ) => {
    const currentUserReactionEmojis = (msg.reactions || [])
      .filter((r: any) => String(r?.userId || '') === String(currentUserId || ''))
      .map((r: any) => r.emoji)
      .filter(Boolean)
    const [isHovered, setIsHovered] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showReactionPicker, setShowReactionPicker] = useState(false)
    const [isAddingReaction, setIsAddingReaction] = useState(false)

    const hasReacted = (emoji: string) => currentUserReactionEmojis.includes(emoji)

    const handleToggleReaction = async (emoji: string) => {
      setIsAddingReaction(true)
      try {
        if (hasReacted(emoji)) {
          await removeReaction(msg.id, emoji)
        } else {
          await addReaction(msg.id, emoji)
        }
      } finally {
        setIsAddingReaction(false)
        setShowActions(false)
      }
    }

    return (
      <>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-500">
                <IconTrash size={20} />
                Delete Message
              </DialogTitle>
              <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="my-2 rounded-lg bg-muted/50 p-3">
              <p className="line-clamp-3 text-sm text-muted-foreground">&quot;{msg.content || 'Attachment'}&quot;</p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { onDelete(msg.id); setShowDeleteDialog(false) }}>
                <IconTrash size={16} className="mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div
          ref={ref}
          className="group relative flex flex-col"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false)
            setShowReactionPicker(false)
            setShowActions(false)
          }}
        >
          <div
            className={cn(
              'relative break-words rounded-lg px-3.5 py-2.5 shadow-sm transition-all duration-200',
              isMe
                ? 'ml-auto max-w-[85%] rounded-br-none bg-teal-700 text-white sm:max-w-[75%]'
                : 'mr-auto max-w-[85%] rounded-bl-none bg-muted sm:max-w-[75%]'
            )}
          >
            {!isMe ? (
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{msg.senderName}</span>
            ) : null}

            {msg.replyTo ? (
              <button
                type="button"
                className={cn(
                  'mb-2 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs transition-colors hover:bg-background/20',
                  isMe ? 'border-white/70 bg-white/10' : 'border-primary bg-background/40'
                )}
                onClick={() => onScrollToMessage(msg.replyTo.messageId)}
              >
                <span className="block font-medium opacity-90">{msg.replyTo.sender}</span>
                <span className="block truncate opacity-75">{msg.replyTo.content}</span>
              </button>
            ) : null}

            {msg.attachments && msg.attachments.length > 0 ? (
              <div className="mb-2 space-y-2">
                {msg.attachments.map((att: any, idx: number) => (
                  <AttachmentRenderer key={idx} attachment={att} onPhotoClick={onPhotoClick} />
                ))}
              </div>
            ) : null}

            {msg.content ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p> : null}
            {msg.isEdited ? <span className="ml-1.5 text-[10px] opacity-70">(edited)</span> : null}

            <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
              <span>{formatMessageTime(msg.timestamp)}</span>
              {isMe ? (
                msg.isRead ? <IconChecks size={14} stroke={2.2} className="text-cyan-200" /> : <IconCheck size={14} stroke={2.2} className="text-white/70" />
              ) : null}
            </div>
          </div>

          {(msg.reactions?.length || 0) > 0 ? (
            <div className={cn('mt-1 flex flex-wrap gap-1', isMe ? 'justify-end pr-1' : 'justify-start pl-1')}>
              {(() => {
                const counts = new Map<string, number>()
                ;(msg.reactions || []).forEach((r: any) => {
                  if (!r?.emoji) return
                  counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1)
                })
                return Array.from(counts.entries()).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    type="button"
                    disabled={isAddingReaction}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50',
                      hasReacted(emoji)
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/90 hover:bg-muted'
                    )}
                    onClick={() => handleToggleReaction(emoji)}
                  >
                    <span>{emoji}</span>
                    <span className="opacity-80">{count}</span>
                  </button>
                ))
              })()}
            </div>
          ) : null}

          {showReactionPicker ? (
            <div className={cn('absolute -top-14 z-30 flex items-center gap-1 rounded-2xl border bg-background/95 px-2 py-1.5 shadow-2xl backdrop-blur', isMe ? 'right-2' : 'left-2')}>
              {reactionOptions.map((reaction) => (
                <TooltipProvider key={reaction.emoji} delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled={isAddingReaction}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-xl transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:bg-muted disabled:opacity-50',
                          hasReacted(reaction.emoji) && 'bg-primary/10 ring-1 ring-primary/30'
                        )}
                        onClick={() => void handleToggleReaction(reaction.emoji)}
                      >
                        {reaction.emoji}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{reaction.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ) : null}

          {(showActions || isHovered) ? (
            <div className={cn('absolute -top-10 z-20 flex items-center overflow-hidden rounded-full border bg-background/95 px-1 py-0.5 shadow-xl backdrop-blur', isMe ? 'right-2' : 'left-2')}>
              <div className="flex items-center gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => setShowReactionPicker((prev: boolean) => !prev)}
                  title="Add reaction"
                >
                  <IconMoodSmile size={15} />
                </Button>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => onReply(msg)}
                  title="Reply"
                >
                  <IconArrowBackUp size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => onCopy(msg.content || '')}
                  title="Copy message"
                >
                  <IconCopy size={14} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full" 
                  onClick={() => setShowActions(false)}
                  title="Flag message"
                >
                  <IconFlag size={14} />
                </Button>
                {isMe ? (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full" 
                      onClick={() => onEdit(msg.id)}
                      title="Edit message"
                    >
                      <IconMessage size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full text-red-500 hover:bg-red-50" 
                      onClick={() => setShowDeleteDialog(true)}
                      title="Delete message"
                    >
                      <IconTrash size={14} />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </>
    )
  }
)

MessageBubble.displayName = 'MessageBubble'

export function NegotiationChatPanel({ conversationId, recipientId, loadId, title }: Props) {
  const {
    meUserId,
    chatUsers,
    selectedUser,
    setSelectedUser,
    selectedUserMessages,
    isConnected,
    replyTo,
    setReplyTo,
    sendMessage,
    emitTyping,
    deleteMessage,
    editMessage,
    togglePinMessage,
    addReaction,
    removeReaction,
    uploadFile,
  } = useChat()

  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([])
  const [isSending, setIsSending] = useState(false)
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null)
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<BlobPart[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAttachmentsRef = useRef<any[]>([])
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!recipientId) return
    const matchedUser = chatUsers.find((user: any) => {
      if (conversationId && String(user.conversationId || '') === String(conversationId)) return true
      return String(user.id || '') === String(recipientId)
    })
    if (matchedUser) {
      if (selectedUser?.conversationId === matchedUser.conversationId && selectedUser?.id === matchedUser.id) return
      setSelectedUser(matchedUser as any)
      return
    }
    setSelectedUser((prev: any) => {
      const nextId = String(recipientId)
      const nextConversationId = conversationId || undefined
      if (
        prev &&
        String(prev.id || '') === nextId &&
        String(prev.conversationId || '') === String(nextConversationId || '')
      ) {
        return prev
      }

      return {
        id: nextId,
        conversationId: nextConversationId,
        fullName: title,
        username: title,
        email: '',
        isOnline: false,
        loadId: loadId || undefined,
      } as any
    })
  }, [chatUsers, conversationId, recipientId, selectedUser, setSelectedUser, title, loadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [selectedUserMessages.length])

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments
  }, [pendingAttachments])

  // Auto focus input when editing
  useEffect(() => {
    if (editingMessage) {
      inputRef.current?.focus()
    }
  }, [editingMessage])

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(text)
    setToastType(type)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000)
  }, [])

  const conversationLabel = selectedUser?.fullName || selectedUser?.email || title
  const groupedByDate = useMemo(() => {
    const acc: Record<string, any[]> = {}
    const sorted = [...selectedUserMessages].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    for (const msg of sorted) {
      const key = formatMessageDate(new Date(msg.timestamp))
      if (!acc[key]) acc[key] = []
      acc[key].push(msg)
    }
    return acc
  }, [selectedUserMessages])

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (!container) return
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    setShowScrollButton(distanceFromBottom > 160)
  }

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })

  const handleScrollToMessage = (messageId: string) => {
    const target = messageRefs.current.get(messageId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Visual highlight effect
      target.classList.add('highlight')
      setTimeout(() => target.classList.remove('highlight'), 2000)
    }
  }

  const handleCopyMessage = async (content: string) => {
    if (!content) {
      showToast('Nothing to copy', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(content)
      showToast('Message copied to clipboard', 'success')
    } catch (err) {
      showToast('Failed to copy message', 'error')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId)
      showToast('Message deleted', 'success')
    } catch (err) {
      showToast('Failed to delete message', 'error')
    }
  }

  const handleEditMessage = (messageId: string) => {
    const target = selectedUserMessages.find((msg: any) => String(msg.id) === String(messageId))
    if (!target) return
    setEditingMessage({ id: messageId, originalContent: target.content || '' })
    setMessage(target.content || '')
  }

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setMessage('')
  }

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)
    if (!selectedUser) return
    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true)
        emitTyping(selectedUser.id, true)
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        emitTyping(selectedUser.id, false)
      }, 1000)
    } else {
      setIsTyping(false)
      emitTyping(selectedUser.id, false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleEmojiClick = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!selectedUser || selectedUser.isArchived || selectedUser.isBlocked || isSending || isUploading) return
    const text = message.trim()
    if (editingMessage) {
      if (!text) return
      setIsSending(true)
      try {
        if (text !== editingMessage.originalContent.trim()) {
          await editMessage(editingMessage.id, text)
          showToast('Message updated', 'success')
        }
        setMessage('')
        setEditingMessage(null)
        setShowEmojiPicker(false)
      } catch (err) {
        showToast('Failed to update message', 'error')
      } finally {
        setIsSending(false)
      }
      return
    }
    const attachments = pendingAttachments
    if (!text && attachments.length === 0) return
    const firstAttachment = attachments[0]
    let messageType: any = text ? 'text' : 'file'
    if (!text && firstAttachment?.mimeType?.startsWith('image/')) messageType = 'image'
    else if (!text && firstAttachment?.mimeType?.startsWith('video/')) messageType = 'video'
    else if (!text && firstAttachment?.mimeType?.startsWith('audio/')) messageType = 'audio'
    setIsSending(true)
    try {
      await sendMessage({
        recipientId: selectedUser.id,
        content: text || attachments.map((file: any) => file.name).join(', '),
        type: messageType,
        attachments,
        replyToId: replyTo?.messageId,
        loadId: selectedUser.loadId,
        conversationId: selectedUser.conversationId,
      })
      setMessage('')
      pendingAttachmentsRef.current = []
      setPendingAttachments([])
      setShowEmojiPicker(false)
      setReplyTo(null)
      showToast('Message sent', 'success')
    } catch (err) {
      showToast('Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleFileSelect = async (files: FileList) => {
    if (!selectedUser || selectedUser.isArchived || selectedUser.isBlocked || files.length === 0) return
    for (const file of Array.from(files)) {
      try {
        if (file.size > 100 * 1024 * 1024) {
          showToast(`${file.name} exceeds 100MB limit`, 'error')
          continue
        }
        setIsUploading(true)
        setUploadProgress(0)
        const uploadedFile = await uploadFile(file, selectedUser.id, (progress) => setUploadProgress(progress))
        if (!uploadedFile) continue
        setPendingAttachments((prev) => {
          const next = [...prev, {
            ...uploadedFile,
            id: uploadedFile.id || uploadedFile._id || `${file.name}-${Date.now()}`,
            name: uploadedFile.name || file.name,
            size: uploadedFile.size || file.size,
            mimeType: uploadedFile.mimeType || file.type,
            url: uploadedFile.url,
            pendingSince: Date.now(),
          }]
          pendingAttachmentsRef.current = next
          return next
        })
        showToast(`${file.name} ready to send`, 'success')
      } catch (err) {
        showToast(`Failed to upload ${file.name}`, 'error')
      } finally {
        setIsUploading(false)
        setUploadProgress(0)
      }
    }
  }

  const deletePendingAttachmentFile = useCallback((attachment: any) => {
    const filename = getAttachmentFilename(attachment)
    if (!filename) return
    deleteUploadedFile(filename).catch(() => undefined)
  }, [])

  const removePendingAttachment = (id: string, deleteRemote = true) => {
    setPendingAttachments((prev) => {
      const removed = prev.find((attachment) => String(attachment.id) === String(id))
      if (removed && deleteRemote) deletePendingAttachmentFile(removed)
      const next = prev.filter((attachment) => String(attachment.id) !== String(id))
      pendingAttachmentsRef.current = next
      return next
    })
  }

  const clearPendingAttachments = (deleteRemote = true) => {
    setPendingAttachments((prev) => {
      if (deleteRemote) prev.forEach(deletePendingAttachmentFile)
      pendingAttachmentsRef.current = []
      return []
    })
  }

  const triggerFileInput = () => fileInputRef.current?.click()

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) void handleFileSelect(files)
    event.target.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      recordingChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = async () => {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `voice-message-${Date.now()}.webm`, { type: blob.type || 'audio/webm' })
        try {
          setIsUploading(true)
          const uploadedFile = await uploadFile(file, selectedUser?.id || '', (progress) => setUploadProgress(progress))
          if (!uploadedFile) {
            showToast('Failed to upload voice message', 'error')
            return
          }
          setPendingAttachments((prev) => [...prev, {
            ...uploadedFile,
            id: uploadedFile.id || uploadedFile._id || `${file.name}-${Date.now()}`,
            name: uploadedFile.name || file.name,
            size: uploadedFile.size || file.size,
            mimeType: uploadedFile.mimeType || file.type,
            url: uploadedFile.url,
            duration: recordingSeconds,
            isVoiceMessage: true,
            pendingSince: Date.now(),
          }])
          showToast('Voice message recorded', 'success')
        } catch (err) {
          showToast('Failed to process voice message', 'error')
        } finally {
          setIsUploading(false)
          setUploadProgress(0)
        }
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      showToast('Microphone permission denied', 'error')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const handleVoiceButtonClick = async () => {
    if (isRecording) {
      stopRecording()
      return
    }
    await startRecording()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}


      {/* Messages Container */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth px-3 py-2 sm:px-4"
          onScroll={handleScroll}
        >
          {Object.keys(groupedByDate).length > 0 ? (
            <div className="flex min-h-full flex-col justify-end space-y-4">
              {Object.keys(groupedByDate).map((key) => (
                <div key={key}>
                  <div className="flex justify-center py-2">
                    <Badge variant="outline" className="bg-background/80 text-xs backdrop-blur-sm">{key}</Badge>
                  </div>
                  <div className="space-y-1">
                    {groupedByDate[key].map((msg: any) => {
                      const isMe = String(msg.senderId) === String(meUserId)
                      return (
                        <MessageBubble
                          key={msg.id}
                          ref={(el) => {
                            if (el) messageRefs.current.set(msg.id, el)
                            else messageRefs.current.delete(msg.id)
                          }}
                          msg={msg}
                          isMe={isMe}
                          currentUserId={meUserId}
                          onReply={setReplyTo}
                          onDelete={handleDeleteMessage}
                          onEdit={handleEditMessage}
                          onCopy={handleCopyMessage}
                          onScrollToMessage={handleScrollToMessage}
                          onPin={togglePinMessage}
                          onPhotoClick={setSelectedPhoto}
                          showActions={showMessageActions === msg.id}
                          setShowActions={(show: boolean) => setShowMessageActions(show ? msg.id : null)}
                          addReaction={addReaction}
                          removeReaction={removeReaction}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <IconMessage className="mx-auto h-16 w-16 text-muted-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">No messages yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">Start the conversation with {conversationLabel}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="flex-shrink-0" />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton ? (
          <Button 
            variant="secondary" 
            size="icon" 
            className="absolute bottom-24 right-4 z-10 h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 sm:bottom-32" 
            onClick={scrollToBottom}
            title="Scroll to bottom"
          >
            <IconArrowDown size={18} />
          </Button>
        ) : null}

        {/* Editing Message Indicator */}
        {editingMessage ? (
          <div className="mx-3 flex flex-shrink-0 items-center gap-2 rounded-t-lg border-l-4 border-primary bg-primary/10 px-3 py-2 text-sm sm:mx-4">
            <IconMessage size={14} className="flex-shrink-0 text-primary" />
            <span className="font-medium text-primary">Editing message</span>
            <span className="flex-1 truncate text-muted-foreground">{editingMessage.originalContent}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleCancelEdit}>
              <IconX size={14} />
            </Button>
          </div>
        ) : null}

        {/* Reply To Indicator */}
        {replyTo ? (
          <div className="mx-3 flex flex-shrink-0 items-center gap-2 rounded-t-lg bg-muted px-3 py-2 text-sm sm:mx-4">
            <IconMessage size={14} className="flex-shrink-0 text-primary" />
            <span className="font-medium text-primary">Replying to {replyTo.sender}</span>
            <span className="flex-1 truncate text-muted-foreground">{replyTo.content}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setReplyTo(null)}>
              <IconX size={14} />
            </Button>
          </div>
        ) : null}

        {/* Archived Chat Indicator */}
        {selectedUser?.isArchived ? (
          <div className="mx-3 flex flex-shrink-0 items-center gap-2 rounded-t-lg border border-b-0 bg-muted px-3 py-2 text-sm text-muted-foreground sm:mx-4">
            <IconLock size={14} className="flex-shrink-0" />
            This load chat is closed because the load is delivered. You can view history only.
          </div>
        ) : null}

        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 ? (
          <div className="mx-3 mb-0 flex-shrink-0 rounded-t-xl border border-b-0 bg-background p-3 shadow-sm sm:mx-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconPaperclip size={16} className="flex-shrink-0 text-primary" />
                Ready to send {pendingAttachments.length} file{pendingAttachments.length > 1 ? 's' : ''}
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs flex-shrink-0" type="button" onClick={() => clearPendingAttachments(true)}>
                Clear
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingAttachments.map((attachment) => {
                const isImage = attachment.mimeType?.startsWith('image/')
                const isAudio = attachment.mimeType?.startsWith('audio/')
                return (
                  <div key={attachment.id} className={cn('relative flex min-w-44 flex-shrink-0 items-center gap-2 rounded-lg border bg-muted/40 p-2', isAudio && 'min-w-56')}>
                    {isImage ? (
                      <img src={getFileUrl(attachment.url)} alt={attachment.name} className="h-10 w-10 rounded-md object-cover flex-shrink-0" />
                    ) : isAudio ? (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <IconMicrophone size={18} />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-lg">📄</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{attachment.isVoiceMessage ? 'Voice message' : attachment.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{attachment.mimeType || 'File'}</p>
                    </div>
                    <button 
                      type="button" 
                      className="absolute -right-1.5 -top-1.5 flex-shrink-0 rounded-full bg-background p-0.5 shadow hover:bg-muted" 
                      onClick={() => removePendingAttachment(String(attachment.id))}
                      title="Remove attachment"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Recording Indicator */}
        {isRecording ? (
          <div className="mx-3 flex flex-shrink-0 items-center gap-3 rounded-t-xl border border-b-0 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm sm:mx-4">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="font-medium">Recording voice message</span>
            <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{formatRecordingTime(recordingSeconds)}</span>
          </div>
        ) : null}

        {/* Upload Progress Bar */}
        {isUploading && uploadProgress > 0 ? (
          <div className="bg-background px-3 py-1 sm:px-4">
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">{uploadProgress}%</span>
            </div>
          </div>
        ) : null}

        {/* Input Area */}
        <div className="flex flex-shrink-0 items-end gap-2 bg-background p-2 sm:gap-3 sm:p-3">
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.txt,.zip" onChange={handleFileInputChange} className="hidden" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-muted" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            type="button"
            title="Add emoji"
          >
            <IconMoodSmile size={22} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 flex-shrink-0 rounded-full hover:bg-muted" 
            onClick={triggerFileInput} 
            type="button" 
            disabled={isUploading || !selectedUser || !isConnected || !!editingMessage || selectedUser.isArchived || selectedUser.isBlocked}
            title="Attach file"
          >
            {isUploading ? <IconLoader2 size={22} className="animate-spin" /> : <IconUpload size={22} />}
          </Button>
          
          <form onSubmit={handleSubmit} className="flex-1 min-w-0">
            <div className="flex items-end gap-2 rounded-2xl border border-input bg-background px-3 py-1 focus-within:ring-2 focus-within:ring-primary">
              <Input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleTyping}
                placeholder={selectedUser ? editingMessage ? 'Edit message...' : isConnected ? 'Type a message...' : 'Reconnecting...' : 'Select a chat to start messaging'}
                disabled={!selectedUser || !isConnected || isUploading || isSending || selectedUser.isArchived || selectedUser.isBlocked}
                className="flex-1 border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0 rounded-full text-primary hover:bg-primary/10" 
                type="submit" 
                disabled={!selectedUser || (!message.trim() && pendingAttachments.length === 0) || !isConnected || isUploading || isSending || selectedUser.isArchived || selectedUser.isBlocked}
                title="Send message"
              >
                {isSending ? <IconLoader2 size={18} className="animate-spin" /> : <IconSend size={18} />}
              </Button>
            </div>
          </form>
          
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            className={cn('h-10 w-10 flex-shrink-0 rounded-full', isRecording ? 'animate-pulse shadow-md' : 'hover:bg-muted')}
            type="button"
            onClick={() => void handleVoiceButtonClick()}
            disabled={isUploading || isSending || !selectedUser || !isConnected || !!editingMessage || selectedUser.isArchived || selectedUser.isBlocked}
            title={isRecording ? 'Stop recording' : 'Start voice message'}
          >
            {isRecording ? <IconPlayerStop size={20} /> : <IconMicrophone size={22} />}
          </Button>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker ? (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-20 left-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 sm:left-auto sm:right-2"
          >
            <EmojiPicker theme={Theme.AUTO} onEmojiClick={(emojiData) => handleEmojiClick(emojiData.emoji)} />
          </div>
        ) : null}

        {/* Toast Notification */}
        {toastMessage ? (
          <div 
            role="status" 
            aria-live="polite" 
            className={cn(
              'pointer-events-none absolute bottom-24 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 rounded-lg px-4 py-2 text-sm text-white shadow-lg sm:bottom-32',
              toastType === 'success' && 'bg-green-600',
              toastType === 'error' && 'bg-red-600',
              toastType === 'info' && 'bg-black/90'
            )}
          >
            {toastMessage}
          </div>
        ) : null}
      </div>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden border-0 bg-black p-0">
          {selectedPhoto ? (
            <div className="relative flex h-full w-full flex-col">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 z-10 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white" 
                onClick={() => setSelectedPhoto(null)}
                title="Close"
              >
                <IconX size={24} />
              </Button>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-black">
                <img src={getFileUrl(selectedPhoto.url)} alt={selectedPhoto.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex items-center justify-between border-t border-white/10 bg-black/90 p-4 text-white">
                <p className="flex-1 truncate text-sm font-medium">{selectedPhoto.name}</p>
                <a 
                  href={getFileUrl(selectedPhoto.url)} 
                  download={selectedPhoto.name} 
                  className="ml-2 flex flex-shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm transition-colors hover:bg-white/20"
                >
                  <IconDownload className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
