export const CHAT_CONSTANTS = {
  // Scroll behavior
  SCROLL_THRESHOLD: 100,
  SCROLL_TO_MESSAGE_BEHAVIOR: 'smooth' as const,
  SCROLL_BLOCK: 'center' as const,

  // Timeouts
  TYPING_TIMEOUT: 1000,
  UNDO_TIMEOUT: 5000,
  MESSAGE_DATE_FORMAT: 'D MMM, YYYY',
  TOAST_DURATION: 2000,
  HIGHLIGHT_DURATION: 3000,

  // File upload
  UPLOAD_SIZE_LIMIT: 100 * 1024 * 1024, // 100MB
  UPLOAD_ACCEPTED_TYPES:
    'image/*,video/*,audio/*,.pdf,.txt,.zip',

  // UI
  EMOJI_GRID_COLS: 5,
  EMOJI_PICKER_WIDTH: 288,
  MESSAGE_MAX_WIDTH_PERCENT: 75,
} as const;

export const API_BASE =
  import.meta.env.VITE_API_BASE || '/api';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

export function getUploadSizeLimit(): string {
  return `${CHAT_CONSTANTS.UPLOAD_SIZE_LIMIT / 1024 / 1024}MB`;
}