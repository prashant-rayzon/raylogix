/**
 * PhotoGallery Component Usage Examples
 *
 * This file demonstrates various ways to use the PhotoGallery component
 * in your application.
 */

import React, { useState, useCallback } from 'react'
import { PhotoGallery, MovementEvidencePhoto } from './PhotoGallery'

/**
 * Example 1: Basic Usage with Static Data
 */
export function BasicPhotoGalleryExample() {
  const staticPhotos: MovementEvidencePhoto[] = [
    {
      id: 'photo-1',
      url: 'https://via.placeholder.com/400?text=Photo+1',
      uploadedAt: new Date('2024-01-15T10:30:00Z'),
    },
    {
      id: 'photo-2',
      url: 'https://via.placeholder.com/400?text=Photo+2',
      uploadedAt: new Date('2024-01-15T11:00:00Z'),
    },
    {
      id: 'photo-3',
      url: 'https://via.placeholder.com/400?text=Photo+3',
      uploadedAt: '2024-01-15T11:30:00Z', // String format also works
    },
  ]

  const handleRemove = (photoId: string) => {
    console.log(`Would remove photo: ${photoId}`)
  }

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="mb-4 text-2xl font-bold">Basic Gallery Example</h2>
      <PhotoGallery photos={staticPhotos} onRemove={handleRemove} />
    </div>
  )
}

/**
 * Example 2: Gallery with State Management
 */
export function StatefulPhotoGalleryExample() {
  const [photos, setPhotos] = useState<MovementEvidencePhoto[]>([
    {
      id: 'photo-1',
      url: 'https://via.placeholder.com/400?text=Photo+1',
      uploadedAt: new Date(),
    },
    {
      id: 'photo-2',
      url: 'https://via.placeholder.com/400?text=Photo+2',
      uploadedAt: new Date(),
    },
    {
      id: 'photo-3',
      url: 'https://via.placeholder.com/400?text=Photo+3',
      uploadedAt: new Date(),
    },
  ])

  const handleRemovePhoto = useCallback((photoId: string) => {
    setPhotos((prevPhotos) => prevPhotos.filter((photo) => photo.id !== photoId))
    console.log(`Removed photo: ${photoId}`)
  }, [])

  const handleAddPhotos = useCallback(() => {
    const newPhoto: MovementEvidencePhoto = {
      id: `photo-${photos.length + 1}`,
      url: `https://via.placeholder.com/400?text=Photo+${photos.length + 1}`,
      uploadedAt: new Date(),
    }
    setPhotos((prevPhotos) => [...prevPhotos, newPhoto])
  }, [photos.length])

  return (
    <div className="p-6 bg-white rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stateful Gallery Example</h2>
        <button
          onClick={handleAddPhotos}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Photo
        </button>
      </div>
      <PhotoGallery photos={photos} onRemove={handleRemovePhoto} photosPerPage={8} />
      <p className="text-sm text-gray-600">Total photos: {photos.length}</p>
    </div>
  )
}

/**
 * Example 3: Custom Photos Per Page
 */
export function CustomPhotosPerPageExample() {
  const manyPhotos: MovementEvidencePhoto[] = Array.from({ length: 50 }, (_, i) => ({
    id: `photo-${i + 1}`,
    url: `https://via.placeholder.com/400?text=Photo+${i + 1}`,
    uploadedAt: new Date(Date.now() - i * 60000), // Each 1 minute apart
  }))

  const handleRemove = (photoId: string) => {
    console.log(`Removed: ${photoId}`)
  }

  return (
    <div className="p-6 bg-white rounded-lg space-y-4">
      <h2 className="text-2xl font-bold">Custom Photos Per Page (12 per page)</h2>
      <PhotoGallery photos={manyPhotos} onRemove={handleRemove} photosPerPage={12} />
    </div>
  )
}

/**
 * Example 4: Empty Gallery State
 */
export function EmptyGalleryExample() {
  const emptyPhotos: MovementEvidencePhoto[] = []

  const handleRemove = (photoId: string) => {
    console.log(`Removed: ${photoId}`)
  }

  return (
    <div className="p-6 bg-white rounded-lg space-y-4">
      <h2 className="text-2xl font-bold">Empty Gallery Example</h2>
      <PhotoGallery photos={emptyPhotos} onRemove={handleRemove} />
      <p className="text-sm text-gray-600">No photos have been uploaded yet.</p>
    </div>
  )
}

/**
 * Example 5: Integration with Transport Request Detail Page
 */
