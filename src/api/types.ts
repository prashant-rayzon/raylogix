export type UserRole = 'super_admin' | 'company_admin' | 'company_user' | 'transporter' | 'finance';

export interface BranchDetails {
  id: string;
  name: string;
  code: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  status: string;
}

export interface AccessLevel {
  isAdmin: boolean;
  isBranchStaff: boolean;
  operationalRole: string;
  assignedBranchId: string | null;
  canManageBranches: boolean;
  canRecordGate: boolean;
  canInspect: boolean;
  canViewAllBranches: boolean;
  accessibleBranchIds: string[] | null;
}

export interface AuthUser {
  _id: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username?: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
  branchId?: string | null;
  operationalRole?: 'none' | 'branch_manager' | 'watchman' | 'inspection_officer';
  team?: 'general' | 'inbound' | 'outbound';
  branch?: BranchDetails | null;
  accessLevel?: AccessLevel;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  _id: string;
  name: string;
  subdomain: string;
  companyCode?: string;
  databaseName?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  maxUsers?: number;
  maxTransporters?: number;
  isActive: boolean;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MasterGroup {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'inactive';
  masterCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Master {
  _id: string;
  groupId:
    | string
    | {
        _id: string;
        name: string;
        code: string;
        status: 'active' | 'inactive';
      };
  name: string;
  code: string;
  value?: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface TenantSetting {
  _id: string;
  tenantId: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  maxUsers: number;
  maxTransporters: number;
  features: {
    advancedReporting: boolean;
    apiAccess: boolean;
    customBranding: boolean;
  };
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  error: string;
  message?: string;
  details?: unknown;
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  user: AuthUser
  expiresIn: number
}

export interface RefreshResponse {
  success: boolean
  accessToken: string
  refreshToken: string
}

export interface MeResponse {
  success: boolean
  user: AuthUser
}

// Chat types
export interface ChatUser {
  id: string
  _id?: string
  email: string
  firstName?: string
  lastName?: string
  fullName: string
  username: string
  profile?: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
  currentStatus?: 'online' | 'away' | 'busy' | 'offline'
  lastActivity?: string
  unreadCount?: number
  tenantId?: string
  lastMessage?: Message
}

export interface Reaction {
  userId: string
  username: string
  emoji: string
  timestamp: Date
}

export interface Attachment {
  url: string
  type: string
  name: string
  size?: number
}

export interface ReplyTo {
  messageId: string
  content: string
  sender: string
  senderId: string
}

export interface Message {
  id: string
  _id?: string
  tempId?: string
  senderId: string
  senderName: string
  recipientId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system'
  isRead: boolean
  isDelivered?: boolean
  status: 'sent' | 'delivered' | 'read'
  timestamp: Date
  reactions: Reaction[]
  attachments: Attachment[]
  isEdited: boolean
  isDeleted: boolean
  isForwarded: boolean
  replyToId?: string
  replyTo?: ReplyTo
  metadata?: Record<string, any>
  conversationId?: string
}

export interface Conversation {
  _id: string
  id?: string
  participants: ChatUser[]
  tenantId: string
  conversationType?: 'company-transporter' | 'admin-user' | 'group' | 'admin-group' | 'company-internal'
  loadId?: string
  bidId?: string
  lastMessage?: Message
  lastMessageAt?: Date
  unreadCount: number
  isArchived: boolean
  isPinned?: boolean
  isGroup: boolean
  groupName?: string
  groupAdmin?: string
  groupMembers?: Array<{ user: ChatUser; role: string }>
  metadata?: Record<string, any>
  adminOnly?: boolean
  settings?: {
    notifications: boolean
    pinMessages?: string[]
    muteUntil?: Date
  }
}

export interface ConversationsResponse {
  success: boolean
  data: Conversation[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export interface MessagesResponse {
  success: boolean
  data: Message[]
  pagination: {
    limit: number
    total: number
    hasMore: boolean
    nextCursor?: string
  }
}

export interface ChatMessage {
  _id: string
  senderId: string
  senderName: string
  recipientId: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file'
  isRead: boolean
  status: 'sent' | 'delivered' | 'read'
  timestamp: string
}

export interface Trip {
  _id: string
  tripNumber: string
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  startLocation: string
  endLocation: string
  distance: number
  estimatedTime: number
  createdAt: string
}

