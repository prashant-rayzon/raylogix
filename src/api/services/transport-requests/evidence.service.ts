import api from '@/api/client'
import { isAxiosError } from 'axios'

/**
 * Interface for movement evidence photos
 * Represents metadata and details of uploaded photos
 */
export interface MovementEvidencePhoto {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string // ISO date string
  phase: 'gateIn' | 'gateOut'
  url?: string // For display
}

/**
 * Interface for API response structure
 */
interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * Interface for photo upload response
 */
interface PhotoUploadResponse {
  photos: MovementEvidencePhoto[]
}

/**
 * Class for handling API errors with meaningful messages
 */
export class EvidenceServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'EvidenceServiceError'
  }
}

/**
 * Extract meaningful error message from API response or error object
 */
const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const data = error.response?.data as any
    if (data?.message) {
      return data.message
    }
    if (error.response?.status === 400) {
      return 'Invalid request. Please check your input.'
    }
    if (error.response?.status === 401) {
      return 'Authentication required. Please log in again.'
    }
    if (error.response?.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (error.response?.status === 404) {
      return 'Resource not found.'
    }
    if (error.response?.status === 413) {
      return 'File size exceeds maximum allowed limit.'
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.'
    }
    return error.message || 'An error occurred while processing the request.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred.'
}

/**
 * Upload photos for vehicle movement evidence
 *
 * @param movementId - The ID of the movement
 * @param phase - The phase of the movement ('gateIn' or 'gateOut')
 * @param files - Array of File objects to upload
 * @returns Promise resolving to array of MovementEvidencePhoto objects
 * @throws EvidenceServiceError with meaningful error message
 *
 * @example
 * const photos = await uploadPhotos(
 *   'movement123',
 *   'gateIn',
 *   [file1, file2]
 * )
 */
export const uploadPhotos = async (
  movementId: string,
  phase: 'gateIn' | 'gateOut',
  files: File[]
): Promise<MovementEvidencePhoto[]> => {
  try {
    // Validate inputs
    if (!movementId) {
      throw new EvidenceServiceError('Movement ID is required')
    }
    if (!phase || (phase !== 'gateIn' && phase !== 'gateOut')) {
      throw new EvidenceServiceError('Phase must be either "gateIn" or "gateOut"')
    }
    if (!files || files.length === 0) {
      throw new EvidenceServiceError('At least one file must be provided')
    }

    // Create FormData for multipart upload
    const formData = new FormData()
    formData.append('movementId', movementId)
    formData.append('phase', phase)

    // Append all files
    files.forEach((file) => {
      formData.append('photos', file)
    })

    // Make API request with FormData
    const response = await api.post<ApiResponse<PhotoUploadResponse>>(
      `/api/movements/${movementId}/evidence/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    // Validate response structure
    if (!response.data?.success || !response.data?.data?.photos) {
      throw new EvidenceServiceError('Invalid response from server')
    }

    return response.data.data.photos
  } catch (error) {
    const message = getErrorMessage(error)
    const statusCode = isAxiosError(error) ? error.response?.status : undefined
    throw new EvidenceServiceError(message, statusCode, error)
  }
}

/**
 * Retrieve photos for a movement
 *
 * @param movementId - The ID of the movement
 * @param phase - Optional phase filter ('gateIn' or 'gateOut')
 * @returns Promise resolving to array of MovementEvidencePhoto objects
 * @throws EvidenceServiceError with meaningful error message
 *
 * @example
 * // Get all photos for a movement
 * const allPhotos = await getPhotos('movement123')
 *
 * // Get only gate-in photos
 * const gateInPhotos = await getPhotos('movement123', 'gateIn')
 */
export const getPhotos = async (
  movementId: string,
  phase?: 'gateIn' | 'gateOut'
): Promise<MovementEvidencePhoto[]> => {
  try {
    // Validate input
    if (!movementId) {
      throw new EvidenceServiceError('Movement ID is required')
    }

    // Build query params
    const params = new URLSearchParams()
    if (phase) {
      if (phase !== 'gateIn' && phase !== 'gateOut') {
        throw new EvidenceServiceError('Phase must be either "gateIn" or "gateOut"')
      }
      params.append('phase', phase)
    }

    // Make API request
    const queryString = params.toString()
    const url = `/api/movements/${movementId}/evidence/photos${queryString ? `?${queryString}` : ''}`
    const response = await api.get<ApiResponse<PhotoUploadResponse>>(url)

    // Validate response structure
    if (!response.data?.success || !response.data?.data?.photos) {
      throw new EvidenceServiceError('Invalid response from server')
    }

    return response.data.data.photos
  } catch (error) {
    const message = getErrorMessage(error)
    const statusCode = isAxiosError(error) ? error.response?.status : undefined
    throw new EvidenceServiceError(message, statusCode, error)
  }
}

/**
 * Delete a photo from movement evidence
 *
 * @param movementId - The ID of the movement
 * @param photoId - The ID of the photo to delete
 * @returns Promise that resolves when deletion is complete
 * @throws EvidenceServiceError with meaningful error message
 *
 * @example
 * await deletePhoto('movement123', 'photo456')
 */
export const deletePhoto = async (
  movementId: string,
  photoId: string
): Promise<void> => {
  try {
    // Validate inputs
    if (!movementId) {
      throw new EvidenceServiceError('Movement ID is required')
    }
    if (!photoId) {
      throw new EvidenceServiceError('Photo ID is required')
    }

    // Make API request
    const response = await api.delete<ApiResponse<{ success: boolean }>>(
      `/api/movements/${movementId}/evidence/photos/${photoId}`
    )

    // Validate response
    if (!response.data?.success) {
      throw new EvidenceServiceError('Failed to delete photo')
    }
  } catch (error) {
    const message = getErrorMessage(error)
    const statusCode = isAxiosError(error) ? error.response?.status : undefined
    throw new EvidenceServiceError(message, statusCode, error)
  }
}
