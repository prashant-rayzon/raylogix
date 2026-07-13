/**
 * Message Type Components
 * Separate components for rendering each message type
 */

import React from 'react';
import {
  ImageAttachment,
  VideoAttachment,
  AudioAttachment,
  FileAttachment,
  LocationAttachment,
  ContactAttachment,
} from './types';
import { formatFileSize, getFileIcon } from './chatUtils';
import { API_ORIGIN } from '@/api/origin';

const getFileUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
};

// ===== Image Message =====
interface ImageMessageProps {
  attachment: ImageAttachment;
  onPhotoClick: (photo: { url: string; name: string }) => void;
  isClickable?: boolean;
}

export const ImageMessage: React.FC<ImageMessageProps> = ({
  attachment,
  onPhotoClick,
  isClickable = true,
}) => {
  return (
    <div
      className="relative group rounded-lg overflow-hidden  cursor-pointer max-w-sm"
      onClick={() => isClickable && onPhotoClick({ url: attachment.url, name: attachment.name })}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => isClickable && e.key === 'Enter' && onPhotoClick({ url: attachment.url, name: attachment.name })}
    >
      <img
        src={getFileUrl(attachment.url)}
        alt={attachment.name}
        className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
      {attachment.width && attachment.height && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          {attachment.width} × {attachment.height}
        </div>
      )}
    </div>
  );
};

// ===== Video Message =====
interface VideoMessageProps {
  attachment: VideoAttachment;
  onPhotoClick: (photo: { url: string; name: string }) => void;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({
  attachment,
  onPhotoClick,
}) => {
  return (
    <div
      className="relative group rounded-lg overflow-hidden  cursor-pointer max-w-sm"
      onClick={() => onPhotoClick({ url: attachment.url, name: attachment.name })}
      role="button"
      tabIndex={0}
    >
      {attachment.thumbnail ? (
        <img
          src={attachment.thumbnail}
          alt={attachment.name}
          className="w-full h-40 object-cover hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
          <svg className="w-12 h-12 text-white opacity-50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 5a3 3 0 013-3h6a3 3 0 013 3v12a3 3 0 01-3 3H9a3 3 0 01-3-3V5z" />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      {attachment.duration && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {formatDuration(attachment.duration)}
        </div>
      )}
    </div>
  );
};

// ===== Audio Message =====
interface AudioMessageProps {
  attachment: AudioAttachment;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({ attachment }) => {
  return (
    <div className="w-full max-w-sm rounded-xl border bg-background/70 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5a6.5 6.5 0 006.5-6.5V7a6.5 6.5 0 00-13 0v5a6.5 6.5 0 006.5 6.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 18.5V21" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {(attachment as any).isVoiceMessage ? 'Voice message' : attachment.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {attachment.duration && <span>{formatDuration(attachment.duration)}</span>}
            {attachment.size && (
              <>
                <span>•</span>
                <span>{formatFileSize(attachment.size)}</span>
              </>
            )}
          </div>
        </div>

        <a
          href={getFileUrl(attachment.url)}
          download={attachment.name}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Download"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>

      <audio src={getFileUrl(attachment.url)} controls preload="metadata" className="h-9 w-full" />
    </div>
  );
};

// ===== File Message =====
interface FileMessageProps {
  attachment: FileAttachment;
}

export const FileMessage: React.FC<FileMessageProps> = ({ attachment }) => {
  const icon = getFileIcon(attachment.mimeType, attachment.name);

  return (
    <a
      href={getFileUrl(attachment.url)}
      download={attachment.name}
      className="flex items-center gap-3  rounded-lg p-3  transition-colors max-w-sm group"
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {attachment.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {attachment.size && <span>{formatFileSize(attachment.size)}</span>}
          {attachment.extension && (
            <>
              <span>•</span>
              <span>.{attachment.extension.toUpperCase()}</span>
            </>
          )}
        </div>
      </div>

      <svg
        className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    </a>
  );
};

// ===== Location Message =====
interface LocationMessageProps {
  attachment: LocationAttachment;
}

export const LocationMessage: React.FC<LocationMessageProps> = ({ attachment }) => {
  const mapUrl = `https://maps.google.com/maps?q=${attachment.latitude},${attachment.longitude}&z=${attachment.zoomLevel || 15}`;

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2  rounded-lg overflow-hidden hover:opacity-90 transition-opacity max-w-sm"
    >
      <img
        src={`https://maps.googleapis.com/maps/api/staticmap?center=${attachment.latitude},${attachment.longitude}&zoom=${attachment.zoomLevel || 15}&size=400x300&key=YOUR_GOOGLE_MAPS_KEY`}
        alt="Location map"
        className="w-full h-48 object-cover"
        loading="lazy"
      />
      <div className="p-3">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <div className="flex-1">
            {attachment.placeName && (
              <p className="text-sm font-medium">{attachment.placeName}</p>
            )}
            {attachment.address && (
              <p className="text-xs text-muted-foreground">{attachment.address}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {attachment.latitude.toFixed(4)}, {attachment.longitude.toFixed(4)}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
};

// ===== Contact Message =====
interface ContactMessageProps {
  attachment: ContactAttachment;
}

export const ContactMessage: React.FC<ContactMessageProps> = ({ attachment }) => {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3 max-w-sm">
      {attachment.profilePhoto ? (
        <img
          src={attachment.profilePhoto}
          alt={attachment.firstName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-semibold">
          {attachment.firstName[0]}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {attachment.firstName} {attachment.lastName || ''}
        </p>
        {attachment.phone && (
          <a
            href={`tel:${attachment.phone}`}
            className="text-xs text-primary hover:underline block truncate"
          >
            {attachment.phone}
          </a>
        )}
        {attachment.email && (
          <a
            href={`mailto:${attachment.email}`}
            className="text-xs text-primary hover:underline block truncate"
          >
            {attachment.email}
          </a>
        )}
        {attachment.organization && (
          <p className="text-xs text-muted-foreground truncate">
            {attachment.organization}
          </p>
        )}
      </div>

      {attachment.vCardData && (
        <a
          href={`data:text/vcard;charset=utf-8,${encodeURIComponent(attachment.vCardData)}`}
          download={`${attachment.firstName}_${attachment.lastName || 'contact'}.vcf`}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Download contact"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      )}
    </div>
  );
};

// ===== Helper Functions =====

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// ===== Attachment Renderer (Router Component) =====
interface AttachmentRendererProps {
  attachment: any; // Attachment type
  onPhotoClick?: (photo: { url: string; name: string }) => void;
}

export const AttachmentRenderer: React.FC<AttachmentRendererProps> = ({
  attachment,
  onPhotoClick = () => { },
}) => {
  // Image
  if (attachment.mimeType?.startsWith('image/')) {
    return <ImageMessage attachment={attachment} onPhotoClick={onPhotoClick} />;
  }

  // Video
  if (attachment.mimeType?.startsWith('video/')) {
    return <VideoMessage attachment={attachment} onPhotoClick={onPhotoClick} />;
  }

  // Audio
  if (attachment.mimeType?.startsWith('audio/')) {
    return <AudioMessage attachment={attachment} />;
  }

  // Location
  if ('latitude' in attachment && 'longitude' in attachment) {
    return <LocationMessage attachment={attachment} />;
  }

  // Contact
  if ('firstName' in attachment && 'vCardData' in attachment) {
    return <ContactMessage attachment={attachment} />;
  }

  // File (default)
  return <FileMessage attachment={attachment} />;
};
