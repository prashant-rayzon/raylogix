import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Load, Bid, LoadStatus } from '@/api/services/load/loads.service'
import type { CreateLoadPayload } from '@/api/services/load/loads.crud.service'
import {
  listLoads,
  getLoad,
  assignWinner,
  markInTransit,
  markDelivered,
} from '@/api/services/load/loads.service'
import {
  createLoad,
  updateLoad,
  deleteLoad,
} from '@/api/services/load/loads.crud.service'

const normalizeBidAmount = (value: unknown) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

const buildBidSummary = (bids: Bid[]) => {
  const transporterIds = new Set<string>()
  const amounts: number[] = []

  bids.forEach((bid) => {
    const transporterId =
      typeof bid.transporterId === 'string'
        ? bid.transporterId
        : bid.transporterId?._id

    if (transporterId) transporterIds.add(String(transporterId))

    const amount = normalizeBidAmount((bid as any).bidAmount)
    if (amount !== null) amounts.push(amount)
  })

  return {
    totalBids: bids.length,
    activeBids: bids.filter((bid) => bid.status === 'pending').length,
    acceptedBids: bids.filter((bid) => bid.status === 'accepted').length,
    rejectedBids: bids.filter((bid) => bid.status === 'rejected').length,
    participatingTransporters: transporterIds.size,
    lowestBid: amounts.length ? Math.min(...amounts) : 0,
    highestBid: amounts.length ? Math.max(...amounts) : 0,
    averageBid: amounts.length
      ? Number((amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length).toFixed(2))
      : 0,
  }
}

const applyRealtimeBidToLoad = (load: Load, bid: Bid): Load => {
  if (String(bid.loadId) !== String(load._id)) return load

  const existingBoardBids = Array.isArray(load.boardBids) ? [...load.boardBids] : []
  const existingBidIndex = existingBoardBids.findIndex((item) => item._id === bid._id)
  if (existingBidIndex >= 0) {
    existingBoardBids[existingBidIndex] = {
      ...existingBoardBids[existingBidIndex],
      ...bid,
    }
  } else {
    existingBoardBids.push(bid)
  }

  existingBoardBids.sort((a, b) => Number(a.bidAmount || 0) - Number(b.bidAmount || 0))

  return {
    ...load,
    bidSummary: buildBidSummary(existingBoardBids),
    boardBids: existingBoardBids,
  }
}

