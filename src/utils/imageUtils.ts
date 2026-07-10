/**
 * Image utility functions for chat
 */

/**
 * Get trimmed image URL with cloudinary-like parameters
 * Supports various image transformations
 */
export function getTrimmedImageUrl(
  originalUrl: string,
  options?: {
    width?: number;
    height?: number;
    quality?: 'low' | 'medium' | 'high';
    fit?: 'cover' | 'contain' | 'fill';
  }
): string {
  if (!originalUrl) return originalUrl;

  const { width = 300, height = 300, quality = 'medium', fit = 'cover' } = options || {};

  // Check if URL is already from our server
  if (originalUrl.includes('/uploads/')) {
    // Add query parameters for image transformation
    const separator = originalUrl.includes('?') ? '&' : '?';
    const qualityMap = { low: 70, medium: 80, high: 95 };
    return `${originalUrl}${separator}w=${width}&h=${height}&q=${qualityMap[quality]}&fit=${fit}`;
  }

  return originalUrl;
}

/**
 * Get thumbnail URL for preview
 */
export function getThumbnailUrl(imageUrl: string): string {
  return getTrimmedImageUrl(imageUrl, {
    width: 150,
    height: 150,
    quality: 'medium',
    fit: 'cover',
  });
}

/**
 * Get medium preview URL
 */
export function getMediumImageUrl(imageUrl: string): string {
  return getTrimmedImageUrl(imageUrl, {
    width: 300,
    height: 300,
    quality: 'high',
    fit: 'cover',
  });
}

/**
 * Get full size image URL
 */
export function getFullImageUrl(imageUrl: string): string {
  return getTrimmedImageUrl(imageUrl, {
    width: 800,
    height: 800,
    quality: 'high',
    fit: 'contain',
  });
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType?: string, fileName?: string): boolean {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (mimeType && imageTypes.includes(mimeType)) {
    return true;
  }

  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  }

  return false;
}

/**
 * Check if file is a document
 */
export function isDocumentFile(mimeType?: string, fileName?: string): boolean {
  const documentTypes = ['application/pdf', 'text/plain', 'application/zip'];
  const documentExtensions = ['.pdf', '.txt', '.zip'];

  if (mimeType && documentTypes.includes(mimeType)) {
    return true;
  }

  if (fileName) {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return documentExtensions.includes(ext);
  }

  return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Create a canvas with trimmed image for preview
 */
export function createTrimmedImagePreview(
  imageUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate aspect ratio fit
      const sourceAspect = img.width / img.height;
      const targetAspect = width / height;

      let sourceWidth = img.width;
      let sourceHeight = img.height;
      let sourceX = 0;
      let sourceY = 0;

      if (sourceAspect > targetAspect) {
        // Source is wider, crop width
        sourceWidth = img.height * targetAspect;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Source is taller, crop height
        sourceHeight = img.width / targetAspect;
        sourceY = (img.height - sourceHeight) / 2;
      }

      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
