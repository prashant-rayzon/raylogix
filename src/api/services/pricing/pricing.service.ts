import api from '@/api/client'

/**
 * Minimal pricing service for load assignment rate tracking
 */

export async function logPriceHistory(payload: {
  bidId: string
  loadId: string
  event: string
  previousRate?: number
  newRate: number
  reason?: string
}): Promise<{ success: boolean; data: any }> {
  return api.post('/pricing/history', payload).then(r => r.data).catch(err => {
    console.error('Failed to log price history:', err)
    return { success: false }
  })
}

export async function getPriceHistory(bidId: string): Promise<any[]> {
  return api.get(`/pricing/bid/${bidId}/history`)
    .then(r => r.data?.data || [])
    .catch(err => {
      console.error('Failed to get price history:', err)
      return []
    })
}
