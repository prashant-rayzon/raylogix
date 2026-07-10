// socket/chatSocket.ts
import io, { Socket } from 'socket.io-client';
import { Message, Reaction } from '@/api/schema';

export class ChatSocket {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  connect(token: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('🔌 Socket already connected');
        this.emitToListeners('connect', { socketId: this.socket.id });
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('⏳ Socket already connecting...');
        let waitTimeout: ReturnType<typeof setTimeout>;
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection);
            clearTimeout(waitTimeout);
            resolve();
          }
        }, 100);
        waitTimeout = setTimeout(() => {
          clearInterval(checkConnection);
          reject(new Error('Connection timeout'));
        }, 10000);
        return;
      }

      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnecting = true;

      const SOCKET_URL = (
        import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_API_BASE ||
        import.meta.env.VITE_API_BASE_URL ||
        'http://101.53.150.120:5000'
      ).replace(/\/api\/?$/, '');
      console.log('🔌 Connecting to socket:', SOCKET_URL);

      this.socket = io(SOCKET_URL, {
        auth: { token },
        query: { userId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected with ID:', this.socket?.id);
        this.isConnecting = false;
        this.emit('user-join', { userId });
        this.emitToListeners('connect', { socketId: this.socket?.id });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.isConnecting = false;
        this.emitToListeners('connect-error', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.isConnecting = false;
        this.emitToListeners('disconnect', { reason });
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        this.emit('user-join', { userId });
        this.emitToListeners('reconnect-success', { attemptNumber });
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Socket reconnect attempt:', attemptNumber);
        this.emitToListeners('reconnect', { attemptNumber });
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Socket reconnect failed after', this.maxReconnectAttempts, 'attempts');
        this.isConnecting = false;
        this.emitToListeners('reconnect-failed', undefined);
      });

      // Event listeners
      this.socket.on('receive-message', (data: Message) => {
        this.emitToListeners('receive-message', data);
      });

      this.socket.on('message-sent', (data: Message) => {
        this.emitToListeners('message-sent', data);
      });

      this.socket.on('new-message-notification', (data: {
        from: string;
        senderName: string;
        content: string;
        messageId: string;
        tenantId?: string;
        loadId?: string | null;
        isFirstMessage?: boolean;
      }) => {
        this.emitToListeners('new-message-notification', data);
      });

      this.socket.on('new-conversation-started', (data: {
        from: string;
        senderName: string;
        loadId: string | null;
        conversationId: string;
        messageId: string;
      }) => {
        this.emitToListeners('new-conversation-started', data);
      });

      this.socket.on('user-typing', (data: { userId: string; recipientId: string }) => {
        this.emitToListeners('user-typing', data);
      });

      this.socket.on('user-stop-typing', (data: { userId: string; recipientId: string }) => {
        this.emitToListeners('user-stop-typing', data);
      });

      this.socket.on('user-status-change', (data: {
        userId: string;
        isOnline: boolean;
        lastSeen: Date;
        tenantId?: string;
      }) => {
        this.emitToListeners('user-status-change', data);
      });

      this.socket.on('online-users', (users: string[]) => {
        this.emitToListeners('online-users', users);
      });

      this.socket.on('message-reaction', (data: {
        messageId: string;
        reactions: Reaction[];
        userId: string;
        emoji: string;
        tenantId?: string;
      }) => {
        this.emitToListeners('message-reaction', data);
      });

      this.socket.on('message-read', (data: {
        messageId: string;
        readerId: string;
        readAt: Date;
        tenantId?: string;
      }) => {
        this.emitToListeners('message-read', data);
      });

      this.socket.on('all-messages-read', (data: { userId: string; senderId: string }) => {
        this.emitToListeners('all-messages-read', data);
      });

      this.socket.on('message-deleted', (data: {
        messageId: string;
        userId: string;
        deleteFor: string;
        tenantId?: string;
      }) => {
        this.emitToListeners('message-deleted', data);
      });

      this.socket.on('message-deleted-self', (data: { messageId: string; userId: string }) => {
        this.emitToListeners('message-deleted-self', data);
      });

      this.socket.on('message-edited', (data: {
        messageId: string;
        content: string;
        editedAt: Date;
        tenantId?: string;
      }) => {
        this.emitToListeners('message-edited', data);
      });

      this.socket.on('messages-forwarded', (data: {
        count: number;
        messageIds: string[];
      }) => {
        this.emitToListeners('messages-forwarded', data);
      });

      this.socket.on('message-error', (data: { error: string; tempId?: string }) => {
        console.error('❌ Message error:', data.error);
        this.emitToListeners('message-error', data);
      });

      this.socket.on('reaction-error', (data: { error: string }) => {
        console.error('❌ Reaction error:', data.error);
        this.emitToListeners('reaction-error', data);
      });

      this.socket.on('heartbeat-ack', (data: { timestamp: Date }) => {
        this.emitToListeners('heartbeat-ack', data);
      });

      // Handle timeout
      setTimeout(() => {
        if (!this.socket?.connected && this.isConnecting) {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  // Emit events
  emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }

  // Listen to events
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Remove listener
  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Emit to listeners (called from socket events)
  private emitToListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (error) {
          console.error(`Error in listener for ${event}:`, error);
        }
      });
    }
  }

  // ============= UPDATED SEND MESSAGE METHOD =============
  sendMessage(data: {
    senderId: string;
    recipientId: string;
    content: string;
    senderName?: string;
    replyToId?: string;
    tempId?: string;
    attachments?: any[];
    type?: string;
    tenantId?: string;
    conversationId?: string;
    metadata?: { loadId?: string; [key: string]: any };
    isFirstMessage?: boolean;
  }) {
    // Validate metadata for first messages
    if (data.isFirstMessage && !data.metadata?.loadId) {
      console.error('❌ loadId is required for first message', data);
      throw new Error('loadId is required to start a new chat');
    }

    // Ensure metadata is always an object
    const payload = {
      ...data,
      metadata: data.metadata || {},
    };

    console.log('📤 Sending message:', payload);
    this.emit('send-message', payload);
  }

  // ============= HELPER METHODS =============
  sendFirstMessage(data: {
    senderId: string;
    recipientId: string;
    content: string;
    loadId: string;
    senderName?: string;
    tempId?: string;
    attachments?: any[];
    type?: string;
    tenantId?: string;
  }) {
    return this.sendMessage({
      ...data,
      isFirstMessage: true,
      metadata: { loadId: data.loadId }
    });
  }

  sendReplyMessage(data: {
    senderId: string;
    recipientId: string;
    content: string;
    replyToId: string;
    loadId?: string;
    senderName?: string;
    tempId?: string;
    attachments?: any[];
    type?: string;
    tenantId?: string;
  }) {
    return this.sendMessage({
      ...data,
      isFirstMessage: false,
      metadata: data.loadId ? { loadId: data.loadId } : {}
    });
  }

  sendTyping(userId: string, recipientId: string, isTyping: boolean) {
    if (isTyping) {
      this.emit('user-typing', { userId, recipientId });
    } else {
      this.emit('user-stop-typing', { userId, recipientId });
    }
  }

  addReaction(data: {
    messageId: string;
    emoji: string;
    userId: string;
    username?: string;
  }) {
    this.emit('message-reaction', data);
  }

  markAsRead(messageId: string, readerId: string) {
    this.emit('message-read', { messageId, readerId });
  }

  markAllAsRead(userId: string, senderId: string) {
    this.emit('mark-all-read', { userId, senderId });
  }

  deleteMessage(messageId: string, userId: string, deleteFor: 'all' | 'self' = 'all') {
    this.emit('delete-message', { messageId, userId, deleteFor });
  }

  editMessage(messageId: string, content: string, userId: string) {
    this.emit('edit-message', { messageId, content, userId });
  }

  forwardMessage(data: {
    messageId: string;
    senderId: string;
    recipientIds: string[];
    content?: string;
    tenantId?: string;
  }) {
    this.emit('forward-message', data);
  }

  heartbeat(userId: string) {
    this.emit('heartbeat', userId);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const chatSocket = new ChatSocket();
export default chatSocket;
