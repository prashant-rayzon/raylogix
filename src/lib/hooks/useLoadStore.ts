import { useCallback, useMemo } from 'react'
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

  const listLoadsAction = useCallback((params?: {
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
  }) => dispatch(fetchLoads(params || {})), [dispatch])

  const getLoadDetailsAction = useCallback((loadId: string) => dispatch(fetchLoadDetails(loadId)), [dispatch])
  const createLoadAction = useCallback((payload: CreateLoadPayload) => dispatch(createLoadAsync(payload)), [dispatch])
  const updateLoadAction = useCallback((loadId: string, payload: any) => dispatch(updateLoadAsync({ loadId, payload })), [dispatch])
  const deleteLoadAction = useCallback((loadId: string) => dispatch(deleteLoadAsync(loadId)), [dispatch])
  const assignWinnerAction = useCallback((
    loadId: string,
    bidId: string,
    allocatedVehicles?: number,
    finalRate?: number,
    rateType?: 'per_vehicle' | 'total',
    notes?: string
  ) => dispatch(assignWinnerAsync({ loadId, bidId, allocatedVehicles, finalRate, rateType, notes })), [dispatch])
  const markInTransitAction = useCallback((loadId: string, actualPickupDate?: string | number) =>
    dispatch(markInTransitAsync({ loadId, actualPickupDate })), [dispatch])
  const markDeliveredAction = useCallback((
    loadId: string,
    actualDeliveryDate?: string | number,
    receiverName?: string,
    receiverPhone?: string,
    deliveryRemarks?: string,
    deliveryProofFiles?: File[]
  ) => dispatch(markDeliveredAsync({
    loadId,
    actualDeliveryDate,
    receiverName,
    receiverPhone,
    deliveryRemarks,
    deliveryProofFiles,
  })), [dispatch])
  const setSearchFilterAction = useCallback((search: string) => dispatch(setSearchFilter(search)), [dispatch])
  const setStatusFilterAction = useCallback((status: LoadStatus | 'all') => dispatch(setStatusFilter(status)), [dispatch])
  const setSortByAction = useCallback((sortBy: string) => dispatch(setSortBy(sortBy)), [dispatch])
  const clearFiltersAction = useCallback(() => dispatch(clearFilters()), [dispatch])
  const setPageAction = useCallback((page: number) => dispatch(setPage(page)), [dispatch])
  const setLimitAction = useCallback((limit: number) => dispatch(setLimit(limit)), [dispatch])
  const clearErrorAction = useCallback(() => dispatch(clearError()), [dispatch])
  const clearListErrorAction = useCallback(() => dispatch(clearListError()), [dispatch])
  const clearDetailErrorAction = useCallback(() => dispatch(clearDetailError()), [dispatch])
  const clearCurrentLoadAction = useCallback(() => dispatch(clearCurrentLoad()), [dispatch])

  return useMemo(() => ({
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
    listLoads: listLoadsAction,
    getLoadDetails: getLoadDetailsAction,
    createLoad: createLoadAction,
    updateLoad: updateLoadAction,
    deleteLoad: deleteLoadAction,
    assignWinner: assignWinnerAction,
    markInTransit: markInTransitAction,
    markDelivered: markDeliveredAction,

    // Filters
    setSearchFilter: setSearchFilterAction,
    setStatusFilter: setStatusFilterAction,
    setSortBy: setSortByAction,
    clearFilters: clearFiltersAction,

    // Pagination
    setPage: setPageAction,
    setLimit: setLimitAction,

    // Error handling
    clearError: clearErrorAction,
    clearListError: clearListErrorAction,
    clearDetailError: clearDetailErrorAction,
    clearCurrentLoad: clearCurrentLoadAction,
  }), [
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
    listLoadsAction,
    getLoadDetailsAction,
    createLoadAction,
    updateLoadAction,
    deleteLoadAction,
    assignWinnerAction,
    markInTransitAction,
    markDeliveredAction,
    setSearchFilterAction,
    setStatusFilterAction,
    setSortByAction,
    clearFiltersAction,
    setPageAction,
    setLimitAction,
    clearErrorAction,
    clearListErrorAction,
    clearDetailErrorAction,
    clearCurrentLoadAction,
  ])
}
