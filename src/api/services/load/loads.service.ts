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
  estimatedWeight?: number
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
  routeData?: {
    distanceKm?: number
    durationHours?: number
    routeSummary?: string
    calculatedAt?: string
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
    offerRate?: number
    offlineRate?: number
    specialOfferRate?: number
    finalConfirmedRate?: number
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
  boardBids?: Bid[]
  actualPickupDate?: string
  actualDeliveryDate?: string
  deliveryProof?: string
  deliveryConfirmation?: {
    status?: 'pending' | 'proof_submitted' | 'confirmed' | 'rejected'
    proofSubmittedAt?: string
    proofSubmittedBy?: string
    confirmedAt?: string
    confirmedBy?: string
    receiverName?: string
    receiverPhone?: string
    remarks?: string
    proofs?: Array<{
      url?: string
      label?: string
      uploadedAt?: string
    }>
  }
  notes?: string
  refNumber?: string
  tat?: string
  dpNum?: string
  attachments?: Array<{
    url?: string
    name?: string
    mimeType?: string
    size?: number
    uploadedAt?: string
  }>
  priceDeviation?: any
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
  originalBidAmount?: number
  currency?: string
  vehiclesOffered?: number
  allocatedVehicles?: number
  pricing?: {
    rateType?: 'per_vehicle' | 'total'
    floorPrice?: number
    ceilingPrice?: number
  }
  rateDetails?: {
    offerRate?: number
    offlineRate?: number
    specialOfferRate?: number
    finalConfirmedRate?: number
    offlineRateSource?: string
    offlineRateNotes?: string
    updatedAt?: string
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
  material?: string
  priority?: string
  sortBy?: string
  search?: string
  vehicleType?: string
  loadDirection?: 'outbound' | 'inbound'
  isPublic?: 'true' | 'false'
  pickupCity?: string
  deliveryCity?: string
  dateField?: 'pickupDate' | 'deliveryDate' | 'createdAt'
  dateFrom?: string
  dateTo?: string
}): Promise<PaginationResponse<Load>> {
  const res = await api.get<PaginationResponse<Load>>('/api/loads', {
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
  return api.get(`/api/loads/${loadId}`).then(r => r.data)
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
  return api.post(`/api/loads/${loadId}/assign`, { bidId, allocatedVehicles, finalRate, rateType, notes }).then(r => r.data)
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
    .patch(`/api/loads/${loadId}/mark-in-transit`, {
      actualPickupDate: actualPickupDate
        ? new Date(actualPickupDate).toISOString()
        : undefined,
    })
    .then(r => r.data)
}

export async function markDelivered(payload: {
  loadId: string
  actualDeliveryDate?: string | number
  receiverName?: string
  receiverPhone?: string
  deliveryRemarks?: string
  deliveryProofFiles?: File[]
}): Promise<{
  success: boolean
  message?: string
  data: { load: Load }
}> {
  const {
    loadId,
    actualDeliveryDate,
    receiverName,
    receiverPhone,
    deliveryRemarks,
    deliveryProofFiles,
  } = payload
  const formData = new FormData()
  if (actualDeliveryDate) {
    formData.append('actualDeliveryDate', new Date(actualDeliveryDate).toISOString())
  }
  if (receiverName) formData.append('receiverName', receiverName)
  if (receiverPhone) formData.append('receiverPhone', receiverPhone)
  if (deliveryRemarks) formData.append('deliveryRemarks', deliveryRemarks)
  ;(deliveryProofFiles || []).forEach((file) => {
    formData.append('deliveryProofFiles', file)
  })

  return api
    .patch(`/api/loads/${loadId}/mark-delivered`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
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
  return api.get(`/api/loads/${loadId}/bids/compare`).then(r => r.data)
}

export async function approveDeviation(
  loadId: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; load: any }> {
  return api.patch(`/api/loads/${loadId}/approve-deviation`, { action }).then(r => r.data)
}

