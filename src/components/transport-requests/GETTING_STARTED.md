# PhotoGallery Component - Getting Started Guide

## Quick Start

### 1. Import the Component

```tsx
import { PhotoGallery, MovementEvidencePhoto } from '@/components/transport-requests'
```

### 2. Prepare Your Data

```tsx
const photos: MovementEvidencePhoto[] = [
  {
    id: 'photo-1',
    url: 'https://example.com/photo1.jpg',
    uploadedAt: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 'photo-2',
    url: 'https://example.com/photo2.jpg',
    uploadedAt: '2024-01-15T10:35:00Z' // String format also works
  }
]
```

### 3. Handle Photo Removal

```tsx
const handleRemovePhoto = (photoId: string) => {
  // Remove the photo from your state/database
  console.log(`Photo ${photoId} was removed`)
}
```

### 4. Render the Component

```tsx
<PhotoGallery
  photos={photos}
  onRemove={handleRemovePhoto}
  photosPerPage={8}
/>
```

## Complete Example

```tsx
import { useState } from 'react'
import { PhotoGallery, MovementEvidencePhoto } from '@/components/transport-requests'

export function MyPage() {
  const [photos, setPhotos] = useState<MovementEvidencePhoto[]>([
    {
      id: '1',
      url: 'https://example.com/photo1.jpg',
      uploadedAt: new Date()
    }
  ])

  const handleRemove = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }

  return (
    <div className="p-6">
      <PhotoGallery
        photos={photos}
        onRemove={handleRemove}
      />
    </div>
  )
}
```

## API Reference

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| photos | `MovementEvidencePhoto[]` | Yes | - | Array of photos to display |
| onRemove | `(photoId: string) => void` | Yes | - | Callback when user removes a photo |
| photosPerPage | `number` | No | 8 | Number of photos per page |

### MovementEvidencePhoto Type

```typescript
interface MovementEvidencePhoto {
  id: string              // Unique identifier
  url: string             // Image URL
  uploadedAt: Date | string  // Upload timestamp (Date object or ISO string)
}
```

## Features

### ✅ Pagination
- Displays 8 photos per page by default
- Configurable via `photosPerPage` prop
- Previous/Next buttons with intelligent disabled states
- Page indicator showing current and total pages

### ✅ Responsive Grid
- 2 columns on mobile devices (< 640px)
- 3 columns on tablets (640px - 1024px)
- 4 columns on desktop (> 1024px)
- Maintains square aspect ratio for photos

### ✅ Photo Details
- Upload date/time displayed on each photo
- Always visible at the bottom of each photo
- Formatted in locale-appropriate format

### ✅ Photo Management
- Remove button appears on hover
- Styled with red background
- Calls `onRemove` callback with photo ID
- Smooth transitions

### ✅ Edge Cases
- Empty gallery shows placeholder message
- Single page: No pagination controls
- Last page: Shows correct number of photos

## Styling & Customization

### Using Tailwind CSS

The component uses Tailwind classes for styling. You can wrap it with custom styling:

```tsx
<div className="custom-gallery-container">
  <PhotoGallery photos={photos} onRemove={handleRemove} />
</div>
```

### Component Structure

```tsx
<div className="w-full space-y-6">                    {/* Container */}
  <div className="flex items-center justify-between"> {/* Header */}
    <div className="flex items-center gap-2">
      <h3>Photos</h3>
      <Badge>{count} photos</Badge>
    </div>
    <span>Page X of Y</span>
  </div>

  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"> {/* Grid */}
    {/* Photo cards */}
  </div>

  <div className="flex items-center justify-center gap-4"> {/* Pagination */}
    {/* Navigation buttons */}
  </div>
</div>
```

## Common Use Cases

### 1. Transport Request Evidence Photos

