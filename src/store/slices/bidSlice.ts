import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Bid, BidStatus, CreateBidPayload, UpdateBidPayload } from '@/api/services/bid/bid.service'
import {
  listBids,
  getBidsForLoad,
  getBid,
  createBid,
  acceptBid,
  rejectBid,
  updateBid,
  withdrawBid,
} from '@/api/services/bid/bid.service'

export type BidState = {
  // List state
  bids: Bid[]
  loadBids: Bid[] // Bids for a specific load (admin view)
  total: number
  
  // Single bid state
  currentBid: Bid | null
  
  // Filters
  filters: {
    loadId?: string
    status: BidStatus | 'all'
    sortBy: string
  }
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // UI states
  loading: boolean
  creating: boolean
  accepting: boolean
  rejecting: boolean
  updating: boolean
  withdrawing: boolean
  
  // Error states
  error: string | null
  listError: string | null
}

const initialState: BidState = {
  bids: [],
  loadBids: [],
  total: 0,
  currentBid: null,
  filters: {
    loadId: undefined,
    status: 'all',
    sortBy: '-createdAt',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  loading: false,
  creating: false,
  accepting: false,
  rejecting: false,
  updating: false,
  withdrawing: false,
  error: null,
  listError: null,
}

/**
 * Fetch paginated list of user's bids
 */
export const fetchBids = createAsyncThunk(
  'bid/fetchBids',
  async (
    params: {
      page?: number
      limit?: number
      status?: BidStatus | 'all'
      sortBy?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await listBids({
        page: params.page || 1,
        limit: params.limit || 20,
        status: params.status === 'all' ? undefined : (params.status as BidStatus),
        sortBy: params.sortBy || '-createdAt',
      })

      return {
        data: res.data,
        pagination: res.pagination,
      }
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch bids')
    }
  }
)

/**
 * Fetch all bids for a specific load (Admin only)
 * BEST OPTION for company_admin to view bids before accepting
 */
export const fetchBidsForLoad = createAsyncThunk(
  'bid/fetchBidsForLoad',
  async (
    { loadId, page = 1, limit = 20 }: { loadId: string; page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await getBidsForLoad(loadId, { page, limit })

      return {
        loadId,
        data: res.data,
        pagination: res.pagination,
      }
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch bids for load')
    }
  }
)

/**
 * Fetch single bid details
 */
export const fetchBidDetails = createAsyncThunk(
  'bid/fetchDetails',
  async (bidId: string, { rejectWithValue }) => {
    try {
      const res = await getBid(bidId)
      return res.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch bid details')
    }
  }
)

/**
 * Create a new bid (Transporter only)
 */
export const createBidAsync = createAsyncThunk(
  'bid/create',
  async (payload: CreateBidPayload, { rejectWithValue }) => {
    try {
      const res = await createBid(payload)
      return res.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to create bid')
    }
  }
)

/**
 * Accept a bid (Company Admin only)
 * Auto-rejects all other pending bids for the same load
 */
export const acceptBidAsync = createAsyncThunk(
  'bid/accept',
  async (bidId: string, { rejectWithValue }) => {
    try {
      const res = await acceptBid(bidId)
      return res.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to accept bid')
    }
  }
)

/**
 * Reject a bid (Company Admin only)
 */
export const rejectBidAsync = createAsyncThunk(
  'bid/reject',
  async (
    { bidId, reason }: { bidId: string; reason?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await rejectBid(bidId, reason)
      return res.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to reject bid')
    }
  }
)

/**
 * Update bid amount (Transporter only, pending bids only)
 */
export const updateBidAsync = createAsyncThunk(
  'bid/update',
  async (
    { bidId, payload }: { bidId: string; payload: UpdateBidPayload },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateBid(bidId, payload)
      return res.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to update bid')
    }
  }
)

/**
 * Withdraw a bid (Transporter only, pending bids only)
 */
export const withdrawBidAsync = createAsyncThunk(
  'bid/withdraw',
  async (bidId: string, { rejectWithValue }) => {
    try {
      await withdrawBid(bidId)
      return bidId
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to withdraw bid')
    }
  }
)

/**
 * Acknowledge a bid (Transporter only, accepted bids only)
 * Confirms transporter will proceed with pickup
 */
