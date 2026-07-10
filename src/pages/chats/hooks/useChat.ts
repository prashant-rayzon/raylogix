import { useState, useCallback, useRef, useEffect } from 'react';

import { chatSocket } from '../socket/chatSocket';
import { ChatUser, Message, ReplyTo } from '@/api/schema';
import { getAuthStore } from '@/lib/auth';
import * as conversationApi from '@/api/services/chat/conversations.service';
import * as messageApi from '@/api/services/chat/messages.service';

const TYPING_TIMEOUT_MS = 5000; // must match server

export function useChat() {
  // ─── Auth ───────────────────────────────────────────────────────────
  const [meUserId, setMeUserId] = useState('');
  const [senderName, setSenderName] = useState('You');
  const [isConnected, setIsConnected] = useState(false);

  // ─── Chat data ───────────────────────────────────────────────────────
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [selectedUserMessages, setSelectedUserMessages] = useState<Message[]>([]);

  // ─── UI state ────────────────────────────────────────────────────────
  const [isTypingByUserId, setIsTypingByUserId] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Refs ────────────────────────────────────────────────────────────
  const messagesCache = useRef<Record<string, Message[]>>({});
  const cursorRef = useRef<Record<string, string | null>>({});  // userId -> oldest timestamp cursor
  const hasMoreRef = useRef<Record<string, boolean>>({});        // userId -> hasMore flag
  const loadingMoreRef = useRef(false);
  const selectedUserIdRef = useRef<string | null>(null);
  const activeConversationKeyRef = useRef<string | null>(null);
  const meUserIdRef = useRef('');
  const isMounted = useRef(true);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Sync ref with state ─────────────────────────────────────────────
  useEffect(() => { meUserIdRef.current = meUserId; }, [meUserId]);

  // ─── Normalize ID ────────────────────────────────────────────────────
  const norm = useCallback((id: any): string => (id ? String(id) : ''), []);

  // ─── Format raw API/socket message into our Message shape ────────────
  const formatMessage = useCallback((raw: any, currentUserId: string): Message => ({
    id: norm(raw._id || raw.id) || `msg_${Date.now()}`,
    tempId: raw.tempId ? norm(raw.tempId) : undefined,
    senderId: norm(raw.senderId || currentUserId),
    senderName: raw.senderName || (norm(raw.senderId) === currentUserId ? 'You' : 'Unknown'),
    recipientId: norm(raw.recipientId),
    content: raw.content || '',
    type: raw.type || 'text',
    timestamp: new Date(raw.timestamp || Date.now()),
    isRead: raw.isRead ?? false,
    isDelivered: raw.isDelivered ?? false,
    status: raw.status || 'sent',
    reactions: Array.isArray(raw.reactions)
      ? raw.reactions.map((r: any) => ({
        userId: norm(r.userId),
        username: r.username || 'Unknown',
        emoji: r.emoji || '👍',
        timestamp: new Date(r.timestamp || Date.now()),
      }))
      : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    isEdited: raw.isEdited ?? false,
    isDeleted: raw.isDeleted ?? false,
    isForwarded: raw.isForwarded ?? false,
    replyToId: raw.replyToId ? norm(raw.replyToId) : undefined,
    replyTo: raw.replyTo
      ? {
        messageId: norm(raw.replyTo.messageId || raw.replyTo.id),
        content: raw.replyTo.content || '',
        sender: raw.replyTo.senderName || raw.replyTo.sender || 'Unknown',
        senderId: norm(raw.replyTo.senderId),
      }
      : undefined,
    metadata: raw.metadata || {},
  }), [norm]);

  // ─── Upsert a message in an array (de-dup by id or tempId) ───────────
  const upsert = useCallback((list: Message[], incoming: Message): Message[] => {
    const inId = norm(incoming.id);
    const inTemp = norm(incoming.tempId);
    let hit = false;

    const next = list.reduce<Message[]>((acc, msg) => {
      const mId = norm(msg.id);
      const mTemp = norm(msg.tempId);
      const match =
        (inId && mId === inId) ||
        (inTemp && (mId === inTemp || mTemp === inTemp));

      if (!match) { acc.push(msg); return acc; }
      if (!hit) { acc.push({ ...msg, ...incoming }); hit = true; }
      return acc;
    }, []);

    return hit ? next : [...next, incoming];
  }, [norm]);

  // ─── Which other user is involved in this message? ──────────────────
  const otherUserId = useCallback((msg: Message): string => {
    const me = meUserIdRef.current;
    return norm(msg.senderId) === me ? norm(msg.recipientId) : norm(msg.senderId);
  }, [norm]);

  // ─── Mark all unread messages from a user as read ────────────────────
  const markMessagesAsRead = useCallback(async (userId: string) => {
    const me = meUserIdRef.current;
    if (!me) return;
    try {
      chatSocket.markAllAsRead(me, userId);
    } catch (_) {
      try { await messageApi.markAllAsRead(userId); } catch (__) { }
    }
  }, []);

  // ─── Init auth + socket (runs once) ─────────────────────────────────
  useEffect(() => {

    const init = async () => {
      const store: any = getAuthStore();

      const uid = norm(store.user.id);
      const name = store.user.fullName || 'You';
      meUserIdRef.current = uid;

      setMeUserId(uid);
      setSenderName(name);

      const tryConnect = async (attempt = 0): Promise<void> => {
        try {
          await chatSocket.connect(store.accessToken ?? '', uid);
          setIsConnected(true);
        } catch (err) {
          setIsConnected(false);
          if (attempt < 5 && isMounted.current) {
            const delay = Math.min(1000 * 2 ** attempt, 15000);
            setTimeout(() => tryConnect(attempt + 1), delay);
          }
        }
      };
      await tryConnect();
    };

    init();
    return () => { isMounted.current = false; };
  }, [norm]);

  // ─── Socket connection-state listeners ───────────────────────────────
  useEffect(() => {
    const onConnect = () => { if (isMounted.current) setIsConnected(true); };
    const onDisconnect = () => { if (isMounted.current) setIsConnected(false); };
    const onReconnect = () => { if (isMounted.current) setIsConnected(false); };
    const onReconnected = () => { if (isMounted.current) setIsConnected(true); };

    chatSocket.on('connect', onConnect);
    chatSocket.on('disconnect', onDisconnect);
    chatSocket.on('reconnect', onReconnect);
    chatSocket.on('reconnect-success', onReconnected);

    return () => {
      chatSocket.off('connect', onConnect);
      chatSocket.off('disconnect', onDisconnect);
      chatSocket.off('reconnect', onReconnect);
      chatSocket.off('reconnect-success', onReconnected);
    };
  }, []);

  // ─── Load conversation list ──────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    const me = meUserIdRef.current;

    if (!me) return;
    try {
      setLoading(true);

      // Get conversations from API
      const response = await conversationApi.getConversations();

      // Extract data array - server returns { success, data, pagination }
      const conversationList: any[] = Array.isArray(response)
        ? response
        : (response?.data ?? []);

      if (!Array.isArray(conversationList)) {
        setChatUsers([]);
        return;
      }

      // Convert conversations to ChatUser list. Do NOT deduplicate by user:
      // one transporter can have multiple load-specific conversations.
      const users: ChatUser[] = [];

      conversationList.forEach((conv: any) => {
        const participants = conv.participants || [];

        // Find other participant (not current user)
        const otherParticipant = participants.find((p: any) => {
          const pId = String(p?._id || p);
          return pId !== me && pId !== String(me);
        });

        if (!otherParticipant) return;

        const pId = String(otherParticipant?._id || otherParticipant || '');
        const fullName = otherParticipant?.fullName ||
          `${otherParticipant?.firstName || ''} ${otherParticipant?.lastName || ''}`.trim() ||
          otherParticipant?.email ||
          'Unknown User';

        const loadSummary = conv.loadSummary || {};
        const loadId = conv.loadId ? String(conv.loadId) : undefined;
        const loadNumber = loadSummary.loadNumber ? String(loadSummary.loadNumber) : undefined;
        const loadRoute =
          loadSummary.pickup && loadSummary.delivery
            ? `${loadSummary.pickup} → ${loadSummary.delivery}`
            : undefined;
        const conversationId = String(conv._id || conv.id || '');
        const user: ChatUser = {
          id: pId,
          conversationId,
          loadId,
          loadNumber,
          loadRoute,
          loadStatus: loadSummary.status,
          loadPriority: loadSummary.priority,
          loadMaterial: loadSummary.material,
          bidId: conv.bidId ? String(conv.bidId) : undefined,
          conversationType: conv.conversationType,
          adminOnly: conv.adminOnly,
          isBlocked: !!conv.block?.isBlocked,
          block: conv.block,
          isArchived: conv.isArchived,
          loadLabel: loadNumber
            ? `Load ${loadNumber}`
            : loadId
              ? `Load ${loadId.slice(-6)}`
              : undefined,
          email: otherParticipant?.email || '',
          fullName,
          username: otherParticipant?.username || otherParticipant?.email?.split('@')[0] || 'user',
          profile: otherParticipant?.profile || otherParticipant?.avatar || '',
          isOnline: otherParticipant?.isOnline ?? false,
          lastSeen: otherParticipant?.lastSeen ? new Date(otherParticipant.lastSeen) : undefined,
          unreadCount: conv.unreadCount ?? 0,
          tenantId: conv.tenantId || '',
          lastMessage: conv.lastMessage ? formatMessage(conv.lastMessage, me) : undefined,
        };

        users.push(user);
      });

      setChatUsers(users);
      setError(null);
    } catch (err: any) {
      if (!isMounted.current) return;
      console.error('Failed to load conversations:', err?.message);
      setError('Failed to load conversations');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [norm, formatMessage]);

  // Load once when meUserId is ready, then poll every 30 s
  useEffect(() => {
    // if (!meUserId) return;
    loadUsers();
    const t = setInterval(loadUsers, 30_000);
    return () => clearInterval(t);
  }, [meUserId]); // Only depend on meUserId, not loadUsers

  // ─── Load initial 50 messages for selected user ─────────────────────
  const loadMessages = useCallback(async (userId: string, options?: { resetCache?: boolean; conversationId?: string }) => {
    const me = meUserIdRef.current;
    if (!me) return;
    const uid = norm(userId);
    const chatKey = options?.conversationId ? norm(options.conversationId) : uid;

    // If resetCache is true, clear the cache for this user
    if (options?.resetCache) {
      messagesCache.current[chatKey] = [];
      cursorRef.current[chatKey] = null;
      hasMoreRef.current[chatKey] = false;
      setHasMore(false);
    }

    // Serve stale cache immediately while fetching fresh
    if (messagesCache.current[chatKey]?.length) {
      setSelectedUserMessages(messagesCache.current[chatKey]);
    }

    try {
      setLoading(true);
      const res = options?.conversationId
        ? await messageApi.getMessagesByConversation(options.conversationId, { limit: 50 })
        : await messageApi.getMessages(me, uid, { limit: 50 });

      const msgs: Message[] = (res?.data ?? []).map((m: any) => formatMessage(m, me));

      // Sort messages chronologically
      const sortedMsgs = msgs.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setSelectedUserMessages(sortedMsgs);
      messagesCache.current[chatKey] = sortedMsgs;

      // Store cursor (oldest message timestamp) and hasMore flag
      cursorRef.current[chatKey] = res?.pagination?.nextCursor ?? null;
      hasMoreRef.current[chatKey] = res?.pagination?.hasMore ?? false;
      setHasMore(res?.pagination?.hasMore ?? false);

      await markMessagesAsRead(uid);
    } catch (err) {
      if (!isMounted.current) return;
      setError('Failed to load messages');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [norm, formatMessage, markMessagesAsRead]);

  // ─── Load OLDER messages (infinite scroll upward) ───────────────────
  const loadMoreMessages = useCallback(async () => {
    const uid = selectedUserIdRef.current;
    const me = meUserIdRef.current;

    if (!uid || !me) {
      return;
    }

    if (loadingMoreRef.current) {
      return; // already loading
    }

    if (!hasMoreRef.current[uid]) {
      return; // nothing more
    }

    const cursor = cursorRef.current[uid];
    if (!cursor) {
      return;
    }

    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);

      const res = selectedUser?.conversationId
        ? await messageApi.getMessagesByConversation(selectedUser.conversationId, {
          limit: 50,
          before: cursor
        })
        : await messageApi.getMessages(me, uid, {
          limit: 50,
          before: cursor
        });


      const older: Message[] = (res?.data ?? []).map((m: any) => formatMessage(m, me));

      if (older.length === 0) {
        hasMoreRef.current[uid] = false;
        setHasMore(false);
        return;
      }

      // Sort older messages chronologically
      const sortedOlder = older.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Prepend older messages and de-dup
      setSelectedUserMessages(prev => {
        const existingIds = new Set(prev.map(m => norm(m.id)));
        const newOnes = sortedOlder.filter(m => !existingIds.has(norm(m.id)));
        // Ensure chronological order: older first, then existing
        return [...newOnes, ...prev];
      });

      // Update cache
      const cache = messagesCache.current[uid] ?? [];
      const cacheIds = new Set(cache.map(m => norm(m.id)));
      const newOnes = sortedOlder.filter(m => !cacheIds.has(norm(m.id)));
      messagesCache.current[uid] = [...newOnes, ...cache];

      // Advance cursor
      cursorRef.current[uid] = res?.pagination?.nextCursor ?? null;
      hasMoreRef.current[uid] = res?.pagination?.hasMore ?? false;
      setHasMore(res?.pagination?.hasMore ?? false);

    } catch (err) {
      console.error('[loadMoreMessages] Error loading more messages:', err);
      // Silently handle error - user can try again by scrolling
    } finally {
      loadingMoreRef.current = false;
      if (isMounted.current) setLoadingMore(false);
    }
  }, [norm, formatMessage, selectedUser?.conversationId]);

  // ─── Reset conversation state ───────────────────────────────────────
  const resetConversation = useCallback((uid: string) => {
    cursorRef.current[uid] = null;
    hasMoreRef.current[uid] = false;
    setHasMore(false);
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }, []);

  // ─── Trigger load when selected user changes ────────────────────────
  const selectedUserId = selectedUser ? norm(selectedUser.id) : '';
  const selectedConversationId = selectedUser?.conversationId ? norm(selectedUser.conversationId) : '';

  useEffect(() => {
    if (selectedUser && meUserId) {
      const uid = selectedUserId;
      const chatKey = selectedConversationId || uid;
      selectedUserIdRef.current = chatKey;

      if (activeConversationKeyRef.current === chatKey) {
        return;
      }

      activeConversationKeyRef.current = chatKey;

      // Reset pagination state for this conversation
      resetConversation(chatKey);

      // Reset unread badge
      setChatUsers(prev => prev.map(u =>
        (u.conversationId ? norm(u.conversationId) : norm(u.id)) === chatKey ? { ...u, unreadCount: 0 } : u
      ));

      // Load messages only when the actual conversation changes
      loadMessages(uid, { resetCache: true, conversationId: selectedUser.conversationId });
    } else {
      activeConversationKeyRef.current = null;
      selectedUserIdRef.current = null;
      setSelectedUserMessages([]);
      setHasMore(false);
    }
  }, [selectedUser, meUserId, norm, loadMessages, resetConversation, selectedConversationId, selectedUserId]);

  // ─── Socket event listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!meUserId) return;

    /** Insert/update a message coming from the socket. */
    const reconcile = (raw: any, countUnread: boolean) => {
      const me = meUserIdRef.current;
      const msg = formatMessage(raw, me);
      const uid = otherUserId(msg);
      const messageConversationId = raw?.conversationId || msg.conversationId;
      const msgChatKey = messageConversationId ? norm(messageConversationId) : norm(uid);
      const cur = selectedUserIdRef.current;

      // Update active conversation
      if (cur && msgChatKey === cur) {
        setSelectedUserMessages(prev => {
          const updated = upsert(prev, msg);
          // Keep messages sorted chronologically
          return updated.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });
        messagesCache.current[cur] = upsert(messagesCache.current[cur] ?? [], msg);
        if (norm(msg.senderId) !== me) markMessagesAsRead(uid);
      }

      // Update sidebar list
      setChatUsers(prev => prev.map(u => {
        const rowKey = u.conversationId ? norm(u.conversationId) : norm(u.id);
        if (rowKey !== msgChatKey) return u;
        const shouldBump = countUnread && norm(msg.senderId) !== me && rowKey !== cur;
        return {
          ...u,
          lastMessage: msg,
          unreadCount: shouldBump ? (u.unreadCount ?? 0) + 1 : u.unreadCount,
        };
      }));
    };

    const onReceive = (d: any) => reconcile(d, true);
    const onSent = (d: any) => reconcile(d, false);

    const onTyping = (d: { userId: string }) => {
      const uid = norm(d.userId);
      // Clear any pending auto-stop timer
      if (typingTimers.current[uid]) clearTimeout(typingTimers.current[uid]);
      setIsTypingByUserId(prev => ({ ...prev, [uid]: true }));
      // Auto-clear on client side too (safety net)
      typingTimers.current[uid] = setTimeout(() => {
        setIsTypingByUserId(prev => ({ ...prev, [uid]: false }));
        delete typingTimers.current[uid];
      }, TYPING_TIMEOUT_MS + 500);
    };

    const onStopTyping = (d: { userId: string }) => {
      const uid = norm(d.userId);
      if (typingTimers.current[uid]) {
        clearTimeout(typingTimers.current[uid]);
        delete typingTimers.current[uid];
      }
      setIsTypingByUserId(prev => ({ ...prev, [uid]: false }));
    };

    const onStatusChange = (d: { userId: string; isOnline: boolean; lastSeen?: any }) => {
      const uid = norm(d.userId);
      setChatUsers(prev => prev.map(u =>
        norm(u.id) === uid ? { ...u, isOnline: d.isOnline, lastSeen: d.lastSeen ? new Date(d.lastSeen) : u.lastSeen } : u
      ));
      setSelectedUser(prev =>
        prev && norm(prev.id) === uid
          ? { ...prev, isOnline: d.isOnline, lastSeen: d.lastSeen ? new Date(d.lastSeen) : prev.lastSeen }
          : prev
      );
    };

    const onOnlineUsers = (ids: string[]) => {
      const onlineSet = new Set(ids.map(norm));
      setChatUsers(prev => prev.map(u => ({ ...u, isOnline: onlineSet.has(norm(u.id)) })));
      setSelectedUser(prev => prev ? { ...prev, isOnline: onlineSet.has(norm(prev.id)) } : prev);
    };

    const onReaction = (d: { messageId: string; reactions: any[] }) => {
      const mid = norm(d.messageId);
      const update = (msg: Message): Message =>
        norm(msg.id) !== mid ? msg : {
          ...msg,
          reactions: d.reactions.map((r: any) => ({
            userId: norm(r.userId),
            username: r.username || 'Unknown',
            emoji: r.emoji,
            timestamp: new Date(r.timestamp || Date.now()),
          })),
        };
      setSelectedUserMessages(prev => prev.map(update));
    };

    const onDeleted = (d: { messageId: string }) => {
      const mid = norm(d.messageId);
      const update = (msg: Message): Message =>
        norm(msg.id) !== mid ? msg : { ...msg, isDeleted: true, content: 'This message was deleted' };
      setSelectedUserMessages(prev => prev.map(update));
      const cur = selectedUserIdRef.current;
      if (cur && messagesCache.current[cur])
        messagesCache.current[cur] = messagesCache.current[cur].map(update);
    };

    const onEdited = (d: { messageId: string; content: string }) => {
      const mid = norm(d.messageId);
      const update = (msg: Message): Message =>
        norm(msg.id) !== mid ? msg : { ...msg, content: d.content, isEdited: true };
      setSelectedUserMessages(prev => prev.map(update));
    };

    const onRead = (d: { messageId: string }) => {
      const mid = norm(d.messageId);
      setSelectedUserMessages(prev =>
        prev.map(msg => norm(msg.id) === mid ? { ...msg, isRead: true, status: 'read' } : msg)
      );
    };

    const onAllRead = (d: { senderId: string }) => {
      const sid = norm(d.senderId);
      setSelectedUserMessages(prev =>
        prev.map(msg =>
          norm(msg.senderId) === sid && !msg.isRead ? { ...msg, isRead: true, status: 'read' } : msg
        )
      );
    };

    const onError = (d: { error: string; tempId?: string }) => {
      if (d.tempId) {
        const tid = norm(d.tempId);
        const remove = (arr: Message[]) =>
          arr.filter(m => norm(m.id) !== tid && norm(m.tempId) !== tid);
        setSelectedUserMessages(remove);
        const cur = selectedUserIdRef.current;
        if (cur && messagesCache.current[cur])
          messagesCache.current[cur] = remove(messagesCache.current[cur]);
      }
      setError(d.error || 'Failed to send message');
    };

    chatSocket.on('receive-message', onReceive);
    chatSocket.on('message-sent', onSent);
    chatSocket.on('user-typing', onTyping);
    chatSocket.on('user-stop-typing', onStopTyping);
    chatSocket.on('user-status-change', onStatusChange);
    chatSocket.on('online-users', onOnlineUsers);
    chatSocket.on('message-reaction', onReaction);
    chatSocket.on('message-deleted', onDeleted);
    chatSocket.on('message-edited', onEdited);
    chatSocket.on('message-read', onRead);
    chatSocket.on('all-messages-read', onAllRead);
    chatSocket.on('message-error', onError);

    return () => {
      chatSocket.off('receive-message', onReceive);
      chatSocket.off('message-sent', onSent);
      chatSocket.off('user-typing', onTyping);
      chatSocket.off('user-stop-typing', onStopTyping);
      chatSocket.off('user-status-change', onStatusChange);
      chatSocket.off('online-users', onOnlineUsers);
      chatSocket.off('message-reaction', onReaction);
      chatSocket.off('message-deleted', onDeleted);
      chatSocket.off('message-edited', onEdited);
      chatSocket.off('message-read', onRead);
      chatSocket.off('all-messages-read', onAllRead);
      chatSocket.off('message-error', onError);
    };
  }, [meUserId, formatMessage, norm, upsert, otherUserId, markMessagesAsRead]);

  // ─── Cleanup typing timers on unmount ─────────────────────────────
  useEffect(() => () => {
    Object.values(typingTimers.current).forEach(clearTimeout);
  }, []);

  // ─── Check if conversation exists ────────────────────────────────────
  const hasConversation = useCallback((userId: string): boolean => {
    const uid = norm(userId);
    return (messagesCache.current[uid]?.length ?? 0) > 0;
  }, [norm]);
  const sendMessage = useCallback(
    async ({
      recipientId,
      content,
      type = 'text',
      attachments = [],
      replyToId,
      loadId,
      conversationId,
    }: any) => {
      const me = meUserIdRef.current;

      if (!me || !recipientId) return;

      const rid = norm(recipientId);
      const chatKey = selectedUserIdRef.current || rid;

      const tempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

      const tempMsg: Message = {
        id: tempId,
        tempId,

        senderId: me,
        senderName,

        recipientId: rid,

        content,
        type,

        timestamp: new Date(),

        isRead: false,
        isDelivered: false,
        status: 'sent',

        reactions: [],
        attachments,

        isEdited: false,
        isDeleted: false,
        isForwarded: false,

        replyToId,

        metadata: loadId
          ? {
            loadId,
          }
          : {},
      };

      setSelectedUserMessages(prev =>
        [...prev, tempMsg].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        )
      );

      messagesCache.current[chatKey] = upsert(
        messagesCache.current[chatKey] || [],
        tempMsg
      );

      setChatUsers(prev =>
        prev.map(user =>
          (user.conversationId ? norm(user.conversationId) : norm(user.id)) === chatKey
            ? {
              ...user,
              lastMessage: tempMsg,
            }
            : user
        )
      );

      try {
        if (isConnected) {
          chatSocket.sendMessage({
            senderId: me,
            recipientId: rid,
            content,
            type,
            tempId,
            senderName,
            attachments,
            replyToId,
            conversationId,
            metadata: loadId
              ? {
                loadId,
              }
              : {},
          });
        } else {
          const res = await messageApi.sendMessageRest({
            recipientId: rid,
            content,
            type,
            attachments,
            replyToId,
            conversationId,
            metadata: loadId
              ? {
                loadId,
              }
              : undefined,
          });

          if (res?.data) {
            const realMsg: Message = {
              ...formatMessage(res.data, me),
              tempId,
            };

            setSelectedUserMessages(prev =>
              prev.map(m =>
                m.tempId === tempId ? realMsg : m
              )
            );
          }
        }
      } catch (error: any) {
        setSelectedUserMessages(prev =>
          prev.filter(m => m.tempId !== tempId)
        );

        setError(
          error?.message || 'Failed to send message'
        );
      }
    },
    [
      senderName,
      isConnected,
      norm,
      upsert,
      formatMessage,
    ]
  );
  // ─── Send message with explicit loadId (NEW) ────────────────────────
  const sendLoadMessage = useCallback(async (
    recipientId: string,
    content: string,
    loadId: string,
    replyToId?: string,
  ) => {
    return sendMessage({
      recipientId,
      content,
      loadId,
      replyToId,
      type: 'text',
    });

  }, [sendMessage]);

  // ─── Upload file ──────────────────────────────────────────────────────
  const uploadFile = useCallback(async (
    file: File,
    conversationId: string,
    onProgress?: (progress: number) => void
  ) => {
    try {
      const response = await messageApi.uploadFile(file, conversationId, onProgress);
      // messageApi.uploadFile already extracts response.data, so return as-is
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
      throw err;
    }
  }, []);

  // ─── Emit typing ─────────────────────────────────────────────────────
  const emitTyping = useCallback((recipientId: string, typing: boolean) => {
    const me = meUserIdRef.current;
    if (!me || !isConnected) return;
    chatSocket.sendTyping(me, norm(recipientId), typing);
  }, [norm, isConnected]);

  // ─── Add reaction ────────────────────────────────────────────────────
  const addReaction = useCallback((messageId: string, emoji: string) => {
    const me = meUserIdRef.current;
    if (!me || !isConnected) return;
    const mid = norm(messageId);

    // Optimistic
    const update = (msg: Message): Message => {
      if (norm(msg.id) !== mid) return msg;
      const existing = msg.reactions.findIndex(r => norm(r.userId) === me);
      const next = [...msg.reactions];
      if (existing >= 0) { next[existing] = { ...next[existing], emoji }; }
      else { next.push({ userId: me, username: senderName, emoji, timestamp: new Date() }); }
      return { ...msg, reactions: next };
    };

    setSelectedUserMessages(prev => prev.map(update));
    const cur = selectedUserIdRef.current;
    if (cur && messagesCache.current[cur]) {
      messagesCache.current[cur] = messagesCache.current[cur].map(update);
    }

    chatSocket.addReaction({ messageId: mid, emoji, userId: me, username: senderName });
  }, [norm, senderName, isConnected]);

  // ─── Remove reaction ─────────────────────────────────────────────────
  const removeReaction = useCallback((messageId: string, emoji: string) => {
    const me = meUserIdRef.current;
    if (!me) return;
    const mid = norm(messageId);

    const update = (msg: Message): Message =>
      norm(msg.id) !== mid
        ? msg
        : {
          ...msg,
          reactions: msg.reactions.filter(
            r => !(norm(r.userId) === me && r.emoji === emoji)
          ),
        };

    setSelectedUserMessages(prev => prev.map(update));
    const cur = selectedUserIdRef.current;
    if (cur && messagesCache.current[cur]) {
      messagesCache.current[cur] = messagesCache.current[cur].map(update);
    }

    if (isConnected) {
      chatSocket.addReaction({
        messageId: mid,
        emoji: '',
        userId: me,
        username: senderName,
      });
      return;
    }

    messageApi.removeReaction(mid, emoji).catch(() => {
      if (cur) loadMessages(cur);
    });
  }, [norm, isConnected, senderName, loadMessages]);

  // ─── Delete message ──────────────────────────────────────────────────
  const deleteMessage = useCallback(async (messageId: string) => {
    const me = meUserIdRef.current;
    if (!me) return;
    const mid = norm(messageId);

    const update = (msg: Message): Message =>
      norm(msg.id) !== mid ? msg : { ...msg, isDeleted: true, content: 'This message was deleted' };

    setSelectedUserMessages(prev => prev.map(update));
    const cur = selectedUserIdRef.current;
    if (cur && messagesCache.current[cur])
      messagesCache.current[cur] = messagesCache.current[cur].map(update);

    if (isConnected) {
      chatSocket.deleteMessage(mid, me, 'all');
    } else {
      try {
        await messageApi.deleteMessage(mid, 'all');
      } catch (err: any) {
        // Rollback optimistic deletion
        setSelectedUserMessages(prev => prev.filter(m => norm(m.id) !== mid));
        const cur = selectedUserIdRef.current;
        if (cur) loadMessages(cur);
      }
    }
  }, [norm, isConnected, loadMessages]);

  // ─── Edit message ────────────────────────────────────────────────────
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const me = meUserIdRef.current;
    if (!me || !newContent.trim()) return;
    const mid = norm(messageId);
    const trimmed = newContent.trim();

    // Optimistic update
    const update = (msg: Message): Message =>
      norm(msg.id) !== mid ? msg : { ...msg, content: trimmed, isEdited: true };

    setSelectedUserMessages(prev => prev.map(update));
    const cur = selectedUserIdRef.current;
    if (cur && messagesCache.current[cur]) {
      messagesCache.current[cur] = messagesCache.current[cur].map(update);
    }

    const reloadFallback = async () => {
      if (cur) await loadMessages(cur);
    };

    if (isConnected) {
      chatSocket.editMessage(mid, trimmed, me);
    } else {
      messageApi.editMessage(mid, trimmed).catch(() => {
        reloadFallback();
      });
    }
  }, [norm, isConnected, loadMessages]);

  // ─── Pin / Favorite ───────────────────────────────────────────────────
  const togglePinMessage = useCallback(async (messageId: string) => {
    const me = meUserIdRef.current;
    if (!me) return;

    const mid = norm(messageId);
    const cur = selectedUserIdRef.current;

    // Optimistic: update if the field exists; otherwise just do REST then reload.
    const toggleOptimistic = () => {
      setSelectedUserMessages(prev =>
        prev.map(msg => {
          if (norm(msg.id) !== mid) return msg;

          // If the message model already has a pin field, toggle it.
          if (typeof (msg as any).isPinned === 'boolean') {
            return { ...msg, isPinned: !(msg as any).isPinned, isForwarded: (msg as any).isForwarded };
          }
          if (typeof (msg as any).pinned === 'boolean') {
            return { ...msg, pinned: !(msg as any).pinned };
          }
          // Otherwise keep as-is; will rely on reload.
          return msg;
        })
      );

      if (cur && messagesCache.current[cur]) {
        messagesCache.current[cur] = messagesCache.current[cur].map(msg => {
          if (norm(msg.id) !== mid) return msg;
          if (typeof (msg as any).isPinned === 'boolean') {
            return { ...msg, isPinned: !(msg as any).isPinned };
          }
          if (typeof (msg as any).pinned === 'boolean') {
            return { ...msg, pinned: !(msg as any).pinned };
          }
          return msg;
        });
      }
    };

    const reload = async () => {
      if (cur) await loadMessages(cur);
    };

    toggleOptimistic();

    try {
      if (isConnected) {
        // Prefer REST for pin toggle reliability unless socket event exists.
        // Fallback to reload on any mismatch.
        await messageApi.togglePinMessage(mid);
        await reload();
      } else {
        await messageApi.togglePinMessage(mid);
        await reload();
      }
    } catch (e) {
      // Consistency fallback
      await reload();
    }
  }, [norm, isConnected, loadMessages]);

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    // State
    meUserId,
    senderName,
    chatUsers,
    selectedUser,
    setSelectedUser,
    selectedUserMessages,
    isTypingByUserId,
    isConnected,
    replyTo,
    setReplyTo,
    loading,
    error,

    // Infinite Scroll - NEW
    loadMoreMessages,
    hasMoreMessages: hasMore,
    isLoadingMore: loadingMore,

    // Actions
    sendMessage,
    sendLoadMessage, // NEW: Explicitly requires loadId
    emitTyping,
    addReaction,
    removeReaction,
    deleteMessage,
    editMessage,
    togglePinMessage,
    loadMessages,
    hasConversation, // NEW: Check if conversation exists
    uploadFile,      // NEW: File upload with progress callback
    norm,
  };
}
