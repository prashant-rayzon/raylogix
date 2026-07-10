# Transport Requests Components

## PhotoGallery Component

A responsive photo gallery component with pagination, featuring 8 photos per page and a 4-column responsive grid layout.

### Features

- **Pagination**: Display 8 photos per page (configurable)
- **Responsive Grid**:
  - 2 columns on mobile (< 640px)
  - 3 columns on tablet (640px - 1024px)
  - 4 columns on desktop (> 1024px)
- **Photo Management**:
  - Display photo upload date/time on each photo
  - Remove button visible on hover
  - Photo count badge
- **Navigation**:
  - Previous/Next buttons with proper disabled states
  - Page indicator (Page X of Y)
- **Edge Cases**:
  - Handles empty gallery (0 photos)
  - Handles single page (1 page only)
  - Handles last page with fewer photos

### Usage

```tsx
import { PhotoGallery, MovementEvidencePhoto } from '@/components/transport-requests'

// Define your photos
const photos: MovementEvidencePhoto[] = [
  {
    id: 'photo-1',
    url: 'https://example.com/photo1.jpg',
    uploadedAt: new Date('2024-01-15T10:30:00Z')
  },
  {
    id: 'photo-2',
    url: 'https://example.com/photo2.jpg',
    uploadedAt: '2024-01-15T10:35:00Z' // Also accepts string
  }
]

// Handle photo removal
const handleRemovePhoto = (photoId: string) => {
  console.log(`Removing photo: ${photoId}`)
  // Remove photo from your state
}

// Render the component
<PhotoGallery
  photos={photos}
  onRemove={handleRemovePhoto}
  photosPerPage={8} // Optional, defaults to 8
/>
```

### Props

#### `PhotoGalleryProps`

- **photos** (`MovementEvidencePhoto[]`, required): Array of photos to display
- **onRemove** (`(photoId: string) => void`, required): Callback when user removes a photo
- **photosPerPage** (`number`, optional): Number of photos per page. Default: 8

#### `MovementEvidencePhoto`

- **id** (`string`): Unique photo identifier
- **url** (`string`): Photo image URL
- **uploadedAt** (`Date | string`): Upload timestamp

### Component Behavior

#### Pagination Logic

```
totalPages = Math.ceil(photos.length / photosPerPage)
startIndex = (currentPage - 1) * photosPerPage
endIndex = startIndex + photosPerPage
displayedPhotos = photos.slice(startIndex, endIndex)
```

#### Date/Time Format

Photos display upload date/time in the format: `Mon D, YYYY, HH:MM:SS` (e.g., "Jan 15, 2024, 02:30:45 PM")

#### Remove Button

- Appears on hover over a photo
- Triggers the `onRemove` callback with the photo ID
- Styled with red background that darkens on hover

### Styling

The component uses:
- **Tailwind CSS** for styling
- **Lucide React** icons (ChevronLeft, ChevronRight, Trash2)
- **shadcn/ui** Badge and Button components

### Responsive Breakpoints

- **Mobile** (< 640px): `grid-cols-2` - 2 photos per row
- **Tablet** (640px - 1024px): `sm:grid-cols-3` - 3 photos per row
- **Desktop** (> 1024px): `lg:grid-cols-4` - 4 photos per row

### Accessibility

- Photo images have alt text
- Remove button has aria-label and title attribute
- Proper button disabled states
- Keyboard navigation support via native button elements

### Testing

The component includes comprehensive unit tests. To run them, first install the required dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Then update your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest --run"
  }
}
```

Run tests:

```bash
npm run test:run
```

### Test Coverage

The test suite covers:
- **Empty State**: Display when no photos provided
- **Photo Display**: Correct number and rendering of photos
- **Date/Time Badge**: Formatting and display
- **Photo Count Badge**: Display and updates
- **Pagination Controls**: Navigation, disabled states, page indicator
- **Remove Button**: Show/hide on hover, callback execution
- **Edge Cases**: Single photo, single page, fewer photos on last page
- **Accessibility**: Alt text, aria-labels, titles
- **Responsive Layout**: Grid responsive classes
- **Default Props**: Default photosPerPage value

### Example Implementation

```tsx
import { useState, useCallback } from 'react'
import { PhotoGallery, MovementEvidencePhoto } from '@/components/transport-requests'

export function TransportRequestDetails() {
  const [photos, setPhotos] = useState<MovementEvidencePhoto[]>([
    {
      id: '1',
      url: '/images/photo1.jpg',
      uploadedAt: new Date()
    },
    {
      id: '2',
      url: '/images/photo2.jpg',
      uploadedAt: new Date()
    }
  ])

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [])

  return (
    <div className="p-6">
      <PhotoGallery
        photos={photos}
        onRemove={handleRemovePhoto}
        photosPerPage={8}
      />
    </div>
  )
}
```

### Browser Support

The component uses modern CSS Grid and flexbox features. It supports:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
