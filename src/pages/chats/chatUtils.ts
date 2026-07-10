/**
 * Chat Utility Functions
 * Helpers for message processing, validation, and attachment handling
 */

import {
  Message,
  Attachment,
  ImageAttachment,
  VideoAttachment,
  AudioAttachment,
  FileAttachment,
  LocationAttachment,
  ContactAttachment,
  MessageType,
} from './types';

// Tabler Icons
import {
  IconFile,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileWord,
  IconFileSpreadsheet,
  IconFileZip,
  IconFileText,
  IconFileCode,
  IconFileTypeJs,
  IconTrash,
  IconCheck,
  IconChecks,
  IconClockHour4,
  IconMessageCircleCancel,
} from '@tabler/icons-react';
import React from 'react';

// ===== Attachment Type Guards =====

export const isImageAttachment = (att: Attachment): att is ImageAttachment => {
  return att.mimeType?.startsWith('image/') ?? false;
};

export const isVideoAttachment = (att: Attachment): att is VideoAttachment => {
  return att.mimeType?.startsWith('video/') ?? false;
};

export const isAudioAttachment = (att: Attachment): att is AudioAttachment => {
  return att.mimeType?.startsWith('audio/') ?? false;
};

export const isFileAttachment = (att: Attachment): att is FileAttachment => {
  return !isImageAttachment(att) && !isVideoAttachment(att) && !isAudioAttachment(att);
};

export const isLocationAttachment = (att: Attachment): att is LocationAttachment => {
  return 'latitude' in att && 'longitude' in att;
};

export const isContactAttachment = (att: Attachment): att is ContactAttachment => {
  return 'firstName' in att && 'vCardData' in att;
};

// ===== File Utilities =====

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// Updated to return React elements
export const getFileIcon = (mimeType?: string, filename?: string): React.ReactElement => {
  if (!mimeType && !filename) {
    return React.createElement(IconFile, { size: 20 });
  }

  const ext = filename ? getFileExtension(filename) : '';
  const type = mimeType?.split('/')[0];

  // By MIME type
  if (type === 'image') return React.createElement(IconPhoto, { size: 20 });
  if (type === 'video') return React.createElement(IconVideo, { size: 20 });
  if (type === 'audio') return React.createElement(IconMusic, { size: 20 });
  if (mimeType?.includes('pdf')) return React.createElement(IconFileWord, { size: 20 });
  if (mimeType?.includes('word') || ext === 'docx') return React.createElement(IconFileWord, { size: 20 });
  if (mimeType?.includes('sheet') || ext === 'xlsx') return React.createElement(IconFileSpreadsheet, { size: 20 });
  if (mimeType?.includes('zip') || ext === 'zip') return React.createElement(IconFileZip, { size: 20 });
  if (mimeType?.includes('text') || ext === 'txt') return React.createElement(IconFileText, { size: 20 });

  // By extension
  const extensions: Record<string, React.ReactElement> = {
    doc: React.createElement(IconFileWord, { size: 20 }),
    docx: React.createElement(IconFileWord, { size: 20 }),
    pdf: React.createElement(IconFileWord, { size: 20 }),
    xls: React.createElement(IconFileSpreadsheet, { size: 20 }),
    xlsx: React.createElement(IconFileSpreadsheet, { size: 20 }),
    csv: React.createElement(IconFileSpreadsheet, { size: 20 }),
    zip: React.createElement(IconFileZip, { size: 20 }),
    rar: React.createElement(IconFileZip, { size: 20 }),
    txt: React.createElement(IconFileText, { size: 20 }),
    json: React.createElement(IconFileCode, { size: 20 }),
    xml: React.createElement(IconFileCode, { size: 20 }),
    html: React.createElement(IconFileCode, { size: 20 }),
    css: React.createElement(IconFileCode, { size: 20 }),
    js: React.createElement(IconFileTypeJs, { size: 20 }),
    py: React.createElement(IconFileCode, { size: 20 }),
  };

  return extensions[ext] || React.createElement(IconFile, { size: 20 });
};

export const isValidFileSize = (bytes: number, maxMB: number = 100): boolean => {
  return bytes <= maxMB * 1024 * 1024;
};

export const isValidMimeType = (
  mimeType: string,
  allowedTypes: string[] = []
): boolean => {
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some((type) => {
    if (type.endsWith('*')) {
      // Handle wildcard like 'image/*'
      return mimeType.startsWith(type.replace('*', ''));
    }
    return mimeType === type;
  });
};

// ===== Message Validation =====

export const isValidMessage = (message: Partial<Message>): string[] => {
  const errors: string[] = [];

  if (!message.content?.trim()) {
    errors.push('Message content cannot be empty');
  }

  if (message.content && message.content.length > 5000) {
    errors.push('Message content exceeds 5000 characters');
  }

  if (!message.type || !isValidMessageType(message.type)) {
    errors.push('Invalid message type');
  }

  if (message.attachments && message.attachments.length > 10) {
    errors.push('Maximum 10 attachments allowed');
  }

  return errors;
};

