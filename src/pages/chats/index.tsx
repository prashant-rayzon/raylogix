/**
 * Improved Chats Component
 * Complete chat UI with support for all message types
 */

import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime'; import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  IconArrowLeft,
  IconDotsVertical,
  IconMessages,
  IconSearch,
  IconSend,
  IconTrash,
  IconMoodSmile,
  IconMicrophone,
  IconBell,
  IconBellOff,
  IconLock,
  IconFlag,
  IconCopy,
  IconArchive,
  IconArchiveOff,
  IconUserPlus,
  IconUser,
  IconArrowDown,
  IconX,
  IconLoader2,
  IconArrowBackUp,
  IconMessage,
  IconPaperclip,
  IconPlayerStop,
  IconUpload,
  IconDownload,
  IconChecks,
  IconCheck,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import { formatMessageTime } from './chatUtils';
import { Message, MessageType } from './types';
import { useChat } from './hooks/useChat';
import { AttachmentRenderer } from './MessageTypeComponents';
import { deleteFile as deleteUploadedFile } from '@/api/services/chat/files.service';
import { updateConversationBlockStatus } from '@/api/services/chat/conversations.service';
import { getAuthStore } from '@/lib/auth';
import { API_ORIGIN } from '@/api/origin';

// UI Components
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Layout } from '@/components/custom/layout';
import { Search } from '@/components/search';
import ThemeSwitch from '@/components/theme-switch';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/custom/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useInView } from 'react-intersection-observer';
import ChatSidebar from '@/components/chat/ChatSidebar';

dayjs.extend(relativeTime);

// ===== Types =====
interface DeletedMessage {
  messageId: string;
  deletedAt: string;
  undoTimeout?: any;
}

interface SelectedPhoto {
  url: string;
  name: string;
}

interface EditingMessage {
  id: string;
  originalContent: string;
}

const PENDING_ATTACHMENT_TTL_MS = 10 * 60 * 1000;

const getFileUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
};

const formatRecordingTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getAttachmentFilename = (attachment: any) => {
  if (attachment?.id) return String(attachment.id);
  if (!attachment?.url) return '';
  return String(attachment.url).split('/').filter(Boolean).pop() || '';
};

const getMicrophoneErrorMessage = (error: any) => {
  const errorName = error?.name || '';
  const errorMessage = error?.message || '';

  if (
    errorName === 'NotFoundError' ||
    errorName === 'DevicesNotFoundError' ||
    /requested device not found|device not found|no.*device/i.test(errorMessage)
  ) {
    return 'No microphone was found. Please connect/enable a microphone, select it in Chrome microphone settings, then try again.';
  }

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return 'Microphone permission is blocked. Please allow microphone access for this site and try again.';
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
    return 'Your microphone is busy or unavailable. Close other apps using the mic and try again.';
  }

  return errorMessage || 'Unable to start voice recording. Please check your microphone and try again.';
};

const reactionOptions = [
  {
    emoji: '👍',
    label: 'Like',
  },
  {
    emoji: '❤️',
    label: 'Love',
  },
  {
    emoji: '😂',
    label: 'Laugh',
  },
  {
    emoji: '🔥',
    label: 'Fire',
  },
  {
    emoji: '🎉',
    label: 'Celebrate',
  },
  {
    emoji: '👏',
    label: 'Clap',
  },
];

