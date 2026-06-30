import api from '@/api/client'
import type { PaginationResponse } from '@/api/types'

export type LoadStatus = 'open' | 'assigned' | 'in_transit' | 'delivered' | 'canceled'

export type LocationData = {
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

export type Load = {
  _id: string
  loadNumber: string
  loadDirection?: 'outbound' | 'inbound'
  material: string
  quantity?: { amount?: number; unit?: string }
  vehicleType?: string
  numberOfVehicles?: number
  allocatedVehicles?: number
  remainingVehicles?: number
  pickupDate: string
  deliveryDate: string
  pickupLocation: LocationData
  deliveryLocation: LocationData
  status: LoadStatus
  priority?: string
  isPublic?: boolean
  allowedTransporters?: string[]
  bidOpenUntil?: string
  assignedTransporter?: {
    _id: string
    name?: string
    transporterName?: string
    email?: string
    phone?: string
    mobile?: string
    rating?: number
    userId?: string | { _id?: string }
    profilePicture?: string
  }
  bidWinningPrice?: number
  pricing?: {
    rateType?: 'per_vehicle' | 'total'
    floorPrice?: number
    ceilingPrice?: number
    currency?: string
  }
  allocations?: Array<{
    transporterId?: string | {
      _id?: string
      name?: string
      transporterName?: string
      email?: string
      phone?: string
      mobile?: string
      userId?: string | { _id?: string }
      profilePicture?: string
    }
    bidId?: string | {
      _id?: string
      bidAmount?: number
      currency?: string
      status?: string
      vehiclesOffered?: number
      allocatedVehicles?: number
    }
    allocatedVehicles?: number
    acceptedVehicles?: number
    finalRate?: number
    rateType?: 'per_vehicle' | 'total'
    currency?: string
    status?: string
    assignedAt?: string
    notes?: string
  }>
  bidSummary?: {
    totalBids?: number
    activeBids?: number
    acceptedBids?: number
    rejectedBids?: number
    participatingTransporters?: number
    lowestBid?: number
    highestBid?: number
    averageBid?: number
  }
  actualPickupDate?: string
  actualDeliveryDate?: string
  deliveryProof?: string
  specialRequirements?: string
  notes?: string
  refNumber?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string | { _id?: string; email?: string; firstName?: string; lastName?: string }
}

export type Bid = {
  _id: string
  loadId: string
  transporterId: string | {
    _id?: string
    name?: string
    transporterName?: string
    email?: string
    phone?: string
    mobile?: string
    rating?: number
    totalTrips?: number
    userId?: string | { _id?: string }
    profilePicture?: string
  }
  bidAmount: number
  currency?: string
  vehiclesOffered?: number
  allocatedVehicles?: number
  pricing?: {
    rateType?: 'per_vehicle' | 'total'
    floorPrice?: number
    ceilingPrice?: number
  }
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'
  estimatedDeliveryDate: string
  comments?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  transporter?: {
    name?: string
    transporterName?: string
    email?: string
    mobile?: string
    rating?: number
    totalTrips?: number
  }
}

export type CreateOrUpdateLoadResponse<T> = {
  success: true
  message?: string
  data: T
}

export async function listLoads(params: {
  page?: number
  limit?: number
  status?: LoadStatus
  priority?: string
  sortBy?: string
  search?: string
}): Promise<PaginationResponse<Load>> {
  const res = await api.get<PaginationResponse<Load>>('/loads', {
    params,
  })
  return res.data
}

export async function getLoad(loadId: string): Promise<{
  success: boolean
  data: {
    load: Load
    bids: Bid[]
    statistics: Record<string, unknown>
  }
}> {
  return api.get(`/loads/${loadId}`).then(r => r.data)
}

export async function assignWinner(payload: {
  loadId: string
  bidId: string
  allocatedVehicles?: number
  finalRate?: number
  rateType?: 'per_vehicle' | 'total'
  notes?: string
}): Promise<{
  success: boolean
  message?: string
  data: { load: Load; acceptedBid: Bid; rejectedBidIds?: string[] }
}> {
  const { loadId, bidId, allocatedVehicles, finalRate, rateType, notes } = payload
  return api.post(`/loads/${loadId}/assign`, { bidId, allocatedVehicles, finalRate, rateType, notes }).then(r => r.data)
}

export async function markInTransit(payload: {
  loadId: string
  actualPickupDate?: string | number
}): Promise<{
  success: boolean
  message?: string
  data: { load: Load }
}> {
  const { loadId, actualPickupDate } = payload
  return api
    .patch(`/loads/${loadId}/mark-in-transit`, {
      actualPickupDate: actualPickupDate
        ? new Date(actualPickupDate).toISOString()
        : undefined,
    })
    .then(r => r.data)
}

export async function markDelivered(payload: {
  loadId: string
  actualDeliveryDate?: string | number
  deliveryProof?: string
}): Promise<{
  success: boolean
  message?: string
  data: { load: Load }
}> {
  const { loadId, actualDeliveryDate, deliveryProof } = payload
  return api
    .patch(`/loads/${loadId}/mark-delivered`, {
      actualDeliveryDate: actualDeliveryDate
        ? new Date(actualDeliveryDate).toISOString()
        : undefined,
      deliveryProof,
    })
    .then(r => r.data)
}

export async function compareBids(loadId: string): Promise<{
  success: boolean
  data: {
    bids: Bid[]
    statistics: {
      totalBids: number
      acceptedBids: number
      pendingBids: number
      lowestBid?: number
      highestBid?: number
      averageBid?: string
      lowestBidPercentage?: string
    }
  }
}> {
  return api.get(`/loads/${loadId}/bids/compare`).then(r => r.data)
}

