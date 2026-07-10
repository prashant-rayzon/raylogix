import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/custom/button'
import { Badge } from '@/components/ui/badge'

export interface MovementEvidencePhoto {
  id: string
  url: string
  uploadedAt: Date | string
}

export interface PhotoGalleryProps {
  photos: MovementEvidencePhoto[]
  onRemove: (photoId: string) => void
  photosPerPage?: number
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onRemove,
  photosPerPage = 8,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);

  // Calculate pagination
  const totalPages = Math.ceil(photos.length / photosPerPage);
  const paginatedPhotos = useMemo(() => {
    const startIndex = (currentPage - 1) * photosPerPage;
    const endIndex = startIndex + photosPerPage;
    return photos.slice(startIndex, endIndex);
  }, [photos, currentPage, photosPerPage]);

  // Handle navigation
  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Format date/time
  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Handle edge case: no photos
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Photos</h3>
          <Badge variant="secondary">{photos.length} photos</Badge>
        </div>

        {/* Page indicator */}
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Photo Grid - Responsive */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-max">
        {paginatedPhotos.map((photo) => (
          <div
            key={photo.id}
            className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square"
            onMouseEnter={() => setHoveredPhotoId(photo.id)}
            onMouseLeave={() => setHoveredPhotoId(null)}
          >
            {/* Image */}
            <img
              src={photo.url}
              alt="Photo"
              className="w-full h-full object-cover"
            />

            {/* Date/Time Badge - Always visible */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-1 truncate">
              {formatDateTime(photo.uploadedAt)}
            </div>

            {/* Remove button - Visible on hover */}
            {hoveredPhotoId === photo.id && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
                <button
                  onClick={() => onRemove(photo.id)}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ChevronLeft size={16} />
            Previous
          </Button>

          <span className="text-sm font-medium text-gray-600 px-4">
            {currentPage} / {totalPages}
          </span>

          <Button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            Next
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};
