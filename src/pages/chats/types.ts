/**
 * Chat System Type Definitions
 * Comprehensive types for messages, attachments, and chat management
 */

// ===== Base Types =====
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type VisibilityLevel = 'public' | 'private' | 'restricted';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// ===== Attachment Types =====
export interface AttachmentBase {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
  size?: number;
  mimeType?: string;
}

export interface ImageAttachment extends AttachmentBase {
  width?: number;
  height?: number;
  thumbnail?: string;
  blurhash?: string; // For image preview loading
}

export interface VideoAttachment extends AttachmentBase {
  duration?: number;
  thumbnail?: string;
  width?: number;
  height?: number;
  codecs?: string;
}

export interface AudioAttachment extends AttachmentBase {
  duration?: number;
  bitrate?: number;
  sampleRate?: number;
}

export interface FileAttachment extends AttachmentBase {
  extension?: string;
  description?: string;
}

export interface LocationAttachment extends AttachmentBase {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  placeName?: string;
  zoomLevel?: number;
}

export interface ContactAttachment extends AttachmentBase {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  organization?: string;
  profilePhoto?: string;
  vCardData?: string;
}

export type Attachment = 
  | ImageAttachment 
  | VideoAttachment 
  | AudioAttachment 
  | FileAttachment 
  | LocationAttachment 
  | ContactAttachment;

// ===== Reaction =====
export interface MessageReaction {
  userId: string;
  username: string;
  emoji: string;
  timestamp: Date;
}

// ===== Reply Reference =====
export interface MessageReplyTo {
  messageId: string;
  content: string;
  sender: string;
  senderId: string;
  type: MessageType;
  timestamp: Date;
}

// ===== Main Message Type =====
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  tenantId?: string;
  
  // Content
  content: string;
  type: MessageType;
  attachments: Attachment[];
  
  // Metadata
  timestamp: Date;
  status: MessageStatus;
  isRead: boolean;
  isDelivered: boolean;
  readAt?: Date;
  deliveredAt?: Date;
  
  // Interactions
  reactions: MessageReaction[];
  replyTo?: MessageReplyTo;
  
  // Editing & Deletion
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  
  // Pinning
  isPinned: boolean;
  pinnedAt?: Date;
  
  // Forwarding
  isForwarded: boolean;
  originalMessageId?: string;
  
  // Approval & Visibility
  visibility: VisibilityLevel;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  
  // Custom data
  metadata?: Record<string, any>;
}

// ===== Chat User =====
export interface ChatUser {
  id: string;
  conversationId?: string;
  loadId?: string;
  bidId?: string;
  conversationType?: string;
  adminOnly?: boolean;
  loadLabel?: string;
  email: string;
  username: string;
  fullName: string;
  profile?: string;
  isOnline: boolean;
  lastSeen: Date;
  isBlocked?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  status?: string;
  statusEmoji?: string;
}

// ===== Conversation =====
export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  type: 'direct' | 'group';
  name?: string; // For group chats
  description?: string;
  avatar?: string;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Message Group (for grouped by date) =====
export interface GroupedMessages {
  [dateKey: string]: Message[];
}

// ===== File Upload Progress =====
export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

// ===== Typing Indicator =====
export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
  timestamp: Date;
}

// ===== Message Events =====
export interface MessageEvent {
  type: 'message:sent' | 'message:delivered' | 'message:read' | 'message:deleted' | 'message:edited';
  messageId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ===== Error Types =====
export interface ChatError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// ===== API Request/Response =====
export interface SendMessagePayload {
  recipientId: string;
  content: string;
  type: MessageType;
  attachments?: Attachment[];
  replyToId?: string;
  loadId?: string;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  error?: ChatError;
  timestamp: Date;
}

export interface PaginatedMessagesResponse {
  messages: Message[];
  hasMore: boolean;
  cursor?: string;
  total: number;
  timestamp: Date;
}