export type LoadState = {
  // List state
  loads: Load[]
  total: number
  page: number
  limit: number
  
  // Single load state
  currentLoad: Load | null
  currentBids: Bid[]
  
  // Filters
  filters: {
    search: string
    status: LoadStatus | 'all'
    sortBy: string
    vehicleType: string
    loadDirection: 'all' | 'outbound' | 'inbound'
    isPublic: 'all' | 'true' | 'false'
    pickupCity: string
    deliveryCity: string
    dateField: 'pickupDate' | 'deliveryDate' | 'createdAt'
    dateFrom: string
    dateTo: string
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
  updating: boolean
  deleting: boolean
  assigning: boolean
  tracking: boolean
  
  // Error states
  error: string | null
  listError: string | null
  detailError: string | null
}

const initialState: LoadState = {
  loads: [],
  total: 0,
  page: 1,
  limit: 20,
  currentLoad: null,
  currentBids: [],
  filters: {
    search: '',
    status: 'all',
    sortBy: '-createdAt',
    vehicleType: '',
    loadDirection: 'all',
    isPublic: 'all',
    pickupCity: '',
    deliveryCity: '',
    dateField: 'pickupDate',
    dateFrom: '',
    dateTo: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  assigning: false,
  tracking: false,
  error: null,
  listError: null,
  detailError: null,
}

/**
 * Fetch paginated list of loads with filters
 */
export const fetchLoads = createAsyncThunk(
  'load/fetchLoads',
  async (
    params: {
      page?: number
      limit?: number
      search?: string
      status?: LoadStatus | 'all'
      material?: string
      sortBy?: string
      vehicleType?: string
      loadDirection?: 'all' | 'outbound' | 'inbound'
      isPublic?: 'all' | 'true' | 'false'
      pickupCity?: string
      deliveryCity?: string
      dateField?: 'pickupDate' | 'deliveryDate' | 'createdAt'
      dateFrom?: string
      dateTo?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await listLoads({
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search || undefined,
        status: params.status === 'all' ? undefined : (params.status as LoadStatus),
        material: params.material || undefined,
        sortBy: params.sortBy || '-createdAt',
        vehicleType: params.vehicleType || undefined,
        loadDirection: params.loadDirection === 'all' ? undefined : params.loadDirection,
        isPublic: params.isPublic === 'all' ? undefined : params.isPublic,
        pickupCity: params.pickupCity || undefined,
        deliveryCity: params.deliveryCity || undefined,
        dateField: params.dateField || 'pickupDate',
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
      })

      return {
        data: res.data,
        pagination: res.pagination,
      }
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch loads')
    }
  }
)

/**
 * Fetch single load with its bids
 */
export const fetchLoadDetails = createAsyncThunk(
  'load/fetchDetails',
  async (loadId: string, { rejectWithValue }) => {
    try {
      const res = await getLoad(loadId)
      return {
        load: res.data.load,
        bids: res.data.bids,
      }
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch load details')
    }
  }
)

/**
 * Create a new load
 */
export const createLoadAsync = createAsyncThunk(
  'load/create',
  async (payload: CreateLoadPayload, { rejectWithValue }) => {
    try {
      const res = await createLoad(payload)
      return res.data.load
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to create load')
    }
  }
)

/**
 * Update load details
 */
export const updateLoadAsync = createAsyncThunk(
  'load/update',
  async (
    { loadId, payload }: { loadId: string; payload: any },
    { rejectWithValue }
  ) => {
    try {
      const res = await updateLoad(loadId, payload)
      return res.data.load
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to update load')
    }
  }
)

/**
 * Delete a load
 */
export const deleteLoadAsync = createAsyncThunk(
  'load/delete',
  async (loadId: string, { rejectWithValue }) => {
    try {
      await deleteLoad(loadId)
      return loadId
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to delete load')
    }
  }
)

/**
 * Assign winning bid to load
 */
export const assignWinnerAsync = createAsyncThunk(
  'load/assignWinner',
  async (
    {
      loadId,
      bidId,
      allocatedVehicles,
      finalRate,
      rateType,
      notes,
    }: {
      loadId: string
      bidId: string
      allocatedVehicles?: number
      finalRate?: number
      rateType?: 'per_vehicle' | 'total'
      notes?: string
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await assignWinner({ loadId, bidId, allocatedVehicles, finalRate, rateType, notes })
      return {
        load: res.data.load,
        acceptedBid: res.data.acceptedBid,
        rejectedBidIds: res.data.rejectedBidIds,
      }
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to assign winner')
    }
  }
)

/**
 * Mark load as in transit
 */
export const markInTransitAsync = createAsyncThunk(
  'load/markInTransit',
  async (
    { loadId, actualPickupDate }: { loadId: string; actualPickupDate?: string | number },
    { rejectWithValue }
  ) => {
    try {
      const res = await markInTransit({ loadId, actualPickupDate })
      return res.data.load
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to mark in transit')
    }
  }
)

/**
 * Mark load as delivered
 */
export const markDeliveredAsync = createAsyncThunk(
  'load/markDelivered',
  async (
    {
      loadId,
      actualDeliveryDate,
      receiverName,
      receiverPhone,
      deliveryRemarks,
      deliveryProofFiles,
    }: {
      loadId: string
      actualDeliveryDate?: string | number
      receiverName?: string
      receiverPhone?: string
      deliveryRemarks?: string
      deliveryProofFiles?: File[]
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await markDelivered({
        loadId,
        actualDeliveryDate,
        receiverName,
        receiverPhone,
        deliveryRemarks,
        deliveryProofFiles,
      })
      return res.data.load
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to mark delivered')
    }
  }
)

const loadSlice = createSlice({
  name: 'load',
  initialState,
  reducers: {
    // Synchronous actions for filter updates
    setSearchFilter(state, action: PayloadAction<string>) {
      state.filters.search = action.payload
      state.pagination.page = 1
    },
    setStatusFilter(state, action: PayloadAction<LoadStatus | 'all'>) {
      state.filters.status = action.payload
      state.pagination.page = 1
    },
    setSortBy(state, action: PayloadAction<string>) {
      state.filters.sortBy = action.payload
      state.pagination.page = 1
    },
    clearFilters(state) {
      state.filters = {
        search: '',
        status: 'all',
        sortBy: '-createdAt',
        vehicleType: '',
        loadDirection: 'all',
        isPublic: 'all',
        pickupCity: '',
        deliveryCity: '',
        dateField: 'pickupDate',
        dateFrom: '',
        dateTo: '',
      }
      state.pagination.page = 1
    },
    setPage(state, action: PayloadAction<number>) {
      state.pagination.page = action.payload
    },
    setLimit(state, action: PayloadAction<number>) {
      state.pagination.limit = action.payload
      state.pagination.page = 1
    },
    clearError(state) {
      state.error = null
    },
    clearListError(state) {
      state.listError = null
    },
    clearDetailError(state) {
      state.detailError = null
    },
    clearCurrentLoad(state) {
      state.currentLoad = null
      state.currentBids = []
    },
    upsertRealtimeLoad(state, action: PayloadAction<Load>) {
      const load = action.payload
      const idx = state.loads.findIndex((l) => l._id === load._id)
      if (idx !== -1) {
        state.loads[idx] = load
      } else {
        state.loads.unshift(load)
        state.pagination.total += 1
      }

      if (state.currentLoad?._id === load._id) {
        state.currentLoad = load
      }
    },
    upsertRealtimeBid(state, action: PayloadAction<Bid>) {
      const bid = action.payload
      const idx = state.currentBids.findIndex((b) => b._id === bid._id)
      if (idx !== -1) {
        state.currentBids[idx] = bid
      } else if (
        state.currentLoad &&
        String(bid.loadId) === String(state.currentLoad._id)
      ) {
        state.currentBids.unshift(bid)
      }
    },
    applyRealtimeLoadAssignment(
      state,
      action: PayloadAction<{
        load: Load
        acceptedBid: Bid
        rejectedBidIds?: string[]
      }>
    ) {
      const { load, acceptedBid, rejectedBidIds = [] } = action.payload
      const idx = state.loads.findIndex((l) => l._id === load._id)
      if (idx !== -1) state.loads[idx] = load
      if (state.currentLoad?._id === load._id) state.currentLoad = load

      state.currentBids = state.currentBids.map((bid) => {
        if (bid._id === acceptedBid._id) return acceptedBid
        if (rejectedBidIds.includes(bid._id)) {
          return {
            ...bid,
            status: 'rejected',
            rejectionReason: bid.rejectionReason || 'Other bid accepted',
          }
        }
        return bid
      })
    },
    applyRealtimeBidToLoadList(state, action: PayloadAction<Bid>) {
      state.loads = state.loads.map((load) => applyRealtimeBidToLoad(load, action.payload))
    },
  },
  extraReducers: (builder) => {
    // Fetch Loads
    builder
      .addCase(fetchLoads.pending, (state) => {
        state.loading = true
        state.listError = null
      })
      .addCase(fetchLoads.fulfilled, (state, action) => {
        state.loading = false
        state.loads = action.payload.data
        state.pagination = action.payload.pagination
      })
      .addCase(fetchLoads.rejected, (state, action) => {
        state.loading = false
        state.listError = action.payload as string
      })

    // Fetch Load Details
    builder
      .addCase(fetchLoadDetails.pending, (state) => {
        state.loading = true
        state.detailError = null
      })
      .addCase(fetchLoadDetails.fulfilled, (state, action) => {
        state.loading = false
        state.currentLoad = action.payload.load
        state.currentBids = action.payload.bids
      })
      .addCase(fetchLoadDetails.rejected, (state, action) => {
        state.loading = false
        state.detailError = action.payload as string
      })

    // Create Load
    builder
      .addCase(createLoadAsync.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createLoadAsync.fulfilled, (state, action) => {
        state.creating = false
        state.loads.unshift(action.payload)
        state.pagination.total += 1
        state.currentLoad = action.payload
      })
      .addCase(createLoadAsync.rejected, (state, action) => {
        state.creating = false
        state.error = action.payload as string
      })

    // Update Load
    builder
      .addCase(updateLoadAsync.pending, (state) => {
        state.updating = true
        state.error = null
      })
      .addCase(updateLoadAsync.fulfilled, (state, action) => {
        state.updating = false
        // Update in list
        const idx = state.loads.findIndex((l) => l._id === action.payload._id)
        if (idx !== -1) {
          state.loads[idx] = action.payload
        }
        // Update current
        if (state.currentLoad?._id === action.payload._id) {
          state.currentLoad = action.payload
        }
      })
      .addCase(updateLoadAsync.rejected, (state, action) => {
        state.updating = false
        state.error = action.payload as string
      })

    // Delete Load
    builder
      .addCase(deleteLoadAsync.pending, (state) => {
        state.deleting = true
        state.error = null
      })
      .addCase(deleteLoadAsync.fulfilled, (state, action) => {
        state.deleting = false
        state.loads = state.loads.filter((l) => l._id !== action.payload)
        state.pagination.total -= 1
        if (state.currentLoad?._id === action.payload) {
          state.currentLoad = null
        }
      })
      .addCase(deleteLoadAsync.rejected, (state, action) => {
        state.deleting = false
        state.error = action.payload as string
      })

    // Assign Winner
    builder
      .addCase(assignWinnerAsync.pending, (state) => {
        state.assigning = true
        state.error = null
      })
      .addCase(assignWinnerAsync.fulfilled, (state, action) => {
        state.assigning = false
        const { load, acceptedBid, rejectedBidIds = [] } = action.payload
        
        // Update in list
        const idx = state.loads.findIndex((l) => l._id === load._id)
        if (idx !== -1) {
          state.loads[idx] = load
        }
        
        // Update current
        if (state.currentLoad?._id === load._id) {
          state.currentLoad = load
          state.currentBids = state.currentBids.map((b) => {
            if (b._id === acceptedBid._id) return acceptedBid
            if (rejectedBidIds.includes(b._id)) {
              return {
                ...b,
                status: 'rejected',
                rejectionReason: b.rejectionReason || 'Load fully allocated to other bids',
              }
            }
            return b
          })
        }
      })
      .addCase(assignWinnerAsync.rejected, (state, action) => {
        state.assigning = false
        state.error = action.payload as string
      })

    // Mark In Transit
    builder
      .addCase(markInTransitAsync.pending, (state) => {
        state.tracking = true
        state.error = null
      })
      .addCase(markInTransitAsync.fulfilled, (state, action) => {
        state.tracking = false
        const load = action.payload
        
        // Update in list
        const idx = state.loads.findIndex((l) => l._id === load._id)
        if (idx !== -1) {
          state.loads[idx] = load
        }
        
        // Update current
        if (state.currentLoad?._id === load._id) {
          state.currentLoad = load
        }
      })
      .addCase(markInTransitAsync.rejected, (state, action) => {
        state.tracking = false
        state.error = action.payload as string
      })

    // Mark Delivered
    builder
      .addCase(markDeliveredAsync.pending, (state) => {
        state.tracking = true
        state.error = null
      })
      .addCase(markDeliveredAsync.fulfilled, (state, action) => {
        state.tracking = false
        const load = action.payload
        
        // Update in list
        const idx = state.loads.findIndex((l) => l._id === load._id)
        if (idx !== -1) {
          state.loads[idx] = load
        }
        
        // Update current
        if (state.currentLoad?._id === load._id) {
          state.currentLoad = load
        }
      })
      .addCase(markDeliveredAsync.rejected, (state, action) => {
        state.tracking = false
        state.error = action.payload as string
      })
  },
})

export const {
  setSearchFilter,
  setStatusFilter,
  setSortBy,
  clearFilters,
  setPage,
  setLimit,
  clearError,
  clearListError,
  clearDetailError,
  clearCurrentLoad,
  upsertRealtimeLoad,
  upsertRealtimeBid,
  applyRealtimeLoadAssignment,
  applyRealtimeBidToLoadList,
} = loadSlice.actions

export default loadSlice.reducer
