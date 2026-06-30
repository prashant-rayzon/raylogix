import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchLoads,
  fetchLoadDetails,
  createLoadAsync,
  updateLoadAsync,
  deleteLoadAsync,
  assignWinnerAsync,
  markInTransitAsync,
  markDeliveredAsync,
  setSearchFilter,
  setStatusFilter,
  setPriorityFilter,
  setSortBy,
  clearFilters,
  setPage,
  setLimit,
  clearError,
  clearListError,
  clearDetailError,
  clearCurrentLoad,
} from '@/store/slices/loadSlice'
import type { LoadStatus } from '@/api/services/load/loads.service'
import type { CreateLoadPayload } from '@/api/services/load/loads.crud.service'

/**
 * Custom hook for managing loads
 * Provides access to Redux state and all load-related actions
 */
export const useLoadStore = () => {
  const dispatch = useAppDispatch()

  // State
  const loads = useAppSelector((state) => state.load.loads)
  const currentLoad = useAppSelector((state) => state.load.currentLoad)
  const currentBids = useAppSelector((state) => state.load.currentBids)
  const pagination = useAppSelector((state) => state.load.pagination)
  const filters = useAppSelector((state) => state.load.filters)
  const loading = useAppSelector((state) => state.load.loading)
  const creating = useAppSelector((state) => state.load.creating)
  const updating = useAppSelector((state) => state.load.updating)
  const deleting = useAppSelector((state) => state.load.deleting)
  const assigning = useAppSelector((state) => state.load.assigning)
  const tracking = useAppSelector((state) => state.load.tracking)
  const error = useAppSelector((state) => state.load.error)
  const listError = useAppSelector((state) => state.load.listError)
  const detailError = useAppSelector((state) => state.load.detailError)

  return {
    // State
    loads,
    currentLoad,
    currentBids,
    pagination,
    filters,
    loading,
    creating,
    updating,
    deleting,
    assigning,
    tracking,
    error,
    listError,
    detailError,

    // Actions
    listLoads: (params?: {
      page?: number
      limit?: number
      search?: string
      status?: LoadStatus | 'all'
      priority?: string | 'all'
      sortBy?: string
    }) => dispatch(fetchLoads(params || {})),

    getLoadDetails: (loadId: string) => dispatch(fetchLoadDetails(loadId)),

    createLoad: (payload: CreateLoadPayload) => dispatch(createLoadAsync(payload)),

    updateLoad: (loadId: string, payload: any) =>
      dispatch(updateLoadAsync({ loadId, payload })),

    deleteLoad: (loadId: string) => dispatch(deleteLoadAsync(loadId)),

    assignWinner: (
      loadId: string,
      bidId: string,
      allocatedVehicles?: number,
      finalRate?: number,
      rateType?: 'per_vehicle' | 'total',
      notes?: string
    ) => dispatch(assignWinnerAsync({ loadId, bidId, allocatedVehicles, finalRate, rateType, notes })),

    markInTransit: (loadId: string, actualPickupDate?: string | number) =>
      dispatch(markInTransitAsync({ loadId, actualPickupDate })),

    markDelivered: (
      loadId: string,
      actualDeliveryDate?: string | number,
      deliveryProof?: string
    ) => dispatch(markDeliveredAsync({ loadId, actualDeliveryDate, deliveryProof })),

    // Filters
    setSearchFilter: (search: string) => dispatch(setSearchFilter(search)),
    setStatusFilter: (status: LoadStatus | 'all') => dispatch(setStatusFilter(status)),
    setPriorityFilter: (priority: string) => dispatch(setPriorityFilter(priority)),
    setSortBy: (sortBy: string) => dispatch(setSortBy(sortBy)),
    clearFilters: () => dispatch(clearFilters()),

    // Pagination
    setPage: (page: number) => dispatch(setPage(page)),
    setLimit: (limit: number) => dispatch(setLimit(limit)),

    // Error handling
    clearError: () => dispatch(clearError()),
    clearListError: () => dispatch(clearListError()),
    clearDetailError: () => dispatch(clearDetailError()),
    clearCurrentLoad: () => dispatch(clearCurrentLoad()),
  }
}
