import api from '@/api/client'
import type { PaginationResponse } from '@/api/types'

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'

export type Bid = {
  _id: string
  loadId: string
  transporterId: string
  bidAmount: number
  currency?: string
  status: BidStatus
  estimatedDeliveryDate: string
  comments?: string
  acceptedAt?: string
  rejectedAt?: string
  rejectionReason?: string
  createdAt?: string
  expiresAt?: string
  transporter?: {
    _id?: string
    transporterName?: string
    email?: string
    mobile?: string
    rating?: number
    totalTrips?: number
  }
}

export type CreateBidPayload = {
  loadId: string
  bidAmount: number
  estimatedDeliveryDate: string
  comments?: string
  documents?: string[]
}

export type UpdateBidPayload = {
  bidAmount: number
}

/**
 * List all bids (filtered by current user/role)
 */
export async function listBids(params: {
  page?: number
  limit?: number
  loadId?: string
  status?: BidStatus
  sortBy?: string
  search?: string
}): Promise<PaginationResponse<Bid>> {
  const res = await api.get<PaginationResponse<Bid>>('/bids', {
    params,
  })
  return res.data
}

/**
 * Get all bids for a specific load
 * BEST OPTION FOR COMPANY ADMIN to view bids before accepting
 */
export async function getBidsForLoad(loadId: string, params?: {
  page?: number
  limit?: number
  sortBy?: string
}): Promise<PaginationResponse<Bid>> {
  const res = await api.get<PaginationResponse<Bid>>(`/bids/load/${loadId}`, {
    params,
  })
  return res.data
}

/**
 * Get single bid details
 */
export async function getBid(bidId: string): Promise<{
  success: boolean
  data: { bid: Bid }
}> {
  return api.get(`/bids/${bidId}`).then(r => r.data)
}

/**
 * Create a new bid (Transporter only)
 */
export async function createBid(payload: CreateBidPayload): Promise<{
  success: boolean
  message?: string
  data: { bid: Bid }
}> {
  return api.post('/bids', payload).then(r => r.data)
}

/**
 * Accept a bid (Company Admin only)
 * Auto-rejects all other pending bids for the same load
 */
export async function acceptBid(bidId: string): Promise<{
  success: boolean
  message?: string
  data: { bid: Bid }
}> {
  return api.patch(`/bids/${bidId}/accept`).then(r => r.data)
}

/**
 * Reject a bid (Company Admin only)
 */
export async function rejectBid(bidId: string, reason?: string): Promise<{
  success: boolean
  message?: string
  data: { bid: Bid }
}> {
  return api.patch(`/bids/${bidId}/reject`, { reason }).then(r => r.data)
}

/**
 * Update bid amount (Transporter only, pending bids only)
 */
export async function updateBid(bidId: string, payload: UpdateBidPayload): Promise<{
  success: boolean
  message?: string
  data: { bid: Bid }
}> {
  return api.patch(`/bids/${bidId}/update`, payload).then(r => r.data)
}

/**
 * Update final negotiated amount (Company admin only, pending bids only)
 */
export async function updateNegotiatedAmount(bidId: string, payload: UpdateBidPayload): Promise<{
  success: boolean
  message?: string
  data: { bid: Bid }
}> {
  return api.patch(`/bids/${bidId}/negotiated-amount`, payload).then(r => r.data)
}

/**
 * Withdraw a bid (Transporter only, pending bids only)
 */
export async function withdrawBid(bidId: string): Promise<{
  success: boolean
  message?: string
  data?: { bid: Bid }
}> {
  return api.delete(`/bids/${bidId}`).then(r => r.data)
}