// ===== Main Component =====
export default function ChatsImproved() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    meUserId,
    chatUsers,
    selectedUser,
    setSelectedUser,
    selectedUserMessages,
    isTypingByUserId,
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
    error,
    loading,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
    uploadFile,
  } = useChat();

  // ===== Component State =====
  const [message, setMessage] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [showProfileDialog, setShowProfileDialog] = useState<boolean>(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState<boolean>(false);
  const [newChatSearch, setNewChatSearch] = useState<string>('');
  const [deletedMessages, setDeletedMessages] = useState<DeletedMessage[]>([]);
  const [showScrollButton, setShowScrollButton] = useState<boolean>(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const [urlUserSelected, setUrlUserSelected] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [editingMessage, setEditingMessage] = useState<EditingMessage | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mobileSelectedId, setMobileSelectedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const authStore = getAuthStore() as any;
  const currentUserRole = authStore?.user?.role || '';
  const canManageBlock = ['super_admin', 'company_admin', 'company_user'].includes(currentUserRole);

  // ===== Refs =====
  const typingTimeoutRef = useRef<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const messageRefCallbacks = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef<number>(0);
  const discardRecordingRef = useRef<boolean>(false);
  const pendingAttachmentsRef = useRef<any[]>([]);
  const deletedMessagesRef = useRef<DeletedMessage[]>([]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // ===== Intersection Observer =====
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
    root: scrollContainer,
  });

  useEffect(() => {
    if (inView && hasMoreMessages && !isLoadingMore) {
      // Remember how tall the message list is before older messages are
      // prepended, so we can keep the user's current view anchored in place
      // instead of letting the scroll position jump to the new top.
      if (scrollContainer) {
        prevScrollHeightRef.current = scrollContainer.scrollHeight;
      }
      loadMoreMessages();
    }
  }, [inView, hasMoreMessages, isLoadingMore, loadMoreMessages, scrollContainer]);

  // Restore scroll position after older messages are prepended above the
  // current view.
  useLayoutEffect(() => {
    if (!scrollContainer || !prevScrollHeightRef.current) return;
    const heightDiff = scrollContainer.scrollHeight - prevScrollHeightRef.current;
    if (heightDiff > 0) {
      scrollContainer.scrollTop += heightDiff;
    }
    prevScrollHeightRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserMessages.length]);

  useEffect(() => {
    const messageScrollDiv = messagesContainerRef.current?.querySelector(
      '.overflow-y-auto'
    ) as HTMLDivElement | null;
    if (messageScrollDiv) {
      setScrollContainer(messageScrollDiv);
    }
  }, []);

  // ===== URL Auto-Select =====
  useEffect(() => {
    const conversationIdParam = searchParams.get('conversationId');
    const userIdParam = searchParams.get('userId');
    const loadIdParam = searchParams.get('loadId');
    const shouldFocusReply = searchParams.get('reply') === '1';

    if ((!conversationIdParam && !userIdParam) || urlUserSelected) {
      return;
    }

    if (chatUsers.length === 0) {
      return;
    }

    const userToSelect = chatUsers.find((u: any) => {
      if (conversationIdParam) {
        return String(u.conversationId || '') === String(conversationIdParam);
      }
      if (loadIdParam) {
        return String(u.id) === String(userIdParam) && String(u.loadId || '') === String(loadIdParam);
      }
      return String(u.id) === String(userIdParam);
    });
    if (userToSelect) {
      setSelectedUser(userToSelect);
      setMobileSelectedId(userToSelect.conversationId || userToSelect.id);
      setUrlUserSelected(true);
      setReplyTo(null);
      setEditingMessage(null);
      setShowEmojiPicker(false);
      setMessage('');
      setShowMessageActions(null);
      setIsMuted(!!userToSelect.isMuted);
      setIsArchived(!!userToSelect.isArchived);
      if (shouldFocusReply) {
        window.setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [searchParams, chatUsers, setSelectedUser, setReplyTo, urlUserSelected]);

  // ===== Update URL on Selection =====
  useEffect(() => {
    if (selectedUser) {
      const currentConversationId = searchParams.get('conversationId');
      const nextConversationId = selectedUser.conversationId;
      const replyQuery = searchParams.get('reply') === '1' ? '&reply=1' : '';
      if (nextConversationId && currentConversationId !== nextConversationId) {
        navigate(`/chats?conversationId=${nextConversationId}${replyQuery}`, { replace: true });
      } else if (!nextConversationId && searchParams.get('userId') !== selectedUser.id) {
        navigate(`/chats?userId=${selectedUser.id}${replyQuery}`, { replace: true });
      }
    }
  }, [selectedUser, searchParams, navigate]);

  const filteredNewChatUsers = useMemo(() => {
    const q = newChatSearch.trim().toLowerCase();
    if (!q) return chatUsers;
    return chatUsers.filter(
      (u: any) =>
        (u.fullName || u.username || u.email || '').toLowerCase().includes(q)
    );
  }, [chatUsers, newChatSearch]);

  // ===== Group Messages by Date =====
  const groupedByDate = useMemo(() => {
    const acc: Record<string, Message[]> = {};
    const sortedMessages: any = [...selectedUserMessages].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const msg of sortedMessages) {
      if (msg.isDeleted) continue;
      const key = dayjs(msg.timestamp).format('D MMM, YYYY');
      if (!acc[key]) acc[key] = [];
      acc[key].push(msg);
    }
    return acc;
  }, [selectedUserMessages]);

  // ===== Toast helper (used for copy confirmation / non-blocking errors) =====
  const showToast = useCallback((text: string) => {
    setToastMessage(text);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2000);
  }, []);

  // ===== Handlers =====
  const handlePickUser = useCallback(
    (id: string) => {
      const u = chatUsers.find((x: any) => (x.conversationId || x.id) === id);
      if (!u) {
        console.warn(`User with id ${id} not found`);
        return;
      }
      setSelectedUser(u);
      setMobileSelectedId(u.conversationId || u.id);
      setReplyTo(null);
      setEditingMessage(null);
      setShowEmojiPicker(false);
      setMessage('');
      setShowMessageActions(null);
      setUrlUserSelected(true);
      setIsMuted(!!u.isMuted);
      setIsArchived(!!u.isArchived);
    },
    [chatUsers, setSelectedUser, setReplyTo]
  );

  const handleToggleBlock = useCallback(async () => {
    if (!selectedUser?.conversationId || !canManageBlock) return;

    const nextBlocked = !selectedUser.isBlocked;

    try {
      const response = await updateConversationBlockStatus(selectedUser.conversationId, nextBlocked);
      const block = response?.data?.block || {
        isBlocked: nextBlocked,
        reason: '',
      };

      setSelectedUser((prev: any) =>
        prev
          ? {
              ...prev,
              isBlocked: !!block.isBlocked,
              block,
            }
          : prev
      );

      showToast(nextBlocked ? 'Chat blocked successfully' : 'Chat unblocked successfully');
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.error || err?.message || 'Failed to update chat block');
    }
  }, [selectedUser, canManageBlock, setSelectedUser, showToast]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedUser || selectedUser.isArchived || selectedUser.isBlocked || isSending || isUploading) return;

      const text = message.trim();
      if (editingMessage) {
        if (!text) return;

        setIsSending(true);
        try {
          if (text !== editingMessage.originalContent.trim()) {
            await editMessage(editingMessage.id, text);
          }
          setMessage('');
          setEditingMessage(null);
          setShowEmojiPicker(false);
        } finally {
          setIsSending(false);
        }
        return;
      }

      const attachments = pendingAttachments;
      if (!text && attachments.length === 0) return;

      const firstAttachment = attachments[0];
      let messageType: MessageType = text ? 'text' : 'file';
      if (!text && firstAttachment?.mimeType?.startsWith('image/')) {
        messageType = 'image';
      } else if (!text && firstAttachment?.mimeType?.startsWith('video/')) {
        messageType = 'video';
      } else if (!text && firstAttachment?.mimeType?.startsWith('audio/')) {
        messageType = 'audio';
      }

      setIsSending(true);
      try {
        await sendMessage({
          recipientId: selectedUser.id,
          content: text || attachments.map((file) => file.name).join(', '),
          type: messageType,
          attachments,
          replyToId: replyTo?.messageId,
          loadId: selectedUser.loadId,
          conversationId: selectedUser.conversationId,
        });

        setMessage('');
        pendingAttachmentsRef.current = [];
        setPendingAttachments([]);
        setShowEmojiPicker(false);
        setReplyTo(null);
      } catch (err: any) {
        console.error(err);
        showToast(err?.message || 'Failed to send message');
      } finally {
        setIsSending(false);
      }
    },
    [
      selectedUser,
      isSending,
      isUploading,
      message,
      editingMessage,
      pendingAttachments,
      replyTo,
      sendMessage,
      editMessage,
      showToast,
    ]
  );

  const handleTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMessage(value);

      if (!selectedUser) return;

      if (value.trim()) {
        if (!isTyping) {
          setIsTyping(true);
          emitTyping(selectedUser.id, true);
        }

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          emitTyping(selectedUser.id, false);
        }, 1000);
      } else {
        setIsTyping(false);
        emitTyping(selectedUser.id, false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    },
    [selectedUser, isTyping, emitTyping]
  );

  const handleEmojiClick = useCallback((emoji: string) => {
    setMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  // ===== File Upload =====
  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (!selectedUser || selectedUser.isArchived || selectedUser.isBlocked || files.length === 0) return;

      for (const file of Array.from(files)) {
        try {
          if (file.size > 100 * 1024 * 1024) {
            showToast(`${file.name} exceeds 100MB limit`);
            continue;
          }

          setIsUploading(true);
          setUploadProgress(0);

          const uploadedFile = await uploadFile(
            file,
            selectedUser.id,
            (progress) => {
              setUploadProgress(progress);
            }
          );

          if (!uploadedFile) continue;

          setPendingAttachments((prev) => {
            const next = [
              ...prev,
              {
                ...uploadedFile,
                id: uploadedFile.id || uploadedFile._id || `${file.name}-${Date.now()}`,
                name: uploadedFile.name || file.name,
                size: uploadedFile.size || file.size,
                mimeType: uploadedFile.mimeType || file.type,
                url: uploadedFile.url,
                pendingSince: Date.now(),
              },
            ];
            pendingAttachmentsRef.current = next;
            return next;
          });
        } catch (error: any) {
          console.error(error);
          showToast(error?.message || `Failed to upload ${file.name}`);
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

    },
    [selectedUser, uploadFile, showToast]
  );

  const deletePendingAttachmentFile = useCallback((attachment: any) => {
    const filename = getAttachmentFilename(attachment);
    if (!filename) return;

    deleteUploadedFile(filename).catch((error) => {
      console.warn('Failed to delete pending upload:', filename, error);
    });
  }, []);

  const removePendingAttachment = useCallback(
    (id: string, deleteRemote = true) => {
      setPendingAttachments((prev) => {
        const removed = prev.find(
          (attachment) => String(attachment.id) === String(id)
        );

        if (removed && deleteRemote) {
          deletePendingAttachmentFile(removed);
        }

        const next = prev.filter((attachment) => String(attachment.id) !== String(id));
        pendingAttachmentsRef.current = next;
        return next;
      });
    },
    [deletePendingAttachmentFile]
  );

  const clearPendingAttachments = useCallback(
    (deleteRemote = true) => {
      setPendingAttachments((prev) => {
        if (deleteRemote) {
          prev.forEach(deletePendingAttachmentFile);
        }
        pendingAttachmentsRef.current = [];
        return [];
      });
    },
    [deletePendingAttachmentFile]
  );

  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  const cleanupRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const uploadVoiceBlob = useCallback(
    async (blob: Blob, duration: number) => {
      if (!selectedUser) return;

      const file = new File(
        [blob],
        `voice-message-${dayjs().format('YYYYMMDD-HHmmss')}.webm`,
        { type: blob.type || 'audio/webm' }
      );

      try {
        setIsUploading(true);
        setUploadProgress(0);

        const uploadedFile = await uploadFile(
          file,
          selectedUser.id,
          (progress) => setUploadProgress(progress)
        );

        if (!uploadedFile) return;

        setPendingAttachments((prev) => {
          const next = [
            ...prev,
            {
              ...uploadedFile,
              id: uploadedFile.id || uploadedFile._id || `${file.name}-${Date.now()}`,
              name: uploadedFile.name || file.name,
              size: uploadedFile.size || file.size,
              mimeType: uploadedFile.mimeType || file.type,
              url: uploadedFile.url,
              duration,
              isVoiceMessage: true,
              pendingSince: Date.now(),
            },
          ];
          pendingAttachmentsRef.current = next;
          return next;
        });
      } catch (error: any) {
        console.error(error);
        showToast(error?.message || 'Failed to upload voice message');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [selectedUser, uploadFile, showToast]
  );

  const stopVoiceRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (!selectedUser || isUploading || isSending) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('Voice recording is not supported in this browser');
      return;
    }

    try {
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMicrophone = devices.some((device) => device.kind === 'audioinput');

        if (!hasMicrophone) {
          showToast(
            'No microphone found. Connect or enable one in your browser\'s site settings.'
          );
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingSecondsRef.current = 0;
      discardRecordingRef.current = false;
      setRecordingSeconds(0);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        setIsRecording(false);
        cleanupRecordingStream();

        const duration = recordingSecondsRef.current || 1;
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (!discardRecordingRef.current && blob.size > 0) {
          uploadVoiceBlob(blob, duration);
        }
        discardRecordingRef.current = false;
      };

      recorder.start();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (error: any) {
      cleanupRecordingStream();
      setIsRecording(false);
      stopRecordingTimer();
      showToast(getMicrophoneErrorMessage(error));
    }
  }, [
    selectedUser,
    isUploading,
    isSending,
    cleanupRecordingStream,
    stopRecordingTimer,
    uploadVoiceBlob,
    showToast,
  ]);

  const handleVoiceButtonClick = useCallback(() => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }, [isRecording, startVoiceRecording, stopVoiceRecording]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFileSelect(e.target.files);
        e.target.value = '';
      }
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ===== Drag and Drop =====
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  // ===== Message Operations =====
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      setDeletedMessages((prev) => {
        // If this message already has a pending delete timer (e.g. rapid
        // double-click), clear it before starting a fresh one so we never
        // end up with two timers racing to delete the same message.
        const existing = prev.find((d) => d.messageId === messageId);
        if (existing?.undoTimeout) {
          clearTimeout(existing.undoTimeout);
        }

        const timeout = setTimeout(() => {
          deleteMessage(messageId);
          setDeletedMessages((curr) =>
            curr.filter((d) => d.messageId !== messageId)
          );
        }, 5000);

        return [
          ...prev.filter((d) => d.messageId !== messageId),
          { messageId, deletedAt: new Date().toISOString(), undoTimeout: timeout },
        ];
      });

      setShowMessageActions(null);
    },
    [deleteMessage]
  );

  const handleUndoDelete = useCallback(
    (messageId: string) => {
      const deleted = deletedMessages.find((d) => d.messageId === messageId);
      if (deleted?.undoTimeout) {
        clearTimeout(deleted.undoTimeout);
      }
      setDeletedMessages((prev) =>
        prev.filter((d) => d.messageId !== messageId)
      );
    },
    [deletedMessages]
  );

  const handleEditMessage = useCallback(
    (messageId: string) => {
      const current = selectedUserMessages.find((m) => m.id === messageId);
      if (!current || current.type !== 'text') return;

      clearPendingAttachments(true);
      setReplyTo(null);
      setEditingMessage({
        id: messageId,
        originalContent: current.content ?? '',
      });
      setMessage(current.content ?? '');
      setShowEmojiPicker(false);
      setShowMessageActions(null);
      inputRef.current?.focus();
    },
    [clearPendingAttachments, selectedUserMessages, setReplyTo]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setMessage('');
    inputRef.current?.focus();
  }, []);

  const handleReplyMessage = useCallback((msg: Message) => {
    setReplyTo({
      messageId: msg.id,
      content: msg.content,
      sender: msg.senderName,
      senderId: msg.senderId,
    });
    inputRef.current?.focus();

    setHighlightedMessageId(msg.id);
    setTimeout(() => setHighlightedMessageId(null), 3000);
    setShowMessageActions(null);
  }, []);

  const handleCopyMessage = useCallback(
    (content: string) => {
      navigator.clipboard
        ?.writeText(content)
        .then(() => showToast('Copied to clipboard'))
        .catch(() => showToast('Could not copy to clipboard'));
      setShowMessageActions(null);
    },
    [showToast]
  );

  const handleScrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 3000);
    }
  }, []);

  // Stable ref callbacks per message id, so re-renders don't repeatedly
  // detach/reattach the DOM node ref (which previously happened because an
  // inline arrow function was passed as `messageRef` on every render).
  const getMessageRefCallback = useCallback((id: string) => {
    let cb = messageRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        if (el) {
          messageRefs.current.set(id, el);
        } else {
          messageRefs.current.delete(id);
        }
      };
      messageRefCallbacks.current.set(id, cb);
    }
    return cb;
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // ===== Auto-scroll on new messages =====
  useEffect(() => {
    if (!showScrollButton && selectedUserMessages.length > 0) {
      scrollToBottom();
    }
  }, [selectedUserMessages, scrollToBottom, showScrollButton]);

  // ===== Cleanup =====
  // Keep a ref mirror of deletedMessages so the unmount-only cleanup effect
  // below always sees the latest value without needing to re-run (and
  // re-clear other in-flight timers) every time a message is deleted.
  useEffect(() => {
    deletedMessagesRef.current = deletedMessages;
  }, [deletedMessages]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      deletedMessagesRef.current.forEach((d) => {
        if (d.undoTimeout) clearTimeout(d.undoTimeout);
      });
    };
    // Intentionally empty deps: this must only run once on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      discardRecordingRef.current = true;
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      cleanupRecordingStream();
    };
  }, [cleanupRecordingStream, stopRecordingTimer]);

  useEffect(() => {
    const cleanupPendingUploads = () => {
      const now = Date.now();

      setPendingAttachments((prev) => {
        const expired = prev.filter(
          (attachment) =>
            now - (attachment.pendingSince || now) >= PENDING_ATTACHMENT_TTL_MS
        );

        if (expired.length === 0) return prev;

        expired.forEach(deletePendingAttachmentFile);

        const next = prev.filter(
          (attachment) =>
            now - (attachment.pendingSince || now) < PENDING_ATTACHMENT_TTL_MS
        );
        pendingAttachmentsRef.current = next;
        return next;
      });
    };

    const cleanupInterval = setInterval(cleanupPendingUploads, 60_000);
    return () => clearInterval(cleanupInterval);
  }, [deletePendingAttachmentFile]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach(deletePendingAttachmentFile);
    };
  }, [deletePendingAttachmentFile]);

  // ===== Keyboard Shortcuts =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if ((message.trim() || pendingAttachments.length > 0) && selectedUser) {
          handleSubmit(e as any);
        }
      }
      if (e.key === 'Escape' && replyTo) {
        setReplyTo(null);
      }
      if (e.key === 'Escape' && editingMessage) {
        handleCancelEdit();
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    message,
    pendingAttachments.length,
    selectedUser,
    handleSubmit,
    replyTo,
    editingMessage,
    handleCancelEdit,
  ]);

  const isRightOpenMobile = !!mobileSelectedId && !!selectedUser;

  return (
    <Layout fixed>
      <Layout.Header>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="sm:overflow-hidden">
        <section className="flex h-full ">
          <ChatSidebar
            users={chatUsers}
            selectedUser={selectedUser}
            isTypingByUserId={isTypingByUserId}
            error={error}
            loading={loading}
            onPickUser={handlePickUser}
            onNewChat={() => setShowNewChatDialog(true)}
            onRetry={() => window.location.reload()}
          />

          {/* Right Panel - Chat Window */}
          <div
            className={cn(
              'absolute inset-0 left-full z-50 flex w-full flex-1 flex-col bg-background transition-all duration-300 sm:static sm:z-auto sm:flex',
              isRightOpenMobile && 'left-0'
            )}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="flex flex-none items-center justify-between border-b bg-secondary/50 p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="-ml-2 h-full sm:hidden"
                      onClick={() => setMobileSelectedId(null)}
                      aria-label="Back to chat list"
                    >
                      <IconArrowLeft size={20} />
                    </Button>

                    <button
                      type="button"
                      className="flex items-center gap-3"
                      onClick={() => setShowProfileDialog(true)}
                      aria-label={`View profile of ${selectedUser.fullName || selectedUser.email}`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 lg:h-12 lg:w-12">
                          <AvatarImage
                            src={selectedUser.profile}
                            alt={selectedUser.fullName}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {selectedUser.fullName?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {selectedUser.isOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500">
                            <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-75" />
                          </span>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold lg:text-base">
                            {selectedUser.fullName || selectedUser.email}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {selectedUser.loadId && (
                            <>
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                Load {String(selectedUser.loadId).slice(-6)}
                              </span>
                              {selectedUser.isBlocked && (
                                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                  Blocked
                                </span>
                              )}
                              {selectedUser.isArchived && (
                                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                                  Closed
                                </span>
                              )}
                            </>
                          )}
                          {selectedUser.isOnline ? (
                            <>
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Online
                            </>
                          ) : (
                            `Last seen ${dayjs(selectedUser.lastSeen).fromNow()}`
                          )}
                          {isTypingByUserId[selectedUser.id] && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                              <span className="text-primary animate-pulse">typing...</span>
                            </>
                          )}
                        </span>
                      </div>
                    </button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        aria-label="Conversation options"
                      >
                        <IconDotsVertical
                          size={20}
                          className="stroke-muted-foreground"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Profile</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowProfileDialog(true)}
                      >
                        <IconUser className="mr-2 h-4 w-4" />
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? (
                          <IconBellOff className="mr-2 h-4 w-4" />
                        ) : (
                          <IconBell className="mr-2 h-4 w-4" />
                        )}
                        {isMuted ? 'Unmute' : 'Mute notifications'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsArchived(!isArchived)}
                      >
                        {isArchived ? (
                          <IconArchiveOff className="mr-2 h-4 w-4" />
                        ) : (
                          <IconArchive className="mr-2 h-4 w-4" />
                        )}
                        {isArchived ? 'Unarchive' : 'Archive chat'}
                      </DropdownMenuItem>
                      {canManageBlock && (
                        <DropdownMenuItem onClick={handleToggleBlock}>
                          <IconLock className="mr-2 h-4 w-4" />
                          {selectedUser.isBlocked ? 'Unblock chat' : 'Block chat'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages Area */}
                <div
                  className="relative flex flex-1 flex-col overflow-hidden"
                  ref={messagesContainerRef}
                >
                  <div
                    className="flex-1 overflow-y-auto scroll-smooth px-4 py-2 flex flex-col justify-start"
                    onScroll={handleScroll}
                  >
                    {hasMoreMessages && (
                      <div
                        ref={loadMoreRef}
                        className="flex justify-center py-4 flex-shrink-0"
                      >
                        {isLoadingMore ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <IconLoader2
                              size={18}
                              className="animate-spin"
                            />
                            Loading older messages...
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </div>
                    )}

                    {Object.keys(groupedByDate).length > 0 ? (
                      <div className="space-y-4">
                        {Object.keys(groupedByDate).map((key) => (
                          <div key={key}>
                            <div className="flex justify-center py-2">
                              <Badge
                                variant="outline"
                                className="bg-background/80 backdrop-blur-sm text-xs"
                              >
                                {key}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {groupedByDate[key].map((msg: Message) => {
                                const isMe = String(msg.senderId) === String(meUserId);
                                const isDeleted = deletedMessages.some(
                                  (d) => d.messageId === msg.id
                                );

                                if (isDeleted) {
                                  return (
                                    <div
                                      key={msg.id}
                                      className="flex items-center gap-2 px-4 py-1 text-sm text-muted-foreground animate-in slide-in-from-bottom-2 justify-end"
                                    >
                                      <span>You deleted this message</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                                        onClick={() =>
                                          handleUndoDelete(msg.id)
                                        }
                                      >
                                        Undo
                                      </Button>
                                    </div>
                                  );
                                }

                                if (msg.isDeleted) return null;

                                return (
                                  <MessageBubble
                                    key={msg.id}
                                    msg={msg}
                                    isMe={isMe}
                                    currentUserId={meUserId}
                                    onReply={handleReplyMessage}
                                    onDelete={handleDeleteMessage}
                                    onEdit={handleEditMessage}
                                    onPin={togglePinMessage}
                                    onCopy={handleCopyMessage}
                                    onScrollToMessage={handleScrollToMessage}
                                    onPhotoClick={setSelectedPhoto}
                                    isHighlighted={
                                      highlightedMessageId === msg.id
                                    }
                                    messageRef={getMessageRefCallback(msg.id)}
                                    showActions={
                                      showMessageActions === msg.id
                                    }
                                    setShowActions={(show) =>
                                      setShowMessageActions(
                                        show ? msg.id : null
                                      )
                                    }
                                    addReaction={addReaction}
                                    removeReaction={removeReaction}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <IconMessages className="mx-auto h-16 w-16 stroke-muted-foreground/40" />
                          <h3 className="mt-4 text-lg font-semibold">
                            No messages yet
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Start the conversation with{' '}
                            {selectedUser.fullName || selectedUser.email}
                          </p>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} className="flex-shrink-0" />
                  </div>

                  {showScrollButton && (
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Scroll to latest messages"
                      className="absolute bottom-20 right-4 h-10 w-10 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={scrollToBottom}
                    >
                      <IconArrowDown size={18} />
                    </Button>
                  )}

                  {editingMessage && (
                    <div className="mx-4 flex items-center gap-2 rounded-t-lg border-l-4 border-primary bg-primary/10 px-3 py-2 text-sm animate-in slide-in-from-bottom-2 flex-shrink-0">
                      <IconMessage
                        size={14}
                        className="text-primary flex-shrink-0"
                      />
                      <span className="font-medium text-primary">
                        Editing message
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {editingMessage.originalContent}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted-foreground/10"
                        onClick={handleCancelEdit}
                        type="button"
                        aria-label="Cancel editing"
                      >
                        <IconX size={14} />
                      </Button>
                    </div>
                  )}

                  {/* Reply to bar */}
                  {replyTo && (
                    <div className="mx-4 flex items-center gap-2 rounded-t-lg bg-muted px-3 py-2 text-sm animate-in slide-in-from-bottom-2 flex-shrink-0">
                      <IconMessage
                        size={14}
                        className="text-primary flex-shrink-0"
                      />
                      <span className="font-medium text-primary">
                        Replying to {replyTo.sender}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">
                        {replyTo.content}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted-foreground/10"
                        onClick={() => setReplyTo(null)}
                        aria-label="Cancel reply"
                      >
                        <IconX size={14} />
                      </Button>
                    </div>
                  )}

                  {selectedUser.isArchived && (
                    <div className="mx-4 flex items-center gap-2 rounded-t-lg border border-b-0 bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <IconLock size={14} />
                      This load chat is closed because the load is delivered. You can view history only.
                    </div>
                  )}

                  {selectedUser.isBlocked && (
                    <div className="mx-4 flex items-center gap-2 rounded-t-lg border border-b-0 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      <IconLock size={14} />
                      This chat is blocked by {selectedUser.block?.blockedByRole?.replace(/_/g, ' ') || 'an authorized user'}. Messages are disabled until it is unblocked.
                    </div>
                  )}

                  {pendingAttachments.length > 0 && (
                    <div className="mx-4 mb-0 rounded-t-xl border border-b-0 bg-background p-3 shadow-sm animate-in slide-in-from-bottom-2 flex-shrink-0">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <IconPaperclip size={16} className="text-primary" />
                          Ready to send {pendingAttachments.length}{' '}
                          {pendingAttachments.some((att) => att.isVoiceMessage)
                            ? 'voice/file'
                            : 'file'}
                          {pendingAttachments.length > 1 ? 's' : ''}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          type="button"
                          onClick={() => clearPendingAttachments(true)}
                        >
                          Clear
                        </Button>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {pendingAttachments.map((attachment) => {
                          const isImage = attachment.mimeType?.startsWith('image/');
                          const isAudio = attachment.mimeType?.startsWith('audio/');
                          return (
                            <div
                              key={attachment.id}
                              className={cn(
                                'relative flex min-w-44 max-w-64 items-center gap-2 rounded-lg border bg-muted/40 p-2',
                                isAudio && 'min-w-64'
                              )}
                            >
                              {isImage ? (
                                <img
                                  src={getFileUrl(attachment.url)}
                                  alt={attachment.name}
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : isAudio ? (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <IconMicrophone size={18} />
                                </div>
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-lg">
                                  📄
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {attachment.isVoiceMessage ? 'Voice message' : attachment.name}
                                </p>
                                {isAudio ? (
                                  <div className="mt-1 flex items-center gap-2">
                                    <audio
                                      src={getFileUrl(attachment.url)}
                                      controls
                                      className="h-7 w-full min-w-0"
                                    />
                                    {attachment.duration && (
                                      <span className="shrink-0 text-[10px] text-muted-foreground">
                                        {formatRecordingTime(attachment.duration)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {attachment.mimeType || 'File'}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow hover:bg-muted"
                                onClick={() => removePendingAttachment(String(attachment.id))}
                                aria-label={`Remove ${attachment.name}`}
                              >
                                <IconX size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {isRecording && (
                    <div className="mx-4 flex items-center gap-3 rounded-t-xl border border-b-0 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm dark:bg-red-950/30 dark:text-red-300">
                      <span className="relative flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                      <span className="font-medium">Recording voice message</span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-200">
                        {formatRecordingTime(recordingSeconds)}
                      </span>
                      <span className="ml-auto text-xs text-red-600/80 dark:text-red-300/80">
                        Click stop to preview before sending
                      </span>
                    </div>
                  )}

                  {/* Message Input Area */}
                  <div
                    className={`flex items-end gap-2 bg-background p-2 flex-shrink-0 transition-colors ${isDragging
                      ? 'bg-primary/5 border-2 border-dashed border-primary'
                      : ''
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.txt,.zip"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full hover:bg-muted"
                      onClick={() =>
                        setShowEmojiPicker(!showEmojiPicker)
                      }
                      type="button"
                      aria-label={showEmojiPicker ? 'Close emoji picker' : 'Open emoji picker'}
                    >
                      <IconMoodSmile size={22} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full hover:bg-muted"
                      onClick={triggerFileInput}
                      type="button"
                        disabled={
                          isUploading ||
                          !selectedUser ||
                          !isConnected ||
                          !!editingMessage ||
                          selectedUser.isArchived ||
                          selectedUser.isBlocked
                        }
                      title="Upload file"
                      aria-label="Upload file"
                    >
                      {isUploading ? (
                        <IconLoader2
                          size={22}
                          className="animate-spin"
                        />
                      ) : (
                        <IconUpload size={22} />
                      )}
                    </Button>

                    <form onSubmit={handleSubmit} className="flex-1">
                      <div className="flex items-end gap-2 rounded-2xl border border-input bg-background px-3 py-1 focus-within:ring-2 focus-within:ring-primary">
                        <input
                          ref={inputRef}
                          type="text"
                          value={message}
                          onChange={handleTyping}
                          aria-label="Message"
                          placeholder={
                            selectedUser
                              ? editingMessage
                                ? 'Edit message...'
                                : isConnected
                                  ? 'Type a message...'
                                  : 'Reconnecting...'
                              : 'Select a chat to start messaging'
                          }
                          disabled={
                            !selectedUser ||
                            !isConnected ||
                            isUploading ||
                            isSending ||
                            selectedUser.isArchived ||
                            selectedUser.isBlocked
                          }
                          className="flex-1 bg-transparent py-2 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-full text-primary hover:bg-primary/10"
                          type="submit"
                          aria-label={editingMessage ? 'Save edit' : 'Send message'}
                          disabled={
                            !selectedUser ||
                            (!message.trim() && pendingAttachments.length === 0) ||
                            !isConnected ||
                            isUploading ||
                            isSending ||
                            selectedUser.isArchived ||
                            selectedUser.isBlocked
                          }
                        >
                          {isSending ? (
                            <IconLoader2 size={18} className="animate-spin" />
                          ) : (
                            <IconSend size={18} />
                          )}
                        </Button>
                      </div>
                    </form>

                    <Button
                      variant={isRecording ? 'destructive' : 'ghost'}
                      size="icon"
                      className={cn(
                        'h-10 w-10 shrink-0 rounded-full',
                        isRecording
                          ? 'animate-pulse shadow-md'
                          : 'hover:bg-muted'
                      )}
                      type="button"
                      onClick={handleVoiceButtonClick}
                      disabled={
                        isUploading ||
                        isSending ||
                        !selectedUser ||
                        !isConnected ||
                        !!editingMessage ||
                        selectedUser.isArchived ||
                        selectedUser.isBlocked
                      }
                      title={isRecording ? 'Stop recording' : 'Record voice message'}
                      aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
                    >
                      {isRecording ? (
                        <IconPlayerStop size={20} />
                      ) : (
                        <IconMicrophone size={22} />
                      )}
                    </Button>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="px-2 py-1 bg-background flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {uploadProgress}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                      <EmojiPicker
                        theme={Theme.AUTO}

                        onEmojiClick={(emojiData) => handleEmojiClick(emojiData.emoji)}
                      />
                    </div>
                  )}

                  {/* Toast notifications (copy confirmations, non-blocking errors) */}
                  {toastMessage && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="pointer-events-none absolute bottom-20 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 rounded-lg bg-black/90 px-4 py-2 text-sm text-white shadow-lg"
                    >
                      {toastMessage}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <IconMessages className="mx-auto h-20 w-20 stroke-muted-foreground/30" />
                  <h3 className="mt-4 text-xl font-semibold">
                    Welcome to Chats
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select a conversation to start messaging
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setShowNewChatDialog(true)}
                  >
                    <IconUserPlus className="mr-2 h-4 w-4" />
                    New conversation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </Layout.Body>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedUser?.profile} />
                  <AvatarFallback className="text-2xl">
                    {selectedUser?.fullName
                      ?.slice(0, 2)
                      .toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-lg font-semibold">
                    {selectedUser?.fullName ||
                      selectedUser?.email}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    @
                    {selectedUser?.username ||
                      selectedUser?.email?.split('@')[0]}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mute notifications</span>
                  <Switch
                    checked={isMuted}
                    onCheckedChange={setIsMuted}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Viewer */}
      <Dialog
        open={!!selectedPhoto}
        onOpenChange={(open) => !open && setSelectedPhoto(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 bg-black border-0">
          {selectedPhoto && (
            <div className="relative w-full h-full flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-10 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close photo viewer"
              >
                <IconX size={24} />
              </Button>

              <div className="flex-1 flex items-center justify-center overflow-auto bg-black">
                <img
                  src={getFileUrl(selectedPhoto.url)}
                  alt={selectedPhoto.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="bg-black/90 text-white p-4 flex items-center justify-between border-t border-white/10">
                <p className="text-sm font-medium truncate flex-1">
                  {selectedPhoto.name}
                </p>
                <a
                  href={getFileUrl(selectedPhoto.url)}
                  download={selectedPhoto.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm ml-2"
                >
                  <IconDownload className="h-4 w-4" />
                  Download
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <IconSearch
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 stroke-muted-foreground"
              />
              <input
                type="text"
                aria-label="Search users"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Search users..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              {filteredNewChatUsers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No users found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNewChatUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                      onClick={() => {
                        handlePickUser(user.conversationId || user.id);
                        setShowNewChatDialog(false);
                        setNewChatSearch('');
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user.profile}
                          alt={user.fullName}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.fullName
                            ?.slice(0, 2)
                            .toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">
                          {user.fullName || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @
                          {user.username ||
                            user.email?.split('@')[0]}
                        </p>
                      </div>
                      {user.isOnline && (
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

// ===== Message Bubble Component =====
interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  currentUserId: string;
  onReply: (msg: Message) => void;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCopy: (content: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onPhotoClick: (photo: { url: string; name: string }) => void;
  isHighlighted: boolean;
  messageRef: (el: HTMLDivElement | null) => void;
  showActions: boolean;
  setShowActions: (show: boolean) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void> | void;
  removeReaction: (messageId: string, emoji: string) => Promise<void> | void;
}

function MessageBubble({
  msg,
  isMe,
  currentUserId,
  onReply,
  onDelete,
  onEdit,
  onCopy,
  onScrollToMessage,
  onPin,
  onPhotoClick,
  isHighlighted,
  messageRef,
  showActions,
  setShowActions,
  addReaction,
  removeReaction,
}: MessageBubbleProps) {
  const currentUserReactionEmojis = (msg.reactions || [])
    .filter((r: any) => String(r?.userId || '') === String(currentUserId || ''))
    .map((r: any) => r.emoji)
    .filter(Boolean);

  const hasReacted = (emoji: string) => {
    return currentUserReactionEmojis.includes(emoji);
  };

  const handleToggleReaction = async (emoji: string) => {
    if (hasReacted(emoji)) {
      await removeReaction(msg.id, emoji);
    } else {
      await addReaction(msg.id, emoji);
    }
    setShowActions(false);
  };
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    };
  }, []);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
    setShowActions(false);
  };

  const handleReactionClick = async (emoji: string) => {
    setBurstEmoji(emoji);
    if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = setTimeout(() => setBurstEmoji(null), 850);
    setShowReactionPicker(false);
    await handleToggleReaction(emoji);
  };

  return (
    <>
      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <IconTrash size={20} />
              Delete Message
            </DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground line-clamp-3">
              "{msg.content}"
            </p>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(msg.id);
                setShowDeleteDialog(false);
              }}
              className="flex-1 sm:flex-none"
            >
              <IconTrash size={16} className="mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        ref={messageRef}
        className={cn(
          'group relative flex flex-col transition-all duration-300',
          isHighlighted && 'animate-in slide-in-from-top-2 fade-in'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowReactionPicker(false);
          setShowActions(false);
        }}
      >
        {/* Message Content */}
        <div
          className={cn(
            'break-words px-3.5 py-2.5 shadow-sm relative transition-all duration-200 rounded-lg',
            isMe
              ? 'ml-auto bg-primary text-primary-foreground max-w-[75%] rounded-br-none'
              : 'mr-auto bg-muted max-w-[75%] rounded-bl-none'
          )}
        >
          {!isMe && (
            <span className="block text-xs font-semibold mb-1 text-muted-foreground">
              {msg.senderName}
            </span>
          )}

          {msg.replyTo && (
            <button
              type="button"
              className={cn(
                'mb-2 block w-full rounded-md border-l-2 px-2 py-1 text-left text-xs transition-colors hover:bg-background/20',
                isMe ? 'border-primary-foreground/70 bg-primary-foreground/10' : 'border-primary bg-background/40'
              )}
              onClick={() => onScrollToMessage(msg.replyTo!.messageId)}
            >
              <span className="block font-medium opacity-90">
                {msg.replyTo.sender}
              </span>
              <span className="block truncate opacity-75">
                {msg.replyTo.content}
              </span>
            </button>
          )}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mb-2 space-y-2">
              {msg.attachments.map((att: any, idx: number) => (
                <AttachmentRenderer
                  key={idx}
                  attachment={att}
                  onPhotoClick={onPhotoClick}
                />
              ))}
            </div>
          )}

          {/* Text Content */}
          {msg.type === 'text' && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {msg.content}
            </p>
          )}

          {msg.isEdited && (
            <span className="text-[10px] opacity-70 ml-1.5">edited</span>
          )}

          <div className="mt-1.5 text-[10px] opacity-70 flex items-center justify-end gap-1">
            <span>{formatMessageTime(msg.timestamp)}</span>
            {isMe &&
              (msg.isRead ? (
                <IconChecks
                  size={14}
                  stroke={2.2}
                  className="text-sky-500"
                />
              ) : (
                <IconCheck
                  size={14}
                  stroke={2.2}
                  className="text-gray-400"
                />
              ))}
          </div>
        </div>

        {/* Reactions */}
        {(msg.reactions?.length || 0) > 0 && (
          <div className={cn('mt-1 flex flex-wrap gap-1', isMe ? 'justify-end pr-1' : 'justify-start pl-1')}>
            {(() => {
              const counts = new Map<string, number>();
              (msg.reactions || []).forEach((r: any) => {
                if (!r?.emoji) return;
                counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
              });
              return Array.from(counts.entries()).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-all hover:-translate-y-0.5',
                    hasReacted(emoji)
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 bg-background/90 hover:bg-muted'
                  )}
                  onClick={() => handleToggleReaction(emoji)}
                  title={hasReacted(emoji) ? 'Remove reaction' : 'Add reaction'}
                >
                  <span>{emoji}</span>
                  <span className="opacity-80">{count}</span>
                </button>
              ));
            })()}
          </div>
        )}

        {showReactionPicker && !msg.isDeleted && (
          <div
            className={cn(
              'absolute -top-12 z-30 flex items-center gap-1 rounded-2xl border bg-background/95 px-2 py-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 slide-in-from-bottom-1',
              isMe ? 'right-2' : 'left-2'
            )}
            onMouseEnter={() => setIsHovered(true)}
          >
            {reactionOptions.map((reaction, index) => (
              <TooltipProvider key={reaction.emoji} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'relative flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none transition-all duration-200 hover:-translate-y-2 hover:scale-125 hover:bg-muted active:scale-95',
                        hasReacted(reaction.emoji) && 'bg-primary/10 ring-1 ring-primary/30'
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                      onClick={() => handleReactionClick(reaction.emoji)}
                      aria-label={`${hasReacted(reaction.emoji) ? 'Remove' : 'Add'} ${reaction.label} reaction`}
                    >
                      <span className="animate-in zoom-in-50 duration-300">
                        {reaction.emoji}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{reaction.label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}

        {/* Message Actions */}
        {(showActions || isHovered) && !msg.isDeleted && (
          <div
            className={cn(
              'absolute -top-8 z-20 flex items-center overflow-hidden rounded-full border bg-background/95 px-1 py-0.5 shadow-xl backdrop-blur transition-all duration-200 animate-in fade-in zoom-in-95',
              isMe ? 'right-2' : 'left-2'
            )}
            onMouseEnter={() => setIsHovered(true)}
          >
            <div className="flex items-center gap-0.5">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-6 w-6 rounded-full hover:bg-primary/10',
                        showReactionPicker && 'bg-primary/10 text-primary'
                      )}
                      onClick={() => setShowReactionPicker((prev) => !prev)}
                      aria-label="Add reaction"
                    >
                      <IconMoodSmile size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">React</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator orientation="vertical" className="mx-1 h-4" />

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-primary/10"
                      onClick={() => onReply(msg)}
                      aria-label="Reply to message"
                    >
                      <IconArrowBackUp size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Reply</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-primary/10"
                      onClick={() => onCopy(msg.content)}
                      aria-label="Copy message"
                    >
                      <IconCopy size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Copy</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-primary/10"
                      onClick={() => {
                        onPin(msg.id);
                        setShowActions(false);
                      }}
                      aria-label="Pin message"
                    >
                      <IconFlag size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Pin</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isMe && (
                <>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-primary/10"
                          onClick={() => onEdit(msg.id)}
                          aria-label="Edit message"
                        >
                          <IconMessage size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600"
                          onClick={handleDeleteClick}
                          aria-label="Delete message"
                        >
                          <IconTrash size={14} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>
        )}

        {burstEmoji && (
          <div
            className={cn(
              'pointer-events-none absolute top-0 z-30 flex h-14 w-14 items-center justify-center text-4xl animate-in zoom-in fade-in slide-in-from-bottom-2 duration-300',
              isMe ? 'right-8' : 'left-8'
            )}
          >
            <span className="drop-shadow-lg">{burstEmoji}</span>
            <span className="absolute left-1 top-2 h-1.5 w-1.5 animate-ping rounded-full bg-yellow-400" />
            <span className="absolute right-2 top-1 h-1.5 w-1.5 animate-ping rounded-full bg-pink-400 [animation-delay:120ms]" />
            <span className="absolute bottom-2 left-3 h-1.5 w-1.5 animate-ping rounded-full bg-primary [animation-delay:220ms]" />
          </div>
        )}
      </div>
    </>
  );
}
