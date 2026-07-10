import api from '@/api/client'

export type PriceHistoryEvent = 'initial_bid' | 'offer_rate_updated' | 'offline_rate_set' | 'special_offer_set' | 'final_confirmed' | 'rate_rejected' | 'bid_accepted' | 'bid_rejected' | 'negotiation_note' | 'bulk_adjustment'

export type RateType = 'offer' | 'offline' | 'special' | 'final'

export type PriceHistoryEntry = {
  _id: string
  bidId: string
  loadId: string
  event: PriceHistoryEvent
  rateChange: {
    rateType: RateType
    previousValue?: number
    newValue: number
    currency: string
    percentageChange?: number
  }
  reason?: string
  changedBy?: { email: string; firstName?: string; lastName?: string }
  changedByName?: string
  changedByRole?: string
  sourceDocumentation?: {
    source?: string
    sourceUrl?: string
    sourceNotes?: string
    confidence?: string
  }
  negotiationNotes?: string
  businessJustification?: string
  createdAt: string
  approvalStatus?: string
}

export type PriceComparison = {
  bidId: string
  rates: {
    offerRate?: number
    offlineRate?: number
    specialOfferRate?: number
    finalConfirmedRate?: number
  }
  effectiveRate: number
  changes: {
    offerToFinal: number
    offerToFinalPercent: number
    timeline: Array<{
      date: string
      event: string
      rateType?: string
      value: number
      changedBy: string
    }>
  }
  historyCount: number
}

export type PriceStats = {
  totalBids: number
  avgOfferRate: number
  avgFinalRate: number
  totalNegotiationRounds: number
  priceReductions: number
  priceIncreases: number
  avgDiscount: number
}

/**
 * Get complete price history for a bid
 */
export async function getBidPriceHistory(bidId: string): Promise<PriceHistoryEntry[]> {
  const res = await api.get<{ success: boolean; data: PriceHistoryEntry[] }>(
    `/api/pricing/bid/${bidId}/history`
  )
  return res.data?.data || []
}

/**
 * Get price history for entire load
 */
export async function getLoadPriceHistory(
  loadId: string
): Promise<
  Array<{
    bidId: string
    bidAmount?: number
    events: PriceHistoryEntry[]
  }>
> {
  const res = await api.get<{
    success: boolean
    data: Array<{ bidId: string; events: PriceHistoryEntry[] }>
  }>(`/api/pricing/load/${loadId}/history`)
  return res.data?.data || []
}

/**
 * Get price comparison for a bid
 */
export async function getBidPriceComparison(bidId: string): Promise<PriceComparison> {
  const res = await api.get<{ success: boolean; data: PriceComparison }>(
    `/api/pricing/bid/${bidId}/comparison`
  )
  return res.data?.data
}

/**
 * Get price statistics for a load
 */
export async function getLoadPriceStats(loadId: string): Promise<PriceStats> {
  const res = await api.get<{ success: boolean; data: PriceStats }>(
    `/api/pricing/load/${loadId}/stats`
  )
  return res.data?.data
}

/**
 * Update offer rate (Transporter)
 */
export async function updateOfferRate(
  bidId: string,
  newValue: number,
  reason?: string
): Promise<{ success: boolean; message?: string; data?: any; warnings?: string[] }> {
  const res = await api.patch(`/api/pricing/bid/${bidId}/offer-rate`, {
    newValue,
    reason
  })
  return res.data
}

/**
 * Update offline rate (Admin)
 */
export async function updateOfflineRate(
  bidId: string,
  newValue: number,
  options?: {
    source?: 'market_research' | 'competitor_analysis' | 'historical_data' | 'manual_input'
    sourceUrl?: string
    sourceNotes?: string
    confidence?: 'high' | 'medium' | 'low'
    reason?: string
  }
): Promise<{ success: boolean; message?: string; data?: any; warnings?: string[] }> {
  const res = await api.patch(`/api/pricing/bid/${bidId}/offline-rate`, {
    newValue,
    ...options
  })
  return res.data
}

/**
 * Update special offer rate (Admin)
 */
export async function updateSpecialOfferRate(
  bidId: string,
  newValue: number,
  options?: {
    businessJustification?: string
    reason?: string
  }
): Promise<{ success: boolean; message?: string; data?: any; warnings?: string[] }> {
  const res = await api.patch(`/api/pricing/bid/${bidId}/special-offer-rate`, {
    newValue,
    ...options
  })
  return res.data
}

/**
 * Update final confirmed rate (Admin)
 */
export async function updateFinalConfirmedRate(
  bidId: string,
  newValue: number,
  options?: {
    negotiationNotes?: string
    reason?: string
  }
): Promise<{ success: boolean; message?: string; data?: any; warnings?: string[] }> {
  const res = await api.patch(`/api/pricing/bid/${bidId}/final-confirmed-rate`, {
    newValue,
    ...options
  })
  return res.data
}

/**
 * Record a price history event
 */
export async function recordPriceEvent(data: {
  bidId: string
  loadId: string
  event: PriceHistoryEvent
  rateType?: RateType
  previousValue?: number
  newValue: number
  reason?: string
  sourceDocumentation?: any
  negotiationNotes?: string
}): Promise<{ success: boolean; data: any }> {
  const res = await api.post('/api/pricing/history/record', data)
  return res.data
}

/**
 * Get pending price change approvals
 */
export async function getPendingApprovals(limit: number = 50): Promise<PriceHistoryEntry[]> {
  const res = await api.get<{ success: boolean; count: number; data: PriceHistoryEntry[] }>(
    '/api/pricing/approvals/pending',
    { params: { limit } }
  )
  return res.data?.data || []
}

/**
 * Approve price change
 */
export async function approvePriceChange(
  historyId: string,
  reason?: string
): Promise<{ success: boolean; data: any }> {
  const res = await api.patch(`/api/pricing/history/${historyId}/approve`, { reason })
  return res.data
}

/**
 * Reject price change
 */
export async function rejectPriceChange(
  historyId: string,
  reason: string
): Promise<{ success: boolean; data: any }> {
  const res = await api.patch(`/api/pricing/history/${historyId}/reject`, { reason })
  return res.data
}

/**
 * Export price history
 */
export async function exportPriceHistory(
  bidId: string,
  format: 'json' = 'json'
): Promise<any> {
  const res = await api.get(`/api/pricing/bid/${bidId}/export`, {
    params: { format }
  })
  return res.data?.data
}
