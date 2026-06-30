import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchBids,
  fetchBidsForLoad,
  fetchBidDetails,
  createBidAsync,
  acceptBidAsync,
  rejectBidAsync,
  updateBidAsync,
  withdrawBidAsync,
  setStatusFilter,
  setSortBy,
  setLoadIdFilter,
  clearFilters,
  setPage,
  clearError,
  clearListError,
  clearCurrentBid,
  clearLoadBids,
} from '@/store/slices/bidSlice'
import type { BidStatus, CreateBidPayload, UpdateBidPayload } from '@/api/services/bid/bid.service'

/**
 * Custom hook for managing bids
 * Provides access to Redux state and all bid-related actions
 */
export const useBidStore = () => {
  const dispatch = useAppDispatch()

  // State
  const bids = useAppSelector((state) => state.bid.bids)
  const loadBids = useAppSelector((state) => state.bid.loadBids)
  const currentBid = useAppSelector((state) => state.bid.currentBid)
  const pagination = useAppSelector((state) => state.bid.pagination)
  const filters = useAppSelector((state) => state.bid.filters)
  const loading = useAppSelector((state) => state.bid.loading)
  const creating = useAppSelector((state) => state.bid.creating)
  const accepting = useAppSelector((state) => state.bid.accepting)
  const rejecting = useAppSelector((state) => state.bid.rejecting)
  const updating = useAppSelector((state) => state.bid.updating)
  const withdrawing = useAppSelector((state) => state.bid.withdrawing)
  const error = useAppSelector((state) => state.bid.error)
  const listError = useAppSelector((state) => state.bid.listError)

  return {
    // State
    bids,
    loadBids,
    currentBid,
    pagination,
    filters,
    loading,
    creating,
    accepting,
    rejecting,
    updating,
    withdrawing,
    error,
    listError,

    // Actions
    /**
     * List user's bids (filtered by role)
     * For transporters: shows own bids
     * For company_admin: shows bids on own company's loads (with filtering)
     */
    listBids: (params?: {
      page?: number
      limit?: number
      status?: BidStatus | 'all'
      sortBy?: string
    }) => dispatch(fetchBids(params || {})),

    /**
     * Get all bids for a specific load
     * BEST OPTION for company_admin to view bids before accepting
     * Only accessible to company_admin of the load's company
     */
    getBidsForLoad: (loadId: string, page?: number, limit?: number) =>
      dispatch(fetchBidsForLoad({ loadId, page, limit })),

    /**
     * Get single bid details
     */
    getBidDetails: (bidId: string) => dispatch(fetchBidDetails(bidId)),

    /**
     * Create a new bid (Transporter only)
     */
    createBid: (payload: CreateBidPayload) => dispatch(createBidAsync(payload)),

    /**
     * Accept a bid (Company Admin only)
     * Auto-rejects all other pending bids for the same load
     */
    acceptBid: (bidId: string) => dispatch(acceptBidAsync(bidId)),

    /**
     * Reject a bid (Company Admin only)
     */
    rejectBid: (bidId: string, reason?: string) =>
      dispatch(rejectBidAsync({ bidId, reason })),

    /**
     * Update bid amount (Transporter only, pending bids only)
     */
    updateBid: (bidId: string, payload: UpdateBidPayload) =>
      dispatch(updateBidAsync({ bidId, payload })),

    /**
     * Withdraw a bid (Transporter only, pending bids only)
     */
    withdrawBid: (bidId: string) => dispatch(withdrawBidAsync(bidId)),

    // Filters
    setStatusFilter: (status: BidStatus | 'all') => dispatch(setStatusFilter(status)),
    setSortBy: (sortBy: string) => dispatch(setSortBy(sortBy)),
    setLoadIdFilter: (loadId?: string) => dispatch(setLoadIdFilter(loadId)),
    clearFilters: () => dispatch(clearFilters()),

    // Pagination
    setPage: (page: number) => dispatch(setPage(page)),

    // Error handling
    clearError: () => dispatch(clearError()),
    clearListError: () => dispatch(clearListError()),
    clearCurrentBid: () => dispatch(clearCurrentBid()),
    clearLoadBids: () => dispatch(clearLoadBids()),
  }
}
