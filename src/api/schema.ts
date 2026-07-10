// api/schema.ts
export interface ChatUser {
  id: string;
  _id?: string;
  conversationId?: string;
  loadId?: string;
  loadNumber?: string;
  loadRoute?: string;
  loadStatus?: string;
  loadPriority?: string;
  loadMaterial?: string;
  bidId?: string;
  conversationType?: string;
  adminOnly?: boolean;
  isBlocked?: boolean;
  block?: {
    isBlocked?: boolean;
    blockedBy?: string | null;
    blockedAt?: string | Date | null;
    blockedByRole?: string | null;
    reason?: string;
  };
  isArchived?: boolean;
  isMuted?: boolean;
  loadLabel?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  profile?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  unreadCount?: number;
  lastMessage?: Message;
  tenantId?: string;
}

export interface Message {
  id: string;
  _id?: string;
  tempId?: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'system';
  timestamp: Date;
  isRead: boolean;
  isDelivered?: boolean;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  reactions: Reaction[];
  attachments: Attachment[];
  isEdited: boolean;
  isDeleted: boolean;
  isForwarded: boolean;
  replyToId?: string;
  replyTo?: ReplyTo;
  tenantId?: string;
  metadata?: any;
  conversationId?: string;
}

export interface Reaction {
  userId: string;
  username: string;
  emoji: string;
  timestamp: Date;
}

export interface Attachment {
  id?: string;
  url: string;
  type: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface ReplyTo {
  messageId: string;
  content: string;
  sender: string;
  senderId: string;
}

export interface ChatPreviewMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export interface Chats {
  id: string;
  profile: string;
  username: string;
  fullName: string;
  title: string;
  messages: ChatPreviewMessage[];
}

export interface Conversation {
  _id: string;
  id?: string;
  participants: ChatUser[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
  createdAt: Date;
  tenantId?: string;
  isArchived?: boolean;
  isPinned?: boolean;
  isGroup?: boolean;
  groupName?: string;
  conversationType?: string;
  loadId?: string;
  bidId?: string;
  block?: {
    isBlocked?: boolean;
    blockedBy?: string | null;
    blockedAt?: string | Date | null;
    blockedByRole?: string | null;
    reason?: string;
  };
  lastMessageAt?: Date;
  metadata?: any;
}

export interface ConversationsResponse {
  success: boolean;
  data: Conversation[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
  pagination: {
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export interface User {
  id: string;
  _id?: string;
  fullName?: string;
  username?: string;
  email?: string;
  profile?: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  tenantId?: string;
}