export const isValidMessageType = (type: any): type is MessageType => {
  const validTypes: MessageType[] = ['text', 'image', 'video', 'audio', 'file', 'location', 'contact'];
  return validTypes.includes(type);
};

// ===== Message Formatting =====

export const formatMessageContent = (content: string, type: MessageType): string => {
  if (type !== 'text') return content;

  // Escape HTML
  let formatted = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Preserve line breaks
  formatted = formatted.replace(/\n/g, '<br />');

  // Basic URL detection and linking
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" class="text-primary underline">$1</a>');

  return formatted;
};

// Updated to return text and icon separately
export const getMessagePreview = (
  message: Message,
  maxLength: number = 100
): { text: string; icon?: React.ReactElement } => {
  let preview = message.content;
  let icon: React.ReactElement | undefined;

  if (message.attachments.length > 0) {
    const att = message.attachments[0];
    if (isImageAttachment(att)) {
      preview = att.name || 'Image';
      icon = React.createElement(IconPhoto, { size: 16 });
    } else if (isVideoAttachment(att)) {
      preview = att.name || 'Video';
      icon = React.createElement(IconVideo, { size: 16 });
    } else if (isAudioAttachment(att)) {
      preview = att.name || 'Audio';
      icon = React.createElement(IconMusic, { size: 16 });
    } else if (isFileAttachment(att)) {
      preview = att.name || 'File';
      icon = React.createElement(IconFile, { size: 16 });
    } 

    if (message.attachments.length > 1) {
      preview += ` +${message.attachments.length - 1} more`;
    }
  }

  if (message.isDeleted) {
    return {
      text: 'This message was deleted',
      icon: React.createElement(IconTrash, { size: 16 })
    };
  }

  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength) + '...';
  }

  return { text: preview, icon };
};

// ===== Message Status & Grouping =====

export const formatMessageTime = (date: Date | string, format: 'time' | 'datetime' | 'relative' = 'time'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'time') {
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (format === 'datetime') {
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Relative time (e.g., "2 hours ago")
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Updated to return React elements
export const getMessageStatusIcon = (status?: string): React.ReactElement | null => {
  switch (status) {
    case 'sent':
      return React.createElement(IconCheck, { size: 14 });
    case 'delivered':
      return React.createElement(IconChecks, { size: 14 });
    case 'read':
      return React.createElement(IconChecks, { size: 14, className: 'text-blue-500' });
    case 'failed':
      return React.createElement(IconMessageCircleCancel, { size: 14, className: 'text-red-500' });
    case 'sending':
      return React.createElement(IconClockHour4, { size: 14, className: 'animate-pulse' });
    default:
      return null;
  }
};

export const groupMessagesByDate = (
  messages: Message[]
): Record<string, Message[]> => {
  const grouped: Record<string, Message[]> = {};

  messages.forEach((msg) => {
    const date = new Date(msg.timestamp);
    const key = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(msg);
  });

  return grouped;
};

export const isToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getFullYear() === today.getFullYear() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getDate() === today.getDate()
  );
};

// ===== URL/Media Utilities =====

export const getMediaDimensions = (
  mimeType?: string
): { width: number; height: number } | null => {
  if (!mimeType?.startsWith('image/')) return null;

  // Default responsive dimensions
  return { width: 400, height: 300 };
};

export const generateThumbnail = async (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200
): Promise<string | null> => {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(null);
        }
      };
      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

// ===== Search & Filter =====

export const searchMessages = (
  messages: Message[],
  query: string,
  searchIn: ('content' | 'sender' | 'all')[] = ['all']
): Message[] => {
  if (!query.trim()) return messages;

  const lowerQuery = query.toLowerCase();

  return messages.filter((msg) => {
    if (searchIn.includes('all') || searchIn.includes('content')) {
      if (msg.content.toLowerCase().includes(lowerQuery)) return true;
    }

    if (searchIn.includes('all') || searchIn.includes('sender')) {
      if (msg.senderName.toLowerCase().includes(lowerQuery)) return true;
    }

    return false;
  });
};

export const filterMessagesByType = (
  messages: Message[],
  types: MessageType[]
): Message[] => {
  return messages.filter((msg) => types.includes(msg.type));
};

// ===== Security & Sanitization =====

export const sanitizeHTML = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  };
};

// ===== Duplicate Detection =====

export const isDuplicateMessage = (
  newMessage: Message,
  recentMessages: Message[],
  timeWindowMs: number = 5000
): boolean => {
  const timeThreshold = Date.now() - timeWindowMs;

  return recentMessages.some(
    (msg) =>
      msg.senderId === newMessage.senderId &&
      msg.content === newMessage.content &&
      new Date(msg.timestamp).getTime() > timeThreshold
  );
};