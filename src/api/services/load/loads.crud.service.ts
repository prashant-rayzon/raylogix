import api from '@/api/client'

import type { Load } from './loads.service'

type ExistingAttachment = {
  url?: string
  name?: string
  mimeType?: string
  size?: number
  uploadedAt?: string
}

export type CreateLoadPayload = {
  loadNumber?: string
  loadDirection?: 'outbound' | 'inbound'
  isPublic?: boolean
  allowedTransporters?: string[]
  attachments?: File[]
  existingAttachments?: ExistingAttachment[]
  pickupLocation: {
    branchId?: string
    branchName?: string
    address: string
    city?: string
    state?: string
    zipCode?: string
    latitude?: number
    longitude?: number
    placeId?: string
    contactPerson?: string
    phone?: string
    email?: string
  }
  deliveryLocation: {
    branchId?: string
    branchName?: string
    address: string
    city?: string
    state?: string
    zipCode?: string
    latitude?: number
    longitude?: number
    placeId?: string
    contactPerson?: string
    phone?: string
    email?: string
  }
  material: string
  vehicleType: string
  numberOfVehicles: number
  pickupDate: string
  deliveryDate?: string
  refNumber?: string
  tat?: string
  dpNum?: string
  notes?: string
  priority?: string
  estimatedWeight?: number
  
  // Route Optimization Fields
  routeOptimization?: boolean
  preferredRoute?: 'fastest' | 'shortest' | 'economical'
  avoidTolls?: boolean
  avoidHighways?: boolean
  avoidFerries?: boolean
  maxRouteAlternatives?: number
  routeData?: {
    distanceKm: number
    durationHours: number
    routeSummary?: string
  }
}

export type UpdateLoadPayload = {
  loadDirection?: 'outbound' | 'inbound'
  isPublic?: boolean
  allowedTransporters?: string[]
  attachments?: File[]
  existingAttachments?: ExistingAttachment[]
  pickupLocation?: {
    branchId?: string
    branchName?: string
    address: string
    city?: string
    state?: string
    zipCode?: string
    latitude?: number
    longitude?: number
    placeId?: string
    contactPerson?: string
    phone?: string
    email?: string
  }
  deliveryLocation?: {
    branchId?: string
    branchName?: string
    address: string
    city?: string
    state?: string
    zipCode?: string
    latitude?: number
    longitude?: number
    placeId?: string
    contactPerson?: string
    phone?: string
    email?: string
  }
  material?: string
  vehicleType?: string
  numberOfVehicles?: number
  pickupDate?: string
  deliveryDate?: string
  tat?: string
  dpNum?: string
  estimatedWeight?: number
  notes?: string
  priority?: string
  
  // Route Optimization Fields
  routeOptimization?: boolean
  preferredRoute?: 'fastest' | 'shortest' | 'economical'
  avoidTolls?: boolean
  avoidHighways?: boolean
  avoidFerries?: boolean
  maxRouteAlternatives?: number
  routeData?: {
    distanceKm: number
    durationHours: number
    routeSummary?: string
  }
}

