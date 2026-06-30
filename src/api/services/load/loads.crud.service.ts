import api from '@/api/client'

import type { Load } from './loads.service'

export type CreateLoadPayload = {
  loadNumber?: string
  loadDirection?: 'outbound' | 'inbound'
  isPublic?: boolean
  allowedTransporters?: string[]
  pickupLocation: {
    branchId?: string
    branchName?: string
    address: string
    city?: string
    state?: string
    zipCode?: string
    coordinates?: { latitude?: number; longitude?: number }
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
    coordinates?: { latitude?: number; longitude?: number }
    contactPerson?: string
    phone?: string
    email?: string
  }
  material: string
  vehicleType: string
  numberOfVehicles: number
  pickupDate: string
  deliveryDate: string
  specialRequirements?: string
  refNumber?: string
  notes?: string
  priority?: string
  estimatedWeight?: number
}

export type UpdateLoadPayload = {
  pickupDate?: string
  deliveryDate?: string
  specialRequirements?: string
  notes?: string
  priority?: string
}

export async function createLoad(payload: CreateLoadPayload): Promise<{ success: boolean; data: { load: Load } }> {
  return api.post('/loads', payload).then(r => r.data)
}

export async function updateLoad(loadId: string, payload: UpdateLoadPayload): Promise<{ success: boolean; data: { load: Load } }> {
  return api.put(`/loads/${loadId}`, payload).then(r => r.data)
}

export async function deleteLoad(loadId: string): Promise<{ success: boolean; data: { load: Load } }> {
  return api.delete(`/loads/${loadId}`).then(r => r.data)
}