```tsx
function TransportRequestDetail({ requestId }) {
  const [evidencePhotos, setEvidencePhotos] = useState<MovementEvidencePhoto[]>([])

  const removeEvidence = (photoId: string) => {
    // Call API to remove photo
    apiService.removeEvidencePhoto(requestId, photoId)
    setEvidencePhotos(prev => prev.filter(p => p.id !== photoId))
  }

  return (
    <div>
      <h2>Movement Evidence</h2>
      <PhotoGallery photos={evidencePhotos} onRemove={removeEvidence} />
    </div>
  )
}
```

### 2. Upload and Display

```tsx
function PhotoUploadForm() {
  const [photos, setPhotos] = useState<MovementEvidencePhoto[]>([])

  const handleFileUpload = async (files: FileList) => {
    for (const file of files) {
      const url = await uploadToServer(file)
      const newPhoto: MovementEvidencePhoto = {
        id: Date.now().toString(),
        url,
        uploadedAt: new Date()
      }
      setPhotos(prev => [...prev, newPhoto])
    }
  }

  return (
    <div>
      <input type="file" multiple onChange={e => handleFileUpload(e.target.files!)} />
      <PhotoGallery photos={photos} onRemove={photoId => console.log(photoId)} />
    </div>
  )
}
```

### 3. Inspection Report with Photos

```tsx
function InspectionReport({ inspectionId }) {
  const [inspection, setInspection] = useState(null)

  useEffect(() => {
    // Fetch inspection with photos
    inspectionService.getInspection(inspectionId).then(setInspection)
  }, [inspectionId])

  const handlePhotoRemove = async (photoId: string) => {
    await inspectionService.removePhoto(inspectionId, photoId)
    setInspection(prev => ({
      ...prev,
      photos: prev.photos.filter(p => p.id !== photoId)
    }))
  }

  return (
    <div className="space-y-4">
      <h1>{inspection?.name}</h1>
      <PhotoGallery
        photos={inspection?.photos || []}
        onRemove={handlePhotoRemove}
        photosPerPage={12}
      />
    </div>
  )
}
```

## Performance Tips

### Large Photo Sets

For galleries with 100+ photos:

1. Use larger `photosPerPage` values (12+)
2. Implement lazy loading for images
3. Use optimized image URLs (thumbnails)

```tsx
<PhotoGallery
  photos={largePhotoSet}
  onRemove={handleRemove}
  photosPerPage={12}  // Show 12 per page instead of 8
/>
```

### Virtual Scrolling

For very large galleries (1000+), consider virtual scrolling:

```tsx
// Use a virtual scroll library with PhotoGallery
import { FixedSizeList } from 'react-window'

// Wrap pagination logic with virtual scrolling
```

## Browser Support

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Mobile browsers (iOS Safari, Chrome Mobile): Latest versions

## Troubleshooting

### Photos not displaying

✅ Check image URLs are accessible
✅ Verify CORS headers if loading from external domains
✅ Check browser console for image load errors

### Pagination issues

✅ Ensure photos array is not empty
✅ Check photosPerPage value is positive number
✅ Verify currentPage state updates correctly

### Remove button not working

✅ Check onRemove callback is passed
✅ Verify photo IDs are unique
✅ Check console for callback errors

### Responsive issues

✅ Verify Tailwind CSS is configured
✅ Check viewport meta tag exists
✅ Test on actual devices/media queries

## Testing

See `PhotoGallery.test.tsx` for comprehensive test examples.

To run tests after installing testing libraries:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm run test:run
```

## Files Reference

| File | Purpose |
|------|---------|
| `PhotoGallery.tsx` | Main component implementation |
| `PhotoGallery.test.tsx` | Comprehensive test suite |
| `PhotoGallery.example.tsx` | Usage examples and demo |
| `index.ts` | Module exports |
| `README.md` | Full documentation |
| `IMPLEMENTATION_SUMMARY.md` | Implementation details |
| `GETTING_STARTED.md` | This file |

## Support

For issues or questions:

1. Check the README.md for detailed documentation
2. Review IMPLEMENTATION_SUMMARY.md for technical details
3. See PhotoGallery.example.tsx for usage patterns
4. Check PhotoGallery.test.tsx for test examples