export function TransportRequestDetailExample() {
  const [transportRequest, setTransportRequest] = useState({
    id: 'tr-001',
    description: 'Sample Transport Request',
    photos: [
      {
        id: 'photo-1',
        url: 'https://via.placeholder.com/400?text=Vehicle+Front',
        uploadedAt: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'photo-2',
        url: 'https://via.placeholder.com/400?text=Vehicle+Side',
        uploadedAt: new Date('2024-01-15T10:05:00Z'),
      },
      {
        id: 'photo-3',
        url: 'https://via.placeholder.com/400?text=Vehicle+Back',
        uploadedAt: new Date('2024-01-15T10:10:00Z'),
      },
      {
        id: 'photo-4',
        url: 'https://via.placeholder.com/400?text=Cargo+Area',
        uploadedAt: new Date('2024-01-15T10:15:00Z'),
      },
    ] as MovementEvidencePhoto[],
  })

  const handleRemovePhoto = useCallback((photoId: string) => {
    setTransportRequest((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== photoId),
    }))
  }, [])

  return (
    <div className="p-6 bg-white rounded-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{transportRequest.description}</h1>
        <p className="text-gray-600">Request ID: {transportRequest.id}</p>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Movement Evidence Photos</h2>
        <PhotoGallery
          photos={transportRequest.photos}
          onRemove={handleRemovePhoto}
          photosPerPage={8}
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold">Details</h3>
        <p className="text-sm text-gray-600">
          Photos: {transportRequest.photos.length}
        </p>
      </div>
    </div>
  )
}

/**
 * Example 6: Large Gallery with Pagination
 */
export function LargeGalleryExample() {
  const largePhotoSet: MovementEvidencePhoto[] = Array.from({ length: 100 }, (_, i) => ({
    id: `large-photo-${i + 1}`,
    url: `https://via.placeholder.com/400?text=Photo+${i + 1}`,
    uploadedAt: new Date(Date.now() - i * 3600000), // Each 1 hour apart
  }))

  const handleRemove = (photoId: string) => {
    console.log(`Removed: ${photoId}`)
  }

  return (
    <div className="p-6 bg-white rounded-lg space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Large Gallery Example</h2>
        <p className="text-gray-600">100 photos total, 8 per page</p>
      </div>
      <PhotoGallery photos={largePhotoSet} onRemove={handleRemove} photosPerPage={8} />
    </div>
  )
}

/**
 * Example 7: Photo Gallery with API Integration
 */
export function APIIntegratedGalleryExample() {
  const [photos, setPhotos] = useState<MovementEvidencePhoto[]>([])
  const [loading, setLoading] = useState(false)

  const loadPhotosFromAPI = async () => {
    setLoading(true)
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock response
      const apiPhotos: MovementEvidencePhoto[] = [
        {
          id: 'api-photo-1',
          url: 'https://via.placeholder.com/400?text=API+Photo+1',
          uploadedAt: new Date(),
        },
        {
          id: 'api-photo-2',
          url: 'https://via.placeholder.com/400?text=API+Photo+2',
          uploadedAt: new Date(),
        },
        {
          id: 'api-photo-3',
          url: 'https://via.placeholder.com/400?text=API+Photo+3',
          uploadedAt: new Date(),
        },
      ]

      setPhotos(apiPhotos)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
  }

  return (
    <div className="p-6 bg-white rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API-Integrated Gallery</h2>
        <button
          onClick={loadPhotosFromAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load Photos'}
        </button>
      </div>

      {photos.length === 0 && !loading ? (
        <p className="text-gray-600">Click "Load Photos" to fetch photos from the API</p>
      ) : (
        <PhotoGallery photos={photos} onRemove={handleRemove} />
      )}
    </div>
  )
}

/**
 * Demo Component - Shows all examples
 */
export function PhotoGalleryDemoAll() {
  const [activeExample, setActiveExample] = useState<number>(1)

  const examples = [
    { id: 1, name: 'Basic Usage', component: BasicPhotoGalleryExample },
    { id: 2, name: 'Stateful', component: StatefulPhotoGalleryExample },
    { id: 3, name: 'Custom Pagination', component: CustomPhotosPerPageExample },
    { id: 4, name: 'Empty State', component: EmptyGalleryExample },
    { id: 5, name: 'Transport Request', component: TransportRequestDetailExample },
    { id: 6, name: 'Large Gallery', component: LargeGalleryExample },
    { id: 7, name: 'API Integration', component: APIIntegratedGalleryExample },
  ]

  const ActiveComponent = examples.find((ex) => ex.id === activeExample)?.component

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">PhotoGallery Component Examples</h1>

        <div className="mb-6 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => setActiveExample(example.id)}
              className={`px-4 py-2 rounded transition-colors ${
                activeExample === example.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  )
}
