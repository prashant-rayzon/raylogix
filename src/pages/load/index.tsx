import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isValid } from 'date-fns'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  Pencil,
  Filter,
  Gavel,
  Layers3,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'

import { Button } from '@/components/custom/button'
import { Layout } from '@/components/custom/layout'
import { CreateLoadModal } from '@/components/load/CreateLoadModal'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLoadStore } from '@/lib/hooks/useLoadStore'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  applyRealtimeBidToLoadList,
  applyRealtimeLoadAssignment,
  fetchLoads,
  upsertRealtimeLoad,
} from '@/store/slices/loadSlice'
import type { Bid, Load, LoadStatus } from '@/api/services/load/loads.service'
import { mastersService } from '@/api/services/masters/masters.service'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { hasPermission, ALL_PERMISSIONS } from '@/lib/permissions'

type LoadDirectionFilter = 'all' | 'outbound' | 'inbound'
type PublicFilter = 'all' | 'true' | 'false'
type DateFieldFilter = 'pickupDate' | 'deliveryDate' | 'createdAt'
type LoadBoardStatus = LoadStatus | 'all' | 'allocated_pending'

interface ModalConfig {
  open: boolean
  mode: 'create' | 'edit'
  loadId?: string
  initialData?: any
}

interface AssignDialogState {
  open: boolean
  load: Load | null
  bid: Bid | null
}

interface CancelDialogState {
  open: boolean
  load: Load | null
}

const bidChipStyles: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-slate-200 bg-slate-100 text-slate-400 line-through decoration-slate-300',
}

const formatMoney = (amount?: number | null) =>
  typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : '--'

const formatLoadDate = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  return isValid(date) ? format(date, 'dd MMM') : '--'
}

const formatLoadTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  return isValid(date) ? format(date, 'hh:mm a') : '--'
}

const formatFullAddress = (location?: any) => {
  if (!location) return '--'
  const parts = [location.address, location.city, location.state, location.zipCode].filter(Boolean)
  return parts.join(', ') || '--'
}

function useLoadMasterOptions() {
  const [productOptions, setProductOptions] = useState<Array<{ value: string; label: string }>>([])
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        const [products, vehicleTypes] = await Promise.all([
          mastersService.listByGroupCode('MATERIAL'),
          mastersService.listByGroupCode('VEHICLE_TYPE'),
        ])

        if (!mounted) return

        setProductOptions(
          products.map((item) => ({
            value: item.value?.trim() || item.name,
            label: item.name,
          }))
        )

        setVehicleTypeOptions(
          vehicleTypes.map((item) => ({
            value: item.value?.trim() || item.name,
            label: item.name,
          }))
        )
      } catch (error) {
        console.error('Failed to load master filters', error)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [])

  return { productOptions, vehicleTypeOptions }
}