export const acknowledgeBidAsync = createAsyncThunk(
  'bid/acknowledge',
  async (
    { bidId, message }: { bidId: string; message?: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetch(`/api/bids/${bidId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to acknowledge bid')
      return json.data.bid
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to acknowledge bid')
    }
  }
)

const bidSlice = createSlice({
  name: 'bid',
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<BidStatus | 'all'>) {
      state.filters.status = action.payload
      state.pagination.page = 1
    },
    setSortBy(state, action: PayloadAction<string>) {
      state.filters.sortBy = action.payload
      state.pagination.page = 1
    },
    setLoadIdFilter(state, action: PayloadAction<string | undefined>) {
      state.filters.loadId = action.payload
      state.pagination.page = 1
    },
    clearFilters(state) {
      state.filters = {
        loadId: undefined,
        status: 'all',
        sortBy: '-createdAt',
      }
      state.pagination.page = 1
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    clearError(state) {
      state.error = null
    },
    clearListError(state) {
      state.listError = null
    },
    clearCurrentBid(state) {
      state.currentBid = null
    },
    clearLoadBids(state) {
      state.loadBids = []
    },
  },
  extraReducers: (builder) => {
    // Fetch Bids
    builder
      .addCase(fetchBids.pending, (state) => {
        state.loading = true
        state.listError = null
      })
      .addCase(fetchBids.fulfilled, (state, action) => {
        state.loading = false
        state.bids = action.payload.data
        state.pagination = action.payload.pagination
      })
      .addCase(fetchBids.rejected, (state, action) => {
        state.loading = false
        state.listError = action.payload as string
      })

    // Fetch Bids For Load
    builder
      .addCase(fetchBidsForLoad.pending, (state) => {
        state.loading = true
        state.listError = null
      })
      .addCase(fetchBidsForLoad.fulfilled, (state, action) => {
        state.loading = false
        state.loadBids = action.payload.data
        state.pagination = action.payload.pagination
      })
      .addCase(fetchBidsForLoad.rejected, (state, action) => {
        state.loading = false
        state.listError = action.payload as string
      })

    // Fetch Bid Details
    builder
      .addCase(fetchBidDetails.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchBidDetails.fulfilled, (state, action) => {
        state.loading = false
        state.currentBid = action.payload
      })
      .addCase(fetchBidDetails.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create Bid
    builder
      .addCase(createBidAsync.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createBidAsync.fulfilled, (state, action) => {
        state.creating = false
        state.bids.unshift(action.payload)
        state.pagination.total += 1
      })
      .addCase(createBidAsync.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload as string
      })

    // Accept Bid
    builder
      .addCase(acceptBidAsync.pending, (state) => {
        state.accepting = true
        state.error = null
      })
      .addCase(acceptBidAsync.fulfilled, (state, action) => {
        state.accepting = false
        const bid = action.payload
        
        // Update in bids list
        const idx = state.bids.findIndex((b) => b._id === bid._id)
        if (idx !== -1) {
          state.bids[idx] = bid
        }
        
        // Update in load bids
        const loadIdx = state.loadBids.findIndex((b) => b._id === bid._id)
        if (loadIdx !== -1) {
          state.loadBids[loadIdx] = bid
        }
        
        // Update current bid
        if (state.currentBid?._id === bid._id) {
          state.currentBid = bid
        }
      })
      .addCase(acceptBidAsync.rejected, (state, action) => {
        state.accepting = false
        state.error = action.payload as string
      })

    // Reject Bid
    builder
      .addCase(rejectBidAsync.pending, (state) => {
        state.rejecting = true
        state.error = null
      })
      .addCase(rejectBidAsync.fulfilled, (state, action) => {
        state.rejecting = false
        const bid = action.payload
        
        // Update in bids list
        const idx = state.bids.findIndex((b) => b._id === bid._id)
        if (idx !== -1) {
          state.bids[idx] = bid
        }
        
        // Update in load bids
        const loadIdx = state.loadBids.findIndex((b) => b._id === bid._id)
        if (loadIdx !== -1) {
          state.loadBids[loadIdx] = bid
        }
        
        // Update current bid
        if (state.currentBid?._id === bid._id) {
          state.currentBid = bid
        }
      })
      .addCase(rejectBidAsync.rejected, (state, action) => {
        state.rejecting = false
        state.error = action.payload as string
      })

    // Update Bid
    builder
      .addCase(updateBidAsync.pending, (state) => {
        state.updating = true
        state.error = null
      })
      .addCase(updateBidAsync.fulfilled, (state, action) => {
        state.updating = false
        const bid = action.payload
        
        // Update in bids list
        const idx = state.bids.findIndex((b) => b._id === bid._id)
        if (idx !== -1) {
          state.bids[idx] = bid
        }
        
        // Update in load bids
        const loadIdx = state.loadBids.findIndex((b) => b._id === bid._id)
        if (loadIdx !== -1) {
          state.loadBids[loadIdx] = bid
        }
        
        // Update current bid
        if (state.currentBid?._id === bid._id) {
          state.currentBid = bid
        }
      })
      .addCase(updateBidAsync.rejected, (state, action) => {
        state.updating = false
        state.error = action.payload as string
      })

    // Withdraw Bid
    builder
      .addCase(withdrawBidAsync.pending, (state) => {
        state.withdrawing = true
        state.error = null
      })
      .addCase(withdrawBidAsync.fulfilled, (state, action) => {
        state.withdrawing = false
        const bidId = action.payload
        
        // Remove from bids list
        state.bids = state.bids.filter((b) => b._id !== bidId)
        
        // Remove from load bids
        state.loadBids = state.loadBids.filter((b) => b._id !== bidId)
        
        // Clear current bid if it matches
        if (state.currentBid?._id === bidId) {
          state.currentBid = null
        }
        
        state.pagination.total -= 1
      })
      .addCase(withdrawBidAsync.rejected, (state, action) => {
        state.withdrawing = false
        state.error = action.payload as string
      })

    // Acknowledge Bid
    builder
      .addCase(acknowledgeBidAsync.pending, (state) => {
        state.accepting = true
        state.error = null
      })
      .addCase(acknowledgeBidAsync.fulfilled, (state, action) => {
        state.accepting = false
        const bid = action.payload
        
        // Update in bids list
        const idx = state.bids.findIndex((b) => b._id === bid._id)
        if (idx !== -1) {
          state.bids[idx] = bid
        }
        
        // Update in load bids
        const loadIdx = state.loadBids.findIndex((b) => b._id === bid._id)
        if (loadIdx !== -1) {
          state.loadBids[loadIdx] = bid
        }
        
        // Update current bid
        if (state.currentBid?._id === bid._id) {
          state.currentBid = bid
        }
      })
      .addCase(acknowledgeBidAsync.rejected, (state, action) => {
        state.accepting = false
        state.error = action.payload as string
      })
  },
})

export const {
  setStatusFilter,
  setSortBy,
  setLoadIdFilter,
  clearFilters,
  setPage,
  clearError,
  clearListError,
  clearCurrentBid,
  clearLoadBids,
} = bidSlice.actions

export default bidSlice.reducer