export async function createLoad(payload: CreateLoadPayload): Promise<{ success: boolean; data: { load: Load } }> {
  const formData = new FormData()

  // Basic Fields
  if (payload.loadNumber) formData.append('loadNumber', payload.loadNumber)
  if (payload.loadDirection) formData.append('loadDirection', payload.loadDirection)
  if (payload.isPublic !== undefined) formData.append('isPublic', String(payload.isPublic))
  
  // Location Fields (with coordinates)
  formData.append('pickupLocation', JSON.stringify(payload.pickupLocation))
  formData.append('deliveryLocation', JSON.stringify(payload.deliveryLocation))
  
  // Load Details
  formData.append('material', payload.material)
  formData.append('vehicleType', payload.vehicleType)
  formData.append('numberOfVehicles', String(payload.numberOfVehicles))
  formData.append('pickupDate', payload.pickupDate)
  if (payload.deliveryDate) formData.append('deliveryDate', payload.deliveryDate)

  // Optional Fields
  if (payload.allowedTransporters?.length) {
    formData.append('allowedTransporters', JSON.stringify(payload.allowedTransporters))
  }
  if (payload.refNumber) formData.append('refNumber', payload.refNumber)
  if (payload.tat) formData.append('tat', payload.tat)
  if (payload.dpNum) formData.append('dpNum', payload.dpNum)
  if (payload.notes) formData.append('notes', payload.notes)
  if (payload.priority) formData.append('priority', payload.priority)
  if (payload.estimatedWeight !== undefined) {
    formData.append('estimatedWeight', String(payload.estimatedWeight))
  }
  
  // Route Optimization Fields
  if (payload.routeOptimization !== undefined) {
    formData.append('routeOptimization', String(payload.routeOptimization))
  }
  if (payload.preferredRoute) {
    formData.append('preferredRoute', payload.preferredRoute)
  }
  if (payload.avoidTolls !== undefined) {
    formData.append('avoidTolls', String(payload.avoidTolls))
  }
  if (payload.avoidHighways !== undefined) {
    formData.append('avoidHighways', String(payload.avoidHighways))
  }
  if (payload.avoidFerries !== undefined) {
    formData.append('avoidFerries', String(payload.avoidFerries))
  }
  if (payload.maxRouteAlternatives !== undefined) {
    formData.append('maxRouteAlternatives', String(payload.maxRouteAlternatives))
  }
  if (payload.routeData) {
    formData.append('routeData', JSON.stringify(payload.routeData))
  }
  (payload.attachments || []).forEach((file) => formData.append('attachments', file))
  if (payload.existingAttachments) {
    formData.append('existingAttachments', JSON.stringify(payload.existingAttachments))
  }

  return api.post('/api/loads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export async function updateLoad(loadId: string, payload: UpdateLoadPayload): Promise<{ success: boolean; data: { load: Load } }> {
  const formData = new FormData()

  // Basic Fields
  if (payload.loadDirection) formData.append('loadDirection', payload.loadDirection)
  if (payload.isPublic !== undefined) formData.append('isPublic', String(payload.isPublic))
  
  // Location Fields
  if (payload.pickupLocation) {
    formData.append('pickupLocation', JSON.stringify(payload.pickupLocation))
  }
  if (payload.deliveryLocation) {
    formData.append('deliveryLocation', JSON.stringify(payload.deliveryLocation))
  }
  
  // Load Details
  if (payload.material) formData.append('material', payload.material)
  if (payload.vehicleType) formData.append('vehicleType', payload.vehicleType)
  if (payload.numberOfVehicles !== undefined) {
    formData.append('numberOfVehicles', String(payload.numberOfVehicles))
  }
  if (payload.pickupDate) formData.append('pickupDate', payload.pickupDate)
  if (payload.deliveryDate) formData.append('deliveryDate', payload.deliveryDate)
  
  // Optional Fields
  if (payload.allowedTransporters) {
    formData.append('allowedTransporters', JSON.stringify(payload.allowedTransporters))
  }
  if (payload.tat) formData.append('tat', payload.tat)
  if (payload.dpNum) formData.append('dpNum', payload.dpNum)
  if (payload.notes !== undefined) formData.append('notes', payload.notes)
  if (payload.priority) formData.append('priority', payload.priority)
  if (payload.estimatedWeight !== undefined) {
    formData.append('estimatedWeight', String(payload.estimatedWeight))
  }
  
  // Route Optimization Fields
  if (payload.routeOptimization !== undefined) {
    formData.append('routeOptimization', String(payload.routeOptimization))
  }
  if (payload.preferredRoute) {
    formData.append('preferredRoute', payload.preferredRoute)
  }
  if (payload.avoidTolls !== undefined) {
    formData.append('avoidTolls', String(payload.avoidTolls))
  }
  if (payload.avoidHighways !== undefined) {
    formData.append('avoidHighways', String(payload.avoidHighways))
  }
  if (payload.avoidFerries !== undefined) {
    formData.append('avoidFerries', String(payload.avoidFerries))
  }
  if (payload.maxRouteAlternatives !== undefined) {
    formData.append('maxRouteAlternatives', String(payload.maxRouteAlternatives))
  }
  if (payload.routeData) {
    formData.append('routeData', JSON.stringify(payload.routeData))
  }
  
  // Attachments
  ;(payload.attachments || []).forEach((file) => formData.append('attachments', file))
  if (payload.existingAttachments) {
    formData.append('existingAttachments', JSON.stringify(payload.existingAttachments))
  }

  return api.put(`/api/loads/${loadId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export async function deleteLoad(loadId: string): Promise<{ success: boolean; data: { load: Load } }> {
  return api.delete(`/api/loads/${loadId}`).then(r => r.data)
}

// Additional API endpoints for route optimization

export async function calculateRoute(
  pickupLocation: {
    latitude: number
    longitude: number
    address?: string
  },
  deliveryLocation: {
    latitude: number
    longitude: number
    address?: string
  },
  options?: {
    vehicleType?: string
    avoidTolls?: boolean
    avoidHighways?: boolean
    avoidFerries?: boolean
  }
): Promise<{
  success: boolean
  data: {
    distance: number
    duration: number
    fuelCost: number
    driverCost: number
    totalCost: number
    estimatedEmissions: number
    routePolyline?: string
    routeSummary?: string
    alternatives?: Array<{
      distance: number
      duration: number
      polyline: string
      summary: string
    }>
  }
}> {
  return api.post('/api/loads/calculate-route', {
    pickupLocation,
    deliveryLocation,
    options,
  }).then(r => r.data)
}

export async function geocodeAddress(address: string): Promise<{
  success: boolean
  data: {
    formattedAddress: string
    latitude: number
    longitude: number
    placeId: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}> {
  return api.post('/api/loads/geocode', { address }).then(r => r.data)
}

export async function getNearbyLocations(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  type?: string
): Promise<{
  success: boolean
  data: Array<{
    name: string
    address: string
    latitude: number
    longitude: number
    placeId: string
    types: string[]
    rating?: number
  }>
}> {
  return api.post('/api/loads/nearby-locations', {
    latitude,
    longitude,
    radius,
    type,
  }).then(r => r.data)
}