export default function Loads() {
  const dispatch = useAppDispatch()
  const userRole = useAppSelector((state: any) => state.auth.user?.role)
  const authUser = useAppSelector((state: any) => state.auth.user)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { socket } = useNotifications()

  // Permissions
  const hasLoadRead = hasPermission(authUser, 'load.read')
  const canOutbound = (!authUser?.team || authUser.team === 'general' || authUser.team === 'outbound') && (hasLoadRead || hasPermission(authUser, 'outbound.read'))
  const canInbound = (!authUser?.team || authUser.team === 'general' || authUser.team === 'inbound') && (hasLoadRead || hasPermission(authUser, 'inbound.read'))
  
  // Get status tabs based on permissions
  const statusTabs = useMemo(() => {
    const tabs: Array<{ value: LoadBoardStatus; label: string }> = [
      { value: 'all', label: 'All' }
    ]

    // Show 'Open' if user can create loads
    if (hasPermission(authUser, 'load.create') || 
        hasPermission(authUser, 'outbound.create') || 
        hasPermission(authUser, 'inbound.create')) {
      tabs.push({ value: 'open', label: 'Open' })
    }

    // Show 'Confirmed' if user can read loads
    if (hasPermission(authUser, 'load.read') || 
        hasPermission(authUser, 'outbound.read') || 
        hasPermission(authUser, 'inbound.read')) {
      tabs.push({ value: 'allocated_pending', label: 'Confirmed' })
    }

    // Show 'Cancelled' if user can delete/cancel loads
    if (hasPermission(authUser, 'load.delete') || 
        hasPermission(authUser, 'load.cancel')) {
      tabs.push({ value: 'canceled', label: 'Cancelled' })
    }

    return tabs
  }, [authUser])

  // Default load direction based on permissions
  const defaultLoadDirection = useMemo<LoadDirectionFilter>(() => {
    if (canOutbound && canInbound) return 'all'
    if (canOutbound) return 'outbound'
    if (canInbound) return 'inbound'
    return 'all'
  }, [canOutbound, canInbound])

  // State declarations
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ open: false, mode: 'create' })
  const [assignDialog, setAssignDialog] = useState<AssignDialogState>({
    open: false,
    load: null,
    bid: null,
  })
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState>({
    open: false,
    load: null,
  })
  const [assignVehicleCount, setAssignVehicleCount] = useState('1')
  const [assignRate, setAssignRate] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LoadBoardStatus>('all')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [product, setProduct] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [loadDirection, setLoadDirection] = useState<LoadDirectionFilter>(defaultLoadDirection)
  const [isPublic, setIsPublic] = useState<PublicFilter>('all')
  const [pickupCity, setPickupCity] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [dateField, setDateField] = useState<DateFieldFilter>('pickupDate')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  
  const { productOptions, vehicleTypeOptions } = useLoadMasterOptions()

  const {
    loads,
    pagination,
    loading,
    assigning,
    deleting,
    listError,
    clearListError,
    assignWinner,
    deleteLoad,
    setPage,
    setLimit,
  } = useLoadStore()

  // Update loadDirection when permissions change
  useEffect(() => {
    setLoadDirection(defaultLoadDirection)
  }, [defaultLoadDirection])

  const apiLoadDirection = useMemo(() => {
    if (canOutbound && canInbound) {
      return loadDirection === 'all' ? undefined : loadDirection
    }
    if (canOutbound) return 'outbound'
    if (canInbound) return 'inbound'
    return undefined
  }, [loadDirection, canOutbound, canInbound])

  const filterParams = useMemo(() => ({
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    status: status === 'all' ? undefined : (status === 'allocated_pending' ? ('assigned,in_transit,delivered' as any) : status),
    material: product || undefined,
    sortBy,
    vehicleType: vehicleType || undefined,
    loadDirection: apiLoadDirection,
    isPublic: isPublic === 'all' ? undefined : isPublic,
    pickupCity: pickupCity || undefined,
    deliveryCity: deliveryCity || undefined,
    dateField,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [
    pagination.page,
    pagination.limit,
    search,
    status,
    product,
    sortBy,
    vehicleType,
    apiLoadDirection,
    isPublic,
    pickupCity,
    deliveryCity,
    dateField,
    dateFrom,
    dateTo,
  ])

  useEffect(() => {
    dispatch(fetchLoads(filterParams))
  }, [dispatch, filterParams])

  useEffect(() => {
    const pollingInterval = setInterval(() => {
      dispatch(fetchLoads(filterParams))
    }, 90000)

    return () => clearInterval(pollingInterval)
  }, [dispatch, filterParams])

  const displayedLoads = loads

  useEffect(() => {
    if (!socket) return

    const handleLoadUpsert = (payload: { load?: Load }) => {
      if (!payload?.load) return
      dispatch(upsertRealtimeLoad(payload.load))
    }

    const handleLoadAssigned = (payload: { load?: Load; acceptedBid?: Bid; rejectedBidIds?: string[] }) => {
      if (!payload?.load || !payload?.acceptedBid) return
      dispatch(
        applyRealtimeLoadAssignment({
          load: payload.load,
          acceptedBid: payload.acceptedBid,
          rejectedBidIds: payload.rejectedBidIds,
        })
      )
    }

    const handleBidEvent = (payload: { bid?: Bid }) => {
      if (!payload?.bid) return
      dispatch(applyRealtimeBidToLoadList(payload.bid))
    }

    socket.on('load:new', handleLoadUpsert)
    socket.on('load:updated', handleLoadUpsert)
    socket.on('load:status-changed', handleLoadUpsert)
    socket.on('load:assigned', handleLoadAssigned)
    socket.on('bid:created', handleBidEvent)
    socket.on('bid:updated', handleBidEvent)

    return () => {
      socket.off('load:new', handleLoadUpsert)
      socket.off('load:updated', handleLoadUpsert)
      socket.off('load:status-changed', handleLoadUpsert)
      socket.off('load:assigned', handleLoadAssigned)
      socket.off('bid:created', handleBidEvent)
      socket.off('bid:updated', handleBidEvent)
    }
  }, [dispatch, socket])

  useEffect(() => {
    if (!listError) return
    toast({
      title: 'Failed to load loads',
      description: listError,
      variant: 'destructive',
    })
    clearListError()
  }, [clearListError, listError, toast])

  const handleSearch = async () => {
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    setSortBy('-createdAt')
    setProduct('')
    setVehicleType('')
    setLoadDirection('all')
    setIsPublic('all')
    setPickupCity('')
    setDeliveryCity('')
    setDateField('pickupDate')
    setDateFrom('')
    setDateTo('')
    setLimit(10)
    setPage(1)
  }

  const toggleRow = (loadId: string) => {
    setExpandedRows((prev) => ({ ...prev, [loadId]: !prev[loadId] }))
  }

  const isAdminUser = userRole === 'company_admin' || userRole === 'company_user'
  const showCompanyOnlyColumns = isAdminUser
  const canEditLoad = hasPermission(authUser ?? null, ALL_PERMISSIONS.LOAD_UPDATE)
  const canCancelLoad = hasPermission(authUser ?? null, ALL_PERMISSIONS.LOAD_DELETE)
  const canPrev = pagination.page > 1
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.limit))
  const canNext = pagination.page < pages

  const openAssignDialog = (load: Load, bid: Bid) => {
    const remainingLoadVehicles = Math.max(1, Number(load.remainingVehicles || load.numberOfVehicles || 1))
    const remainingBidVehicles = Math.max(
      1,
      Number((bid as any).vehiclesOffered || 1) - Number((bid as any).allocatedVehicles || 0)
    )
    const suggested = Math.max(1, Math.min(remainingLoadVehicles, remainingBidVehicles))

    setAssignVehicleCount(String(suggested))
    setAssignRate(String(bid.bidAmount || ''))
    setAssignDialog({ open: true, load, bid })
  }

  const handleAssignBid = async () => {
    if (!assignDialog.load?._id || !assignDialog.bid?._id) return

    await assignWinner(
      assignDialog.load._id,
      assignDialog.bid._id,
      Number(assignVehicleCount || 1),
      Number(assignRate || assignDialog.bid.bidAmount || 0) || undefined
    )

    setAssignDialog({ open: false, load: null, bid: null })
  }

  const openEditModal = (load: Load) => {
    setModalConfig({
      open: true,
      mode: 'edit',
      loadId: load._id,
      initialData: {
        loadNumber: load.loadNumber,
        loadDirection: load.loadDirection || 'outbound',
        isPublic: load.isPublic ?? true,
        allowedTransporters: load.allowedTransporters || [],
        material: load.material || '',
        vehicleType: load.vehicleType || '',
        numberOfVehicles: load.numberOfVehicles || 1,
        estimatedWeight: load.estimatedWeight,
        pickupLocationId: load.pickupLocation?.branchId || '',
        pickupDate: load.pickupDate,
        pickupAddressText: load.pickupLocation?.branchId ? '' : load.pickupLocation?.address || '',
        pickupLocationDetails: load.pickupLocation?.branchId ? undefined : (load.pickupLocation ? {
          id: '',
          label: load.pickupLocation.branchName || 'Custom Address',
          address: load.pickupLocation.address || '',
          city: load.pickupLocation.city || '',
          state: load.pickupLocation.state || '',
          zipCode: load.pickupLocation.zipCode || '',
          latitude: load.pickupLocation.coordinates?.latitude || 0,
          longitude: load.pickupLocation.coordinates?.longitude || 0,
          placeId: (load.pickupLocation as any).placeId || '',
        } : undefined),
        deliveryLocationId: load.deliveryLocation?.branchId || '',
        deliveryDate: load.deliveryDate,
        deliveryAddressText: load.deliveryLocation?.branchId ? '' : load.deliveryLocation?.address || '',
        deliveryLocationDetails: load.deliveryLocation?.branchId ? undefined : (load.deliveryLocation ? {
          id: '',
          label: load.deliveryLocation.branchName || 'Custom Address',
          address: load.deliveryLocation.address || '',
          city: load.deliveryLocation.city || '',
          state: load.deliveryLocation.state || '',
          zipCode: load.deliveryLocation.zipCode || '',
          latitude: load.deliveryLocation.coordinates?.latitude || 0,
          longitude: load.deliveryLocation.coordinates?.longitude || 0,
          placeId: (load.deliveryLocation as any).placeId || '',
        } : undefined),
        tat: load.tat || '',
        dpNum: load.dpNum || '',
        notes: load.notes || '',
        attachments: [],
        existingAttachments: load.attachments || [],
        routeOptimization: Boolean(load.routeData),
        routeData: load.routeData,
      },
    })
  }

  const openCancelDialog = (load: Load) => {
    setCancelDialog({
      open: true,
      load,
    })
  }

  const handleCancelLoad = async () => {
    if (!cancelDialog.load?._id) return

    try {
      await deleteLoad(cancelDialog.load._id).unwrap()
      toast({
        title: 'Load canceled',
        description: `Load ${cancelDialog.load.loadNumber} canceled successfully.`,
      })
      setCancelDialog({ open: false, load: null })
    } catch (error: any) {
      toast({
        title: 'Cancel failed',
        description: getApiErrorMessage(error, 'Failed to cancel load'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Layout>
      <Layout.Header sticky>
        <div className='flex w-full items-center justify-between'>
          <div />
          <div className='flex items-center gap-3'>
            <ThemeSwitch />
            <UserNav />
          </div>
        </div>
      </Layout.Header>

      <Layout.Body>
        <div className='mx-auto '>

          <Card className='rounded-xl border bg-card text-card-foreground overflow-hidden border-border/50 shadow-sm'>
            <CardContent className='p-0'>
              <div className='flex flex-col gap-3 rounded-[22px]   px-4 py-3  lg:flex-row lg:items-end lg:justify-between'>
                <div className='min-w-0'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'>Load States</p>
                  <div className='mt-2 flex flex-wrap items-end gap-1 border-b '>
                    {statusTabs.map((tab) => {
                      const active = status === tab.value

                      return (
                        <button
                          key={tab.value}
                          onClick={() => {
                            setStatus(tab.value)
                            setPage(1)
                          }}
                          className={cn(
                            'relative -mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition',
                            active
                              ? 'border-[#0f766e] text-[#0f766e]'
                              : 'border-transparent text-slate-500 hover:text-slate-900'
                          )}
                        >
                          <span>{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className='border-b border-slate-200 px-3 py-2'>
                <div className='flex justify-between'>
                  <div className='flex min-w-0 items-start gap-3'>
                    <div className='mt-0.5 rounded-xl bg-[#0f766e]/10 p-2 text-[#0f766e]'>
                      <Layers3 className='h-4 w-4' />
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2 py-1'>
                      <div className='relative w-[320px]'>
                        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && void handleSearch()}
                          placeholder='Search load request, vehicle, driver'
                          className='h-8 rounded-2xl border-slate-200 bg-white pl-10 text-sm shadow-sm'
                        />
                      </div>
                      <Select
                        value={status}
                        onValueChange={(value) => {
                          setStatus(value as LoadBoardStatus)
                          setPage(1)
                        }}
                      >
                        <SelectTrigger className='h-8 w-[160px] rounded-2xl border-slate-200 bg-white text-sm shadow-sm'>
                          <SelectValue placeholder='All statuses' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All statuses</SelectItem>
                          <SelectItem value='open'>Open</SelectItem>
                          <SelectItem value='allocated_pending'>Confirmed</SelectItem>
                          <SelectItem value='canceled'>Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      {(!authUser?.team || authUser.team === 'general') && (hasPermission(authUser, 'outbound.read') || hasPermission(authUser, 'inbound.read')) && (
                        <Select value={loadDirection} onValueChange={(value) => setLoadDirection(value as LoadDirectionFilter)}>
                          <SelectTrigger className='h-8 w-[190px] rounded-2xl border-slate-200 bg-white text-sm shadow-sm'>
                            <SelectValue placeholder='All load requirements' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='all'>All load requirements</SelectItem>
                            <SelectItem value='outbound'>Outbound loads</SelectItem>
                            <SelectItem value='inbound'>Inbound loads</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <DatePickerWithRange
                        value={{ from: dateFrom, to: dateTo }}
                        onChange={({ from, to }) => {
                          setDateFrom(from)
                          setDateTo(to)
                        }}
                      />
                      <Button
                        className='h-8 gap-1.5 rounded-2xl px-3 text-sm bg-white text-[#0b5f59]'
                        onClick={() => setShowAdvancedFilters((value) => !value)}
                      >
                        <Filter className='h-4 w-4' />
                        Advanced Search
                      </Button>

                      <Button
                        variant='outline'
                        className='h-8 rounded-2xl border-slate-200 bg-white px-3 text-sm shadow-sm'
                        onClick={handleClearFilters}
                      >
                        Clear
                      </Button>
                      {(hasPermission(authUser, 'load.create') || hasPermission(authUser, 'outbound.create') || hasPermission(authUser, 'inbound.create')) && (
                        <Button
                          onClick={() => setModalConfig({ open: true, mode: 'create' })}
                          className='h-8 gap-1 rounded-2xl px-3 text-sm text-white hover:bg-[#0b5f59]'
                        >
                          <Plus className='mr-1.5 h-4 w-4' />
                          New Entry
                        </Button>
                      )}
                     </div>
                  </div>
                </div>

              {showAdvancedFilters && (
                <div className='border-b border-slate-200 bg-slate-50/60 px-5 py-4'>
                  <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-6'>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-medium text-slate-700'>Product</label>
                      <Select value={product || 'all'} onValueChange={(value) => setProduct(value === 'all' ? '' : value)}>
                        <SelectTrigger className='h-8 rounded-2xl text-sm'>
                          <SelectValue placeholder='All products' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All products</SelectItem>
                          {productOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-medium text-slate-700'>Vehicle type</label>
                      <Select value={vehicleType || 'all'} onValueChange={(value) => setVehicleType(value === 'all' ? '' : value)}>
                        <SelectTrigger className='h-8 rounded-2xl text-sm'>
                          <SelectValue placeholder='All vehicle types' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All vehicle types</SelectItem>
                          {vehicleTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-medium text-slate-700'>Pickup city</label>
                      <Input
                        value={pickupCity}
                        onChange={(event) => setPickupCity(event.target.value)}
                        placeholder='Surat'
                        className='h-8 rounded-2xl text-sm'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-medium text-slate-700'>Delivery city</label>
                      <Input
                        value={deliveryCity}
                        onChange={(event) => setDeliveryCity(event.target.value)}
                        placeholder='Mumbai'
                        className='h-8 rounded-2xl text-sm'
                      />
                    </div>
                    {(!authUser?.team || authUser.team === 'general') && (
                      <div className='space-y-1.5'>
                        <label className='text-xs font-medium text-slate-700'>Load direction</label>
                        <Select value={loadDirection} onValueChange={(value) => setLoadDirection(value as LoadDirectionFilter)}>
                          <SelectTrigger className='h-8 rounded-2xl text-sm'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='all'>All directions</SelectItem>
                            <SelectItem value='outbound'>Outbound</SelectItem>
                            <SelectItem value='inbound'>Inbound</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className='space-y-1.5'>
                      <label className='text-xs font-medium text-slate-700'>Visibility</label>
                      <Select value={isPublic} onValueChange={(value) => setIsPublic(value as PublicFilter)}>
                        <SelectTrigger className='h-8 rounded-2xl text-sm'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>All loads</SelectItem>
                          <SelectItem value='true'>Public only</SelectItem>
                          <SelectItem value='false'>Private only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className='overflow-x-auto h-[67vh]'>
                <table className='w-full min-w-[900px] border-collapse text-sm'>
                  <thead>
                    <tr className='border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400'>
                      <th className='px-3 py-2 text-left'>Load / Route</th>
                      <th className='px-3 py-2 text-left'>Schedule</th>
                      <th className='px-3 py-2 text-left'>Vehicle & Product</th>
                      {showCompanyOnlyColumns ? <th className='px-3 py-2 text-left'>Bids</th> : null}
                      {showCompanyOnlyColumns ? <th className='px-3 py-2 text-left'>Transporters</th> : null}
                      <th className='px-3 py-2 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={showCompanyOnlyColumns ? 6 : 4} className='px-3 py-2'>
                            <div className='h-8 animate-pulse rounded-xl bg-slate-100' />
                          </td>
                        </tr>
                      ))
                    ) : displayedLoads.length === 0 ? (
                      <tr>
                        <td colSpan={showCompanyOnlyColumns ? 6 : 4} className='px-6 py-16 text-center'>
                          <div className='flex flex-col items-center gap-3'>
                            <div className='rounded-full bg-slate-50 p-4'>
                              <Package className='h-8 w-8 text-slate-400' />
                            </div>
                            <div>
                              <p className='text-sm font-semibold text-slate-700'>No loads found for these filters</p>
                              <p className='mt-1 text-xs text-slate-500'>Try another date range, status, or route search.</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedLoads.map((load) => {
                        const boardBids = Array.isArray(load.boardBids) ? load.boardBids : []
                        const pendingBids = boardBids.filter((bid) => bid.status === 'pending')
                        const isExpanded = !!expandedRows[load._id]
                        const bestBid = load.bidSummary?.lowestBid
                        const totalBids = load.bidSummary?.totalBids || 0
                        const activeBids = load.bidSummary?.activeBids || 0
                        const inlineBids = boardBids.slice(0, 2)
                        const overflowCount = boardBids.length - inlineBids.length

                        return (
                          <Fragment key={load._id}>
                            <tr className='group align-top hover:bg-slate-50/60'>
                              {/* Load / Route */}
                              <td className='px-3 py-2'>
                                <div className='flex flex-wrap items-center gap-1.5'>
                                  <button
                                    onClick={() => navigate(`/load/${load._id}`)}
                                    className='flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-[#0f766e]'
                                  >
                                    {load.loadNumber || 'Unknown load'}
                                    <ArrowUpRight className='h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100' />
                                  </button>
                                  <Badge
                                    variant='outline'
                                    className={cn(
                                      'rounded-full border px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                      load.status === 'open' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
                                      load.status === 'assigned' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
                                      load.status === 'in_transit' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
                                      load.status === 'delivered' && 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
                                      load.status === 'canceled' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                                    )}
                                  >
                                    {load.status === 'assigned'
                                      ? 'Assigned'
                                      : load.status === 'in_transit'
                                        ? 'In Transit'
                                        : load.status === 'canceled'
                                          ? 'Cancelled'
                                          : load.status === 'delivered'
                                            ? 'Delivered'
                                            : load.status}
                                  </Badge>
                                </div>
                                <div className='mt-0.5 flex gap-1 text-xs text-slate-500'>
                                  <div className='flex items-center gap-1'>
                                    <MapPin className='h-3 w-3 shrink-0 text-slate-400' />
                                    <span title={formatFullAddress(load.pickupLocation)}>
                                      {load.pickupLocation?.branchName || '--'}
                                    </span>
                                  </div>
                                  <div className='flex items-center gap-1 pl-3.5'>
                                    <span className='text-slate-300'>→</span>
                                    <span title={formatFullAddress(load.deliveryLocation)}>
                                      {load.deliveryLocation?.branchName || '--'}
                                    </span>
                                  </div>
                                  <div className='text-slate-400 text-[11px]'>
                                    {formatFullAddress(load.deliveryLocation)}
                                  </div>
                                  <span className='text-slate-300'>•</span>
                                  <span>{load.isPublic === false ? 'Private' : 'Public'}</span>
                                </div>
                              </td>

                              {/* Schedule */}
                              <td className='whitespace-nowrap px-3 py-2 text-sm text-slate-700'>
                                <p className='font-medium text-slate-900'>{formatLoadDate(load.pickupDate)}</p>
                                <p className='text-xs text-slate-500'>Pickup {formatLoadTime(load.pickupDate)}</p>
                              </td>

                              {/* Vehicle & Product */}
                              <td className='whitespace-nowrap px-3 py-2 text-sm text-slate-700'>
                                <div className='flex items-center gap-1.5'>
                                  <Truck className='h-3.5 w-3.5 shrink-0 text-slate-400' />
                                  <span className='font-medium text-slate-900'>{load.vehicleType || 'Not specified'}</span>
                                </div>
                                <div className='mt-0.5 flex items-center gap-1.5 text-xs text-slate-500'>
                                  <Package className='h-3 w-3 shrink-0 text-slate-400' />
                                  <span>
                                    {load.material || 'Product N/A'} • {load.numberOfVehicles || 0} veh
                                  </span>
                                </div>
                              </td>

                              {showCompanyOnlyColumns ? (
                                <>
                                  {/* Bids summary */}
                                  <td className='whitespace-nowrap px-3 py-2 text-sm'>
                                    <p className='font-semibold text-[#0f766e]'>{formatMoney(bestBid)}</p>
                                    <p className='text-xs text-slate-500'>
                                      {totalBids} total • {activeBids} active
                                    </p>
                                  </td>

                                  {/* Transporter chips (compact, inline) */}
                                  <td className='px-3 py-2'>
                                    {boardBids.length === 0 ? (
                                      <span className='text-xs text-slate-400'>No bids yet</span>
                                    ) : (
                                      <div className='flex flex-wrap items-center gap-1.5'>
                                        {inlineBids.map((bidItem) => {
                                          const transporterName =
                                            bidItem.transporter?.transporterName || bidItem.transporter?.email || 'Transporter'
                                          return (
                                            <span
                                              key={bidItem._id}
                                              title={`${transporterName} • ${formatMoney(bidItem.bidAmount)} • ${bidItem.status}`}
                                              className={cn(
                                                'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-0.5 text-[11px] font-medium',
                                                bidChipStyles[bidItem.status] || 'border-slate-200 bg-slate-50 text-slate-600'
                                              )}
                                            >
                                              <span>{transporterName.split('@')[0]}</span>
                                              <span className='opacity-70'>{formatMoney(bidItem.bidAmount)}</span>
                                            </span>
                                          )
                                        })}
                                        {overflowCount > 0 && (
                                          <button
                                            onClick={() => toggleRow(load._id)}
                                            className='inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#0f766e]/40 hover:text-[#0f766e]'
                                          >
                                            +{overflowCount} more
                                            <ChevronDown className={cn('h-3 w-3 transition', isExpanded && 'rotate-180')} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </>
                              ) : null}

                              {/* Actions */}
                              <td className='whitespace-nowrap px-3 py-2 text-right'>
                                <div className='flex items-center justify-end gap-2'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    className='h-8 w-8 rounded-full border-slate-200 p-0 text-xs'
                                    onClick={() => navigate(`/load/${load._id}`)}
                                    title='View details'
                                    aria-label='View load details'
                                  >
                                    <Eye className='h-3.5 w-3.5' />
                                  </Button>
                                  {showCompanyOnlyColumns && canEditLoad ? (
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      className='h-8 w-8 rounded-full border-slate-200 p-0 text-xs'
                                      onClick={() => openEditModal(load)}
                                      title='Edit load'
                                      aria-label='Edit load'
                                    >
                                      <Pencil className='h-3.5 w-3.5' />
                                    </Button>
                                  ) : null}
                                  {showCompanyOnlyColumns && canCancelLoad && load.status === 'open' ? (
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      className='h-8 w-8 rounded-full border-red-200 p-0 text-xs text-red-600 hover:bg-red-50 hover:text-red-700'
                                      onClick={() => openCancelDialog(load)}
                                      title='Cancel load'
                                      aria-label='Cancel load'
                                    >
                                      <Trash2 className='h-3.5 w-3.5' />
                                    </Button>
                                  ) : null}
                                  {pendingBids[0] && isAdminUser && load.status === 'open' ? (
                                    <Button
                                      size='sm'
                                      className='h-8 w-8 rounded-full bg-[#0f766e] p-0 text-xs hover:bg-[#0b5f59]'
                                      onClick={() => openAssignDialog(load, pendingBids[0])}
                                      title='Assign bid'
                                      aria-label='Assign bid'
                                    >
                                      <Gavel className='h-3.5 w-3.5' />
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>

                            {/* ── Expanded transporter detail ── */}
                            {showCompanyOnlyColumns && isExpanded && boardBids.length > 0 && (
                              <tr>
                                <td colSpan={6} className='bg-slate-50/70 px-3 py-2'>
                                  <div className='grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3'>
                                    {boardBids.map((bidItem) => {
                                      const transporterName =
                                        bidItem.transporter?.transporterName || bidItem.transporter?.email || 'Transporter'
                                      return (
                                        <div
                                          key={bidItem._id}
                                          className='flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs'
                                        >
                                          <div className='min-w-0'>
                                            <p className='truncate font-medium text-slate-900'>{transporterName}</p>
                                            <p className='text-[11px] text-slate-500'>
                                              Delivery {formatLoadDate(bidItem.estimatedDeliveryDate)}
                                            </p>
                                          </div>
                                          <div className='flex shrink-0 items-center gap-2'>
                                            <span className='font-semibold text-[#0f766e]'>{formatMoney(bidItem.bidAmount)}</span>
                                            {isAdminUser && bidItem.status === 'pending' && load.status === 'open' ? (
                                              <Button
                                                size='sm'
                                                className='h-6 rounded-full bg-slate-900 px-3 text-[10px] hover:bg-slate-800'
                                                onClick={() => openAssignDialog(load, bidItem)}
                                              >
                                                Assign
                                              </Button>
                                            ) : (
                                              <Badge
                                                variant='outline'
                                                className={cn('rounded-full border px-3 py-0 text-[10px]', bidChipStyles[bidItem.status])}
                                              >
                                                {bidItem.status === 'accepted' ? 'Assigned' : bidItem.status}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className='flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='text-xs text-slate-500'>
                  Showing{' '}
                  <span className='font-medium text-slate-700'>
                    {displayedLoads.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
                  </span>{' '}
                  to{' '}
                  <span className='font-medium text-slate-700'>
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className='font-medium text-slate-700'>{pagination.total}</span> live entries
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!canPrev || loading}
                    onClick={() => setPage(Math.max(1, pagination.page - 1))}
                    className='h-9 rounded-2xl border-slate-200 px-3'
                  >
                    Previous
                  </Button>
                  <span className='text-xs text-slate-600'>
                    Page {pagination.page} of {pages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={!canNext || loading}
                    onClick={() => setPage(pagination.page + 1)}
                    className='h-9 rounded-2xl border-slate-200 px-3'
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout.Body>

      <CreateLoadModal
        open={modalConfig.open}
        onOpenChange={(open) => {
          if (!open) setModalConfig({ open: false, mode: 'create' })
        }}
        mode={modalConfig.mode}
        loadId={modalConfig.loadId}
        initialData={modalConfig.initialData}
      />

      <AlertDialog
        open={assignDialog.open}
        onOpenChange={(open) => {
          if (!open) setAssignDialog({ open: false, load: null, bid: null })
        }}
      >
        <AlertDialogContent className='max-w-lg'>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-emerald-600' />
              Assign Bid
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose the final vehicle count and amount for this transporter directly from the load board.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='space-y-4'>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-sm font-semibold text-slate-900'>
                {assignDialog.bid?.transporter?.transporterName || assignDialog.bid?.transporter?.email || 'Transporter'}
              </p>
              <p className='mt-1 text-xs text-slate-500'>
                Load #{assignDialog.load?.loadNumber?.slice(-8) || 'UNKNOWN'} • Current bid {formatMoney(assignDialog.bid?.bidAmount)}
              </p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-slate-700'>Assign vehicles</label>
                <Input
                  type='number'
                  min='1'
                  value={assignVehicleCount}
                  onChange={(event) => setAssignVehicleCount(event.target.value)}
                  className='h-11 rounded-2xl'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-xs font-medium text-slate-700'>Final rate</label>
                <Input
                  type='number'
                  min='1'
                      disabled={true}
                  value={assignRate}
                  onChange={(event) => setAssignRate(event.target.value)}
                  className='h-11 rounded-2xl'
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleAssignBid()} disabled={assigning}>
              {assigning ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Accept & assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => {
          if (deleting) return
          if (!open) {
            setCancelDialog({ open: false, load: null })
            return
          }
          setCancelDialog((prev) => ({ ...prev, open }))
        }}
      >
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Load</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelDialog.load ? (
                <>
                  This will cancel <span className='font-medium text-slate-900'>{cancelDialog.load.loadNumber}</span> and reject all pending bids for this load.
                </>
              ) : (
                'This will cancel the selected load and reject all pending bids.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep Load</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleCancelLoad()}
              disabled={deleting}
              className='bg-red-600 hover:bg-red-700'
            >
              {deleting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}