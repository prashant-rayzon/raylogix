import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Loader2,
  Package,
  Edit2,
  Trash2,
  AlertCircle,
  MessageCircle,
  FileText,
  MapPin,
  Truck,
  Users,
  Clock,
  IndianRupee,
  Printer,
  Share2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Award,
  User,
  Building2,
  Phone,
  Mail,
  Navigation,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  X,
} from 'lucide-react'

import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { useNotifications } from '@/contexts/NotificationContext'
import { useAppDispatch } from '@/store'
import {
  applyRealtimeLoadAssignment,
  upsertRealtimeBid,
  upsertRealtimeLoad,
  assignWinnerAsync,
} from '@/store/slices/loadSlice'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NegotiationChatPanel } from '@/components/chat/NegotiationChatPanel'
import { NegotiatePriceModal } from '@/components/modals/NegotiatePriceModal'
import { PriceHistoryModal } from '@/components/modals/PriceHistoryModal'
import { cn } from '@/lib/utils'

import { type LoadStatus, approveDeviation } from '@/api/services/load/loads.service'
import { branchesService, type VehicleMovement } from '@/api/services/branches/branches.service'
import { useLoadStore } from '@/lib/hooks/useLoadStore'
import { bid } from '@/api/services'
import { createBidNegotiation } from '@/api/services/chat/conversations.service'
import { Label } from '@/components/ui/label'

const statusVariants: Record<LoadStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: {
    label: 'Open',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <User className="h-3.5 w-3.5" />,
  },
  in_transit: {
    label: 'In Transit',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  canceled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
}

const gateStatusVariants: Record<string, { label: string; className: string }> = {
  expected: {
    label: 'Expected',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  gate_in_recorded: {
    label: 'Gate In',
    className: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  inspection_verified: {
    label: 'Inspection OK',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  inspection_rejected: {
    label: 'Rejected',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  gate_out_recorded: {
    label: 'Gate Out',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
}

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return format(date, 'dd MMM yyyy, h:mm a')
}

const formatDateOnly = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return format(date, 'dd MMM yyyy')
}

const formatMoney = (amount?: number) =>
  typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : 'N/A'

const getBidRates = (bid: any) => {
  const rateDetails = bid?.rateDetails || {}
  return {
    offerRate: rateDetails.offerRate ?? bid?.originalBidAmount ?? bid?.bidAmount,
    offlineRate: rateDetails.offlineRate,
    specialOfferRate: rateDetails.specialOfferRate,
    finalConfirmedRate: rateDetails.finalConfirmedRate,
  }
}

const getEffectiveBidRate = (bid: any) => {
  const rates = getBidRates(bid)
  return rates.finalConfirmedRate ?? rates.offlineRate ?? rates.specialOfferRate ?? rates.offerRate ?? bid?.bidAmount
}

const getBidTransporterName = (b: any) =>
  b.transporter?.name ||
  b.transporter?.transporterName ||
  b.transporter?.email ||
  b.transporterId?.name ||
  b.transporterId?.transporterName ||
  b.transporterId?.email ||
  'Unknown transporter'

const getMovementBranchName = (movement: VehicleMovement) => {
  if (typeof movement.branchId === 'object') {
    return [movement.branchId, movement.branchId.code].filter(Boolean).join(' · ') || 'Branch'
  }
  return 'Branch'
}

const getMovementBidAmount = (movement: VehicleMovement) => {
  if (typeof movement.referenceSnapshot?.bidAmount === 'number') return movement.referenceSnapshot.bidAmount
  if (typeof movement.bidId === 'object' && typeof movement.bidId.bidAmount === 'number') return movement.bidId.bidAmount
  return undefined
}

const getAuthFromStorage = () => {
  try {
    const authStr = localStorage.getItem('auth')
    if (!authStr) return null
    const auth = JSON.parse(authStr)
    return auth
  } catch (e) {
    console.error('Failed to parse auth:', e)
    return null
  }
}

type BidSortValue = 'amount_asc' | 'amount_desc' | 'newest' | 'oldest'

const BID_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
]

// Custom hook for bid filtering and sorting
const useBidFilters = (bids: any[], userId?: string) => {
  // searchInput is what the field shows immediately; searchTerm is the
  // debounced value actually used to filter, so large bid lists don't
  // re-filter on every keystroke.
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortValue, setSortValue] = useState<BidSortValue>('amount_asc')
  const [showMyBidsOnly, setShowMyBidsOnly] = useState(false)

  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput), 200)
    return () => clearTimeout(handle)
  }, [searchInput])

  const filteredBids = useMemo(() => {
    let filtered = bids || []

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((b: any) => b.status === statusFilter)
    }

    // Filter by my bids
    if (showMyBidsOnly && userId) {
      filtered = filtered.filter((b: any) => {
        const transporterId = typeof b.transporterId === 'string' ? b.transporterId : b.transporterId?._id
        const transporterUserId = typeof b.transporterId === 'object' ? b.transporterId?.userId?._id || b.transporterId?.userId : undefined
        const createdBy = typeof b.createdBy === 'string' ? b.createdBy : b.createdBy?._id
        return (
          String(transporterId || '') === String(userId) ||
          String(transporterUserId || '') === String(userId) ||
          String(createdBy || '') === String(userId)
        )
      })
    }

    // Search by transporter name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((b: any) => {
        const name = getBidTransporterName(b).toLowerCase()
        return name.includes(term)
      })
    }

    // Sort
    filtered = filtered.slice().sort((a: any, b: any) => {
      if (sortValue === 'amount_asc') return a.bidAmount - b.bidAmount
      if (sortValue === 'amount_desc') return b.bidAmount - a.bidAmount
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return sortValue === 'newest' ? bTime - aTime : aTime - bTime
    })

    return filtered
  }, [bids, searchTerm, statusFilter, sortValue, showMyBidsOnly, userId])

  const activeFilterCount = [
    searchTerm.trim().length > 0,
    statusFilter !== 'all',
    showMyBidsOnly,
  ].filter(Boolean).length

  const clearAllFilters = useCallback(() => {
    setSearchInput('')
    setSearchTerm('')
    setStatusFilter('all')
    setShowMyBidsOnly(false)
  }, [])

  return {
    filteredBids,
    searchInput,
    setSearchInput,
    searchTerm,
    statusFilter,
    setStatusFilter,
    sortValue,
    setSortValue,
    showMyBidsOnly,
    setShowMyBidsOnly,
    totalBids: bids?.length || 0,
    filteredCount: filteredBids.length,
    activeFilterCount,
    clearAllFilters,
  }
}

// Bid Card Component
const BidCard = ({
  bid,
  lowestAmount,
  isSelected,
  isAdmin,
  isMyBid,
  setAssignBidId,
  handleOpenNegotiation,
  openNegotiatedAmountModal,
  openingNegotiationBidId,
  handleOpenChat,
  handleOpenPriceHistory,
}: any) => {
  const transporterName = getBidTransporterName(bid)
  const isSelectable = isAdmin && bid.status === 'pending'
  const rates = getBidRates(bid)
  const displayAmount = getEffectiveBidRate(bid)
  const isLowest = typeof lowestAmount === 'number' && displayAmount === lowestAmount

  return (
    <div
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      onClick={() => isSelectable && setAssignBidId(bid._id)}
      className={cn(
        'rounded-lg border bg-background p-3 transition-all duration-200',
        isSelected && 'border-primary bg-primary/5 ',
        isSelectable && 'cursor-pointer hover:border-primary/40 hover:shadow-sm',
        isMyBid && 'border-primary/20 bg-primary/5',
        !isSelectable && 'hover:border-muted-foreground/20'
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold leading-none">{formatMoney(displayAmount)}</p>
            {isLowest && (
              <Badge variant="outline" className="h-5 gap-1 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700">
                <Award className="h-3 w-3" />
                Best
              </Badge>
            )}
            {isMyBid && (
              <Badge variant="outline" className="h-5 gap-1 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary">
                <User className="h-3 w-3" />
                My Bid
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'h-5 flex-shrink-0 border px-1.5 text-[10px] capitalize',
                bid.status === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                bid.status === 'accepted' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                bid.status === 'rejected' && 'border-red-200 bg-red-50 text-red-700'
              )}
            >
              {bid.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{transporterName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateOnly(bid.estimatedDeliveryDate)}
            </span>
            {bid.comments && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{bid.comments.length > 52 ? `${bid.comments.slice(0, 52)}...` : bid.comments}</span>
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 px-2.5 py-1.5">
              Offer Rate: <span className="font-medium text-foreground">{formatMoney(rates.offerRate)}</span>
            </div>
            <div className="rounded-md bg-slate-50 px-2.5 py-1.5">
              Offline Rate: <span className="font-medium text-foreground">{formatMoney(rates.offlineRate)}</span>
            </div>
            <div className="rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-800">
              Special Offer: <span className="font-medium">{formatMoney(rates.specialOfferRate)}</span>
            </div>
            <div className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-800">
              Final Confirmed: <span className="font-medium">{formatMoney(rates.finalConfirmedRate)}</span>
            </div>
          </div>
          {(isAdmin || isMyBid) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleOpenPriceHistory?.(bid)
              }}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Clock className="h-3 w-3" />
              View Price Negotiation History
            </button>
          )}
          {isSelected && bid.status === 'pending' && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
              <CheckCircle className="h-3.5 w-3.5" />
              Selected for assignment
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {isAdmin && bid.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-2.5 text-xs"
                onClick={(event) => {
                  event.stopPropagation()
                  handleOpenNegotiation(bid)
                }}
                disabled={openingNegotiationBidId === bid._id}
              >
                {openingNegotiationBidId === bid._id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <MessageCircle className="h-3 w-3" />
                )}
                Negotiate
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-primary px-2.5 text-xs hover:bg-primary/90"
                onClick={(event) => {
                  event.stopPropagation()
                  console.log('⭐ Set Amount button clicked for bid:', bid._id)
                  openNegotiatedAmountModal(bid)
                }}
              >
                Set Amount
              </Button>
            </>
          )}

          {isMyBid && bid.status === 'accepted' && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => handleOpenChat(bid)}
            >
              <MessageCircle className="h-3 w-3" />
              Chat
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const GateTrackingCard = ({
  movements,
  loading,
  vehicleCount,
}: {
  movements: VehicleMovement[]
  loading: boolean
  vehicleCount: number
}) => {
  const completedCount = movements.filter((movement) => movement.status === 'gate_out_recorded').length
  const activeCount = movements.filter((movement) =>
    ['expected', 'gate_in_recorded', 'inspection_verified'].includes(movement.status)
  ).length

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-background p-5">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Gate Tracking
          </span>
          <Badge variant="outline" className="shrink-0">
            {movements.length}/{vehicleCount || 1} vehicles
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-5">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Active entries</p>
            <p className="mt-1 font-semibold">{activeCount}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Gate out</p>
            <p className="mt-1 font-semibold">{completedCount}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading gate entries...
          </div>
        ) : movements.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">
            No branch gate entry created for this load yet.
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((movement) => {
              const statusMeta = gateStatusVariants[movement.status] || {
                label: movement.status,
                className: 'border-slate-200 bg-slate-100 text-slate-700',
              }

              return (
                <div key={movement._id} className="rounded-lg border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{movement.vehicleNumber}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {movement.transporterName} · {getMovementBranchName(movement)}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('shrink-0 px-2 py-0 text-[10px]', statusMeta.className)}>
                      {statusMeta.label}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Bid amount</p>
                      <p className="font-medium">{formatMoney(getMovementBidAmount(movement))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected</p>
                      <p className="font-medium">{formatDateTime(movement.expectedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Driver</p>
                      <p className="truncate font-medium">{movement.driverName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vehicle check</p>
                      <p className="font-medium">
                        {movement.inspection?.verificationSummary?.vehicleMatched === undefined
                          ? 'Pending'
                          : movement.inspection.verificationSummary.vehicleMatched
                            ? 'Matched'
                            : 'Mismatch'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const getBidConversationRecipientId = (bidData: any, isAdmin: boolean, fallbackUserId?: string | null) => {
  if (isAdmin) {
    return (
      bidData?.createdBy?._id ||
      bidData?.createdBy ||
      bidData?.transporterId?.userId?._id ||
      bidData?.transporterId?.userId ||
      bidData?.transporter?._id ||
      bidData?.transporterId?._id ||
      bidData?.transporterId ||
      null
    )
  }

  return fallbackUserId || null
}

export default function LoadDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { socket } = useNotifications()
  const dispatch = useAppDispatch()
  const fetchedRef = useRef(false)

  const auth = getAuthFromStorage()
  const userRole = auth?.user?.role
  const userId = auth?.user?.id

  const {
    currentLoad: load,
    currentBids: bids,
    assigning,
    detailError,
    getLoadDetails,
    assignWinner,
    markInTransit,
    markDelivered,
    clearDetailError,
  } = useLoadStore()

  // Bid form states
  const [bidAmount, setBidAmount] = useState<string>('')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(load?.deliveryDate || '')
  const [bidComments, setBidComments] = useState<string>('')
  const [submittingBid, setSubmittingBid] = useState(false)
  const [updatingBidId, setUpdatingBidId] = useState<string | null>(null)
  const [updatingAmount, setUpdatingAmount] = useState<string>('')
  const [deletingBidId, setDeletingBidId] = useState<string | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBidModal, setShowBidModal] = useState(false)
  const [openingNegotiationBidId, setOpeningNegotiationBidId] = useState<string | null>(null)
  const [finalConfirmedAmount, setFinalConfirmedAmount] = useState<string>('')
  const [showNegotiatedAmountModal, setShowNegotiatedAmountModal] = useState(false)
  const [showNegotiationCenter, setShowNegotiationCenter] = useState(false)
  const [activeNegotiationBid, setActiveNegotiationBid] = useState<any | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const [resolvingDeviation, setResolvingDeviation] = useState(false)

  const handleResolveDeviation = async (action: 'approve' | 'reject') => {
    if (!id) return
    if (!window.confirm(`Are you sure you want to ${action} this price deviation?`)) return
    try {
      setResolvingDeviation(true)
      const res = await approveDeviation(id, action)
      if (res.success) {
        toast({
          title: 'Success',
          description: `Price deviation request ${action}ed successfully.`
        })
        getLoadDetails(id)
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(e, `Failed to resolve price deviation.`),
        variant: 'destructive'
      })
    } finally {
      setResolvingDeviation(false)
    }
  }

  const [assignBidId, setAssignBidId] = useState<any>('')
  const [assignVehicleCount, setAssignVehicleCount] = useState<string>('1')
  const [deliveryProofFiles, setDeliveryProofFiles] = useState<File[]>([])
  const [receiverName, setReceiverName] = useState<string>('')
  const [receiverPhone, setReceiverPhone] = useState<string>('')
  const [deliveryRemarks, setDeliveryRemarks] = useState<string>('')
  const [showDeliveryConfirmModal, setShowDeliveryConfirmModal] = useState(false)
  const [gateMovements, setGateMovements] = useState<VehicleMovement[]>([])
  const [gateMovementsLoading, setGateMovementsLoading] = useState(false)

  // Advanced price negotiation modal state
  const [showAdvancedPriceModal, setShowAdvancedPriceModal] = useState(false)
  const [selectedBidForPricing, setSelectedBidForPricing] = useState<any>(null)

  // Price history modal state
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false)
  const [selectedBidForHistory, setSelectedBidForHistory] = useState<any>(null)

  const handleOpenPriceHistory = useCallback((bidData: any) => {
    setSelectedBidForHistory(bidData)
    setShowPriceHistoryModal(true)
  }, [])

  // Use the custom hook for bid filtering
  const {
    filteredBids,
    searchInput,
    setSearchInput,
    searchTerm,
    statusFilter,
    setStatusFilter,
    sortValue,
    setSortValue,
    showMyBidsOnly,
    setShowMyBidsOnly,
    totalBids,
    filteredCount,
    activeFilterCount,
    clearAllFilters,
  } = useBidFilters(bids, userId)

  // Permissions
  const isAdmin = userRole === 'company_admin'
  const isTransporter = userRole === 'transporter'
  const canViewGateTracking = ['super_admin', 'company_admin', 'company_user'].includes(userRole || '')

  const myBid = useMemo(() => {
    if (!userId || !bids || bids.length === 0) return null
    return bids.find((b: any) => {
      const transporterId =
        typeof b.transporterId === 'string' ? b.transporterId : b.transporterId?._id
      const transporterUserId =
        typeof b.transporterId === 'object'
          ? b.transporterId?.userId?._id || b.transporterId?.userId
          : undefined
      const createdBy = typeof b.createdBy === 'string' ? b.createdBy : b.createdBy?._id

      return (
        String(transporterId || '') === String(userId) ||
        String(transporterUserId || '') === String(userId) ||
        String(createdBy || '') === String(userId)
      )
    })
  }, [bids, userId])

  const loadOwnerUserId =
    typeof load?.createdBy === 'string' ? load.createdBy : load?.createdBy?._id
  const activeRecipientId = useMemo(
    () => getBidConversationRecipientId(activeNegotiationBid, isAdmin, loadOwnerUserId),
    [activeNegotiationBid, isAdmin, loadOwnerUserId]
  )
  const activeNegotiationTitle = useMemo(() => {
    if (!activeNegotiationBid) return 'Negotiation Center'
    const loadCreator =
      typeof load?.createdBy === 'object' && load?.createdBy
        ? load.createdBy
        : null
    return isAdmin
      ? getBidTransporterName(activeNegotiationBid)
      : [loadCreator?.firstName, loadCreator?.lastName].filter(Boolean).join(' ') ||
      loadCreator?.email ||
      'Company Admin'
  }, [activeNegotiationBid, isAdmin, load?.createdBy])

  const sortedBids = useMemo(
    () => (bids || []).slice().sort((a: any, b: any) => a.bidAmount - b.bidAmount),
    [bids]
  )

  const pendingBids = useMemo(
    () => sortedBids.filter((b: any) => b.status === 'pending'),
    [sortedBids]
  )

  const selectedAssignBid = useMemo(
    () => pendingBids.find((b: any) => b._id === assignBidId) || null,
    [pendingBids, assignBidId]
  )
  const remainingVehicles = Math.max(
    0,
    Number(load?.remainingVehicles ?? ((load?.numberOfVehicles || 0) - (load?.allocatedVehicles || 0)))
  )
  const allocationEntries = useMemo(() => Array.isArray(load?.allocations) ? load.allocations : [], [load?.allocations])
  const selectedAssignBidRemainingVehicles = Math.max(
    0,
    Number(selectedAssignBid?.vehiclesOffered || 1) - Number(selectedAssignBid?.allocatedVehicles || 0)
  )
  const previousAssignBidIdRef = useRef<string | null>(null)

  const getInitialFinalRateValue = useCallback((bidData: any) => {
    const rates = getBidRates(bidData)
    return String(
      rates.finalConfirmedRate ??
      rates.offlineRate ??
      rates.specialOfferRate ??
      rates.offerRate ??
      bidData?.bidAmount ??
      ''
    )
  }, [])

  const resetAssignmentModalState = useCallback(() => {
    previousAssignBidIdRef.current = null
    setAssignBidId('')
    setAssignVehicleCount('1')
    setFinalConfirmedAmount('')
  }, [])

  const lowestBid = sortedBids[0]
  const statusMeta = statusVariants[load?.status || 'open']
  const pickupCity = load?.pickupLocation?.city || load?.pickupLocation?.address || 'Pickup'
  const deliveryCity = load?.deliveryLocation?.city || load?.deliveryLocation?.address || 'Delivery'
  const visibilityLabel = load?.isPublic === false ? 'Private' : 'Public'
  const visibilityClass =
    load?.isPublic === false
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
  const visibilityIcon =
    load?.isPublic === false ? <ShieldCheck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />

  // Calculate bid statistics
  const bidStats = useMemo(() => {
    if (!bids || bids.length === 0) return null
    const amounts = bids.map((b: any) => getEffectiveBidRate(b))
    const avg = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length
    return {
      count: bids.length,
      average: avg,
      lowest: Math.min(...amounts),
      highest: Math.max(...amounts),
    }
  }, [bids])

  useEffect(() => {
    if (id && !fetchedRef.current) {
      fetchedRef.current = true
      getLoadDetails(id)
    }
  }, [id])

  useEffect(() => {
    if (!id || !canViewGateTracking) {
      setGateMovements([])
      return
    }

    let cancelled = false

    const loadGateMovements = async () => {
      try {
        setGateMovementsLoading(true)
        const response = await branchesService.listMovements({ limit: 50, loadId: id })
        if (!cancelled) setGateMovements(response.movements || [])
      } catch (error) {
        if (!cancelled) setGateMovements([])
      } finally {
        if (!cancelled) setGateMovementsLoading(false)
      }
    }

    loadGateMovements()

    return () => {
      cancelled = true
    }
  }, [canViewGateTracking, id])

  useEffect(() => {
    if (!socket || !id) return

    const isSameLoad = (payloadLoadId?: string) =>
      String(payloadLoadId || '') === String(id)

    const handleBidCreated = (payload: any) => {
      if (!isSameLoad(payload?.loadId || payload?.bid?.loadId)) return
      if (payload?.bid) {
        dispatch(upsertRealtimeBid(payload.bid))
      }
    }

    const handleBidUpdated = (payload: any) => {
      if (!isSameLoad(payload?.loadId || payload?.bid?.loadId)) return
      if (payload?.bid) dispatch(upsertRealtimeBid(payload.bid))
    }

    const handleLoadAssigned = (payload: any) => {
      if (!isSameLoad(payload?.loadId || payload?.load?._id)) return
      if (payload?.load && payload?.acceptedBid) {
        dispatch(applyRealtimeLoadAssignment(payload))
      }
    }

    const handleLoadUpdated = (payload: any) => {
      if (!isSameLoad(payload?.loadId || payload?.load?._id)) return
      if (payload?.load) dispatch(upsertRealtimeLoad(payload.load))
    }

    socket.on('bid:created', handleBidCreated)
    socket.on('bid:updated', handleBidUpdated)
    socket.on('load:assigned', handleLoadAssigned)
    socket.on('load:updated', handleLoadUpdated)
    socket.on('load:status-changed', handleLoadUpdated)

    return () => {
      socket.off('bid:created', handleBidCreated)
      socket.off('bid:updated', handleBidUpdated)
      socket.off('load:assigned', handleLoadAssigned)
      socket.off('load:updated', handleLoadUpdated)
      socket.off('load:status-changed', handleLoadUpdated)
    }
  }, [dispatch, id, socket])

  useEffect(() => {
    if (bids && bids.length > 0 && !assignBidId) {
      const firstPending = bids.find((b: any) => b.status === 'pending')
      if (firstPending) {
        setAssignBidId(firstPending._id)
      }
    }
  }, [bids, assignBidId])

  useEffect(() => {
    if (!showNegotiatedAmountModal || !selectedAssignBid) return

    if (previousAssignBidIdRef.current !== selectedAssignBid._id) {
      previousAssignBidIdRef.current = selectedAssignBid._id
      setFinalConfirmedAmount(getInitialFinalRateValue(selectedAssignBid))
    }
  }, [selectedAssignBid, showNegotiatedAmountModal, getInitialFinalRateValue])

  useEffect(() => {
    if (selectedAssignBid) {
      const suggested = Math.max(1, Math.min(remainingVehicles || 1, selectedAssignBidRemainingVehicles || 1))
      setAssignVehicleCount(String(suggested))
    }
  }, [selectedAssignBid, remainingVehicles, selectedAssignBidRemainingVehicles])

  useEffect(() => {
    if (detailError) {
      toast({
        title: 'Failed to load',
        description: detailError,
        variant: 'destructive',
      })
      clearDetailError()
    }
  }, [detailError, toast, clearDetailError])

  useEffect(() => {
    if (!showBidModal) return
    setEstimatedDeliveryDate(load?.deliveryDate || '')
  }, [showBidModal, load?.deliveryDate])

  const handleSubmitBid = async () => {
    if (!id || !bidAmount || !estimatedDeliveryDate) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      })
      return
    }

    // UI takes: rate per vehicle.
    // Backend currently stores a single bidAmount. We submit total for 1 vehicle basis (total = rate × 1),
    // because this bid modal currently doesn't collect “vehicles count to bid for”.
    const rate = parseFloat(bidAmount)
    if (!Number.isFinite(rate) || rate <= 0) {
      toast({ title: 'Error', description: 'Bid rate must be greater than 0', variant: 'destructive' })
      return
    }

    const vehiclesForThisBid = 1
    const totalBidAmount = rate * vehiclesForThisBid

    setSubmittingBid(true)
    try {
      const response = await bid.createBid({
        loadId: id,
        bidAmount: totalBidAmount,
        estimatedDeliveryDate,
        comments: bidComments || undefined,
      })
      if (response?.data?.bid) dispatch(upsertRealtimeBid(response.data.bid as any))

      toast({ title: 'Success', description: 'Bid submitted successfully!' })
      setBidAmount('')
      setEstimatedDeliveryDate('')
      setBidComments('')
      setShowBidModal(false)
    } catch (error: any) {
      toast({
        title: 'Failed to submit bid',
        description: getApiErrorMessage(error, 'Failed to submit bid'),
        variant: 'destructive',
      })
    } finally {
      setSubmittingBid(false)
    }
  }

  const handleUpdateBid = async () => {
    if (!updatingBidId || !updatingAmount) return

    const amount = parseFloat(updatingAmount)
    if (amount <= 0) {
      toast({ title: 'Error', description: 'Bid amount must be greater than 0', variant: 'destructive' })
      return
    }

    setSubmittingBid(true)
    try {
      const response = await bid.updateBid(updatingBidId, { bidAmount: amount })
      if (response?.data?.bid) dispatch(upsertRealtimeBid(response.data.bid as any))
      toast({ title: 'Success', description: 'Bid updated successfully!' })
      setShowUpdateModal(false)
      setUpdatingBidId(null)
      setUpdatingAmount('')
    } catch (error: any) {
      toast({ title: 'Failed', description: getApiErrorMessage(error, 'Unknown error'), variant: 'destructive' })
    } finally {
      setSubmittingBid(false)
    }
  }

  const openNegotiatedAmountModal = (bidData: any) => {
    console.log('🔵 openNegotiatedAmountModal called with:', { bidData, bidId: bidData._id, isAdmin })
    setSelectedBidForPricing(bidData)
    setShowAdvancedPriceModal(true)
    console.log('🟢 State updated - showAdvancedPriceModal should be true now')
  }

  const handleWithdrawBid = async () => {
    if (!deletingBidId) return

    setSubmittingBid(true)
    try {
      const response = await bid.withdrawBid(deletingBidId)
      if (response?.data?.bid) dispatch(upsertRealtimeBid(response.data.bid as any))
      toast({ title: 'Success', description: 'Bid withdrawn successfully!' })
      setShowDeleteConfirm(false)
      setDeletingBidId(null)
    } catch (error: any) {
      toast({ title: 'Failed', description: getApiErrorMessage(error, 'Unknown error'), variant: 'destructive' })
    } finally {
      setSubmittingBid(false)
    }
  }

  const handleAssignWinner = async () => {
    if (!id || !assignBidId) return
    const vehicleCount = Math.max(1, parseInt(assignVehicleCount || '1', 10) || 1)
    const finalRate = parseFloat(finalConfirmedAmount)

    // Validate: final rate required
    if (!Number.isFinite(finalRate) || finalRate <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid final rate greater than 0', variant: 'destructive' })
      return
    }

    // Validate: vehicles available
    if (vehicleCount > remainingVehicles) {
      toast({ title: 'Failed', description: `Only ${remainingVehicles} vehicles remain on this load`, variant: 'destructive' })
      return
    }


    try {
      const actionResult = await assignWinner(id, assignBidId, vehicleCount, finalRate, 'per_vehicle', 'Assigned via price negotiation') as any

      if (assignWinnerAsync.rejected.match(actionResult)) {
        throw new Error(String(actionResult.payload || actionResult.error?.message || 'Assignment failed'))
      }

      const payload = actionResult.payload as any

      // Success - clear rates and show message
      resetAssignmentModalState()
      setShowNegotiatedAmountModal(false)

      if (payload?.load?.priceDeviation?.status === 'pending_approval') {
        toast({
          title: 'Price Deviation Flagged',
          description: `Bid rate of ${formatMoney(finalRate)} exceeds target rate. Sent to Company Admin for approval.`,
          variant: 'default',
        })
      } else {
        toast({
          title: 'Success',
          description: `Assigned ${vehicleCount} vehicle(s) at ${formatMoney(finalRate)} each`
        })
      }
    } catch (e: any) {
      const errorMsg = getApiErrorMessage(e, 'Assignment failed')
      toast({
        title: 'Failed',
        description: errorMsg,
        variant: 'destructive'
      })
    }
  }

  const handleNegotiatedAmountModalChange = (nextOpen: boolean) => {
    setShowNegotiatedAmountModal(nextOpen)
    if (!nextOpen) {
      resetAssignmentModalState()
    }
  }

  const handleMarkInTransit = async () => {
    if (!id) return
    try {
      await markInTransit(id, new Date().toISOString())
      toast({ title: 'Success', description: 'Load marked as in transit' })
    } catch (e: any) {
      toast({ title: 'Failed', description: getApiErrorMessage(e, 'Unknown error'), variant: 'destructive' })
    }
  }

  const handleMarkDelivered = async () => {
    if (!id) return
    if (!receiverName.trim()) {
      toast({
        title: 'Receiver required',
        description: 'Enter receiver name before marking this load as delivered',
        variant: 'destructive',
      })
      return
    }
    if (deliveryProofFiles.length === 0) {
      toast({
        title: 'POD required',
        description: 'Upload at least one POD image or PDF before confirming delivery',
        variant: 'destructive',
      })
      return
    }
    try {
      await markDelivered(
        id,
        new Date().toISOString(),
        receiverName.trim(),
        receiverPhone.trim() || undefined,
        deliveryRemarks.trim() || undefined,
        deliveryProofFiles
      )
      toast({ title: 'Success', description: 'Load marked as delivered' })
      setShowDeliveryConfirmModal(false)
      setDeliveryProofFiles([])
      setReceiverName('')
      setReceiverPhone('')
      setDeliveryRemarks('')
    } catch (e: any) {
      toast({ title: 'Failed', description: getApiErrorMessage(e, 'Unknown error'), variant: 'destructive' })
    }
  }

  const handleOpenNegotiationCenter = async (bidData: any) => {
    const bidId = bidData?._id
    if (!bidId) return

    setOpeningNegotiationBidId(bidId)
    setActiveNegotiationBid(bidData)
    setShowNegotiationCenter(true)
    try {
      const response = await createBidNegotiation(bidId)
      const conversationId = response?.data?._id

      if (!conversationId) {
        throw new Error('Conversation could not be opened')
      }

      setActiveConversationId(conversationId)
    } catch (error: any) {
      setActiveConversationId(null)
    } finally {
      setOpeningNegotiationBidId(null)
    }
  }

  const handleOpenNegotiation = async (bidData: any) => {
    await handleOpenNegotiationCenter(bidData)
  }

  const handleOpenChat = async (bidData: any) => {
    await handleOpenNegotiationCenter(bidData)
  }

  if (!load) {
    return (
      <Layout>
        <Layout.Header>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </Layout.Header>
        <Layout.Body>
          <div className="h-96 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  return (
    <Layout fixed>
      <Layout.Header sticky className="border-b bg-background/95 backdrop-blur">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => navigate('/load')} className="w-fit gap-2 px-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Loads
          </Button>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => {
                if (!navigator.share) {
                  navigator.clipboard?.writeText(window.location.href)
                  toast({ description: 'Link copied to clipboard' })
                  return
                }
                navigator.share({
                  title: `Load ${load.loadNumber}`,
                  text: `${load.material}: ${pickupCity} to ${deliveryCity}`,
                  url: window.location.href,
                }).catch(() => undefined)
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </Layout.Header>

      <Layout.Body className="flex flex-col gap-4 bg-slate-50/40 pb-4 md:min-h-0 md:overflow-hidden">
        {detailError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {detailError}
          </div>
        )}

        {load.priceDeviation?.isRequired && load.priceDeviation?.status === 'pending_approval' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-900 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800">⚠️ Price Deviation Action Required</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  {load.priceDeviation.reason || 'The assigned bid amount exceeds the pre-negotiated route ceiling contract price.'} (Deviation: {load.priceDeviation.deviationPercentage?.toFixed(1)}%)
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolvingDeviation}
                  onClick={() => handleResolveDeviation('reject')}
                  className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100/50"
                >
                  Reject & Reset Bid
                </Button>
                <Button
                  size="sm"
                  disabled={resolvingDeviation}
                  onClick={() => handleResolveDeviation('approve')}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Approve Allocation
                </Button>
              </div>
            )}
          </div>
        )}

        <section className="shrink-0 rounded-xl border bg-background shadow-sm">
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('gap-1.5 border px-2.5 py-1', statusMeta.className)}>
                  {statusMeta.icon}
                  {statusMeta.label}
                </Badge>
                <Badge variant="outline" className={cn('gap-1.5 px-2.5 py-1', visibilityClass)}>
                  {visibilityIcon}
                  {visibilityLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">Created {formatDateTime(load.createdAt)}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {load.loadNumber || 'Load details'}
                  </h1>
                  <span className="text-sm font-medium text-muted-foreground">{load.material || 'Product not specified'}</span>
                </div>
                <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">{pickupCity}</span>
                  </span>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                    <Navigation className="h-4 w-4 shrink-0 text-sky-600" />
                    <span className="truncate">{deliveryCity}</span>
                  </span>
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:w-52 lg:flex-col">
              {isTransporter && load.status === 'open' && !myBid && (
                <Button
                  className="h-10 gap-2 bg-teal-700 text-white hover:bg-teal-800"
                  onClick={() => {
                    setShowBidModal(true)
                    setEstimatedDeliveryDate(load?.deliveryDate || '')
                  }}
                >
                  <IndianRupee className="h-4 w-4" />
                  Place Bid
                </Button>
              )}
              {isAdmin && pendingBids.length > 0 && load.status === 'open' && (
                <Button
                  className="h-10 gap-2"
                  onClick={() => {
                    setShowNegotiatedAmountModal(true)
                  }}
                >
                  <CheckCircle className="h-4 w-4" />
                  Assign Load
                </Button>
              )}
              {load.status === 'assigned' && (
                <Button variant="outline" className="h-10 gap-2" onClick={handleMarkInTransit}>
                  <Truck className="h-4 w-4" />
                  Mark In Transit
                </Button>
              )}
              {load.status === 'in_transit' && (
                <Button className="h-10 gap-2" onClick={() => setShowDeliveryConfirmModal(true)}>
                  <CheckCircle className="h-4 w-4" />
                  Mark Delivered
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0">
            <Card className="flex h-full min-h-0 flex-col overflow-hidden border shadow-sm">
              <CardHeader className="shrink-0 border-b bg-background p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Bid Workspace
                      <Badge variant="secondary" className="rounded-full px-2 text-xs">
                        {totalBids}
                      </Badge>
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Compare transporter offers, negotiate, and assign the load from one place.
                    </p>
                  </div>
                  {lowestBid && (
                    <Badge variant="outline" className="w-fit gap-1.5 border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                      <Award className="h-3.5 w-3.5" />
                      Lowest {formatMoney(lowestBid.bidAmount)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-4">
                {bids.length === 0 ? (
                  <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50 px-4 text-center">
                    <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium">No bids yet</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Transporter responses will appear here with amount, delivery estimate, and negotiation actions.
                    </p>
                  </div>
                ) : (
                  <>
                    {bidStats && (
                      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <div className="rounded-lg border bg-slate-50 p-2.5">
                          <p className="text-xs text-muted-foreground">Total bids</p>
                          <p className="text-lg font-semibold">{bidStats.count}</p>
                        </div>
                        <div className="rounded-lg border bg-amber-50/70 p-2.5">
                          <p className="text-xs text-amber-700">Pending</p>
                          <p className="text-lg font-semibold text-amber-700">{pendingBids.length}</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-2.5">
                          <p className="text-xs text-muted-foreground">Average</p>
                          <p className="text-lg font-semibold">{formatMoney(bidStats.average)}</p>
                        </div>
                        <div className="rounded-lg border bg-slate-50 p-2.5">
                          <p className="text-xs text-muted-foreground">Highest</p>
                          <p className="text-lg font-semibold">{formatMoney(bidStats.highest)}</p>
                        </div>
                      </div>
                    )}

                    <div className="mb-3 shrink-0 rounded-lg border bg-slate-50/80 p-2.5">
                      <div className="flex flex-col gap-2 lg:flex-row">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search transporter name"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="h-9 bg-background pl-9 pr-9 text-sm"
                          />
                          {searchInput && (
                            <button
                              type="button"
                              aria-label="Clear search"
                              onClick={() => setSearchInput('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <Select value={sortValue} onValueChange={(v) => setSortValue(v as BidSortValue)}>
                          <SelectTrigger className="h-9 bg-background text-sm lg:w-[210px]">
                            {sortValue === 'amount_asc' || sortValue === 'oldest' ? (
                              <SortAsc className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <SortDesc className="mr-1 h-3.5 w-3.5" />
                            )}
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amount_asc">Amount: low to high</SelectItem>
                            <SelectItem value="amount_desc">Amount: high to low</SelectItem>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                          </SelectContent>
                        </Select>

                        {isTransporter && (
                          <Button
                            variant={showMyBidsOnly ? 'default' : 'outline'}
                            size="sm"
                            className="h-9 shrink-0 gap-1.5"
                            onClick={() => setShowMyBidsOnly(!showMyBidsOnly)}
                          >
                            <User className="h-3.5 w-3.5" />
                            My Bids
                          </Button>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Filter className="h-3.5 w-3.5" />
                          Status
                        </span>
                        {BID_STATUS_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setStatusFilter(value)}
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                              statusFilter === value
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/40'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Showing {filteredCount} of {totalBids} bids</span>
                          {activeFilterCount > 0 && (
                            <>
                              {searchTerm && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1">
                                  Search: {searchTerm}
                                  <button type="button" aria-label="Remove search filter" onClick={() => setSearchInput('')}>
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              )}
                              {statusFilter !== 'all' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 capitalize">
                                  {statusFilter}
                                  <button type="button" aria-label="Remove status filter" onClick={() => setStatusFilter('all')}>
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              )}
                              {showMyBidsOnly && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1">
                                  My bids
                                  <button type="button" aria-label="Remove my bids filter" onClick={() => setShowMyBidsOnly(false)}>
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {activeFilterCount > 1 && (
                          <button type="button" onClick={clearAllFilters} className="font-medium text-primary hover:underline">
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    <ScrollArea className="min-h-[240px] flex-1 pr-3 md:min-h-0">
                      <div className="space-y-2">
                        {filteredBids.map((bidItem: any) => (
                          <BidCard
                            key={bidItem._id}
                            bid={bidItem}
                            lowestAmount={lowestBid?.bidAmount}
                            isSelected={assignBidId === bidItem._id}
                            isAdmin={isAdmin}
                            isMyBid={myBid?._id === bidItem._id}
                            setAssignBidId={setAssignBidId}
                            handleOpenNegotiation={handleOpenNegotiation}
                            openNegotiatedAmountModal={openNegotiatedAmountModal}
                            openingNegotiationBidId={openingNegotiationBidId}
                            handleOpenChat={handleOpenChat}
                            handleOpenPriceHistory={handleOpenPriceHistory}
                          />
                        ))}

                        {filteredBids.length === 0 && (
                          <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                            <p className="text-sm font-medium">No bids match your filters</p>
                            <p className="mt-1 text-xs">Try a different search or remove a filter.</p>
                            {activeFilterCount > 0 && (
                              <Button variant="outline" size="sm" className="mt-3" onClick={clearAllFilters}>
                                Clear filters
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <aside className="min-h-0 space-y-4 xl:overflow-y-auto xl:pr-1">

            <Card className="border shadow-sm">
              <CardHeader className="border-b bg-background p-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Route & Shipment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                <div className="relative space-y-4">
                  <div className="absolute left-[15px] top-8 h-[calc(100%-64px)] w-px bg-border" />
                  <div className="relative flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-emerald-700">Pickup</p>
                      <p className="mt-1 text-sm font-medium">{load.pickupLocation?.address || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {[load.pickupLocation?.city, load.pickupLocation?.state].filter(Boolean).join(', ') || 'Location not specified'}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(load.pickupDate)}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50">
                      <Navigation className="h-4 w-4 text-sky-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-sky-700">Delivery</p>
                      <p className="mt-1 text-sm font-medium">{load.deliveryLocation?.branchName || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">
                        {[load.deliveryLocation?.address, load.deliveryLocation?.city, load.deliveryLocation?.state, load.deliveryLocation?.zipCode].filter(Boolean).join(', ') || 'Location not specified'}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(load.deliveryDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Vehicle type</p>
                    <p className="mt-1 font-medium capitalize">{load.vehicleType || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs text-muted-foreground">Vehicles</p>
                    <p className="mt-1 font-medium">{load.allocatedVehicles || 0}/{load.numberOfVehicles || 1}</p>
                    <p className="text-xs text-muted-foreground">Remaining {remainingVehicles}</p>
                  </div>
                </div>

                {load.notes && (
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Remarks</p>
                    <p className="mt-1 text-sm">{load.notes}</p>
                  </div>
                )}

                {Array.isArray(load.attachments) && load.attachments.length > 0 && (
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Load Attachments</p>
                    <div className="mt-2 space-y-3">
                      {load.attachments.map((attachment, index) => {
                        
                        return (
                          <div key={`${attachment.url || attachment.name || index}-${index}`}>
                              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.name || `Attachment ${index + 1}`}
                                  className="w-full h-auto max-h-96 object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.parentElement?.classList.add('hidden')
                                  }}
                                />
                              </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {load.status === 'in_transit' && (
                  <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-3">
                    <p className="text-xs font-semibold uppercase text-sky-700">Delivery Confirmation</p>
                    <p className="mt-1 text-sm text-sky-950">
                      Use the delivery confirmation action to record receiver details, POD link, and final delivery remarks.
                    </p>
                  </div>
                )}

                {load.deliveryConfirmation?.status && (
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Delivery Record</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="text-muted-foreground">Status:</span>{' '}
                        <span className="font-medium capitalize">{String(load.deliveryConfirmation.status).replace(/_/g, ' ')}</span>
                      </p>
                      {load.deliveryConfirmation.receiverName && (
                        <p>
                          <span className="text-muted-foreground">Receiver:</span>{' '}
                          <span className="font-medium">{load.deliveryConfirmation.receiverName}</span>
                        </p>
                      )}
                      {load.deliveryConfirmation.receiverPhone && (
                        <p>
                          <span className="text-muted-foreground">Phone:</span>{' '}
                          <span className="font-medium">{load.deliveryConfirmation.receiverPhone}</span>
                        </p>
                      )}
                      {load.deliveryConfirmation.remarks && (
                        <p>
                          <span className="text-muted-foreground">Remarks:</span>{' '}
                          <span className="font-medium">{load.deliveryConfirmation.remarks}</span>
                        </p>
                      )}
                      {Array.isArray(load.deliveryConfirmation?.proofs) && load.deliveryConfirmation.proofs.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Proof Files:</span>
                          <div className="mt-1 flex flex-col gap-1">
                            {load.deliveryConfirmation.proofs.map((proof, index) => (
                              <a
                                key={`${proof.url || index}-${index}`}
                                href={proof.url}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate font-medium text-primary hover:underline"
                              >
                                {proof.label || `POD file ${index + 1}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {canViewGateTracking && load.status !== 'open' && (
              <GateTrackingCard
                movements={gateMovements}
                loading={gateMovementsLoading}
                vehicleCount={load.numberOfVehicles || 1}
              />
            )}

            {isAdmin && allocationEntries.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-background p-5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Assigned Transporters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-5">
                  {allocationEntries.map((allocation: any, index: number) => {
                    const allocationTransporter = typeof allocation.transporterId === 'object' ? allocation.transporterId : null
                    const allocationBidId = String(
                      typeof allocation.bidId === 'object' ? allocation.bidId?._id || '' : allocation.bidId || ''
                    )
                    const relatedBid = bids.find((item: any) => item._id === allocationBidId)

                    return (
                      <div key={`${allocationBidId || index}`} className="rounded-lg border bg-slate-50 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {allocationTransporter?.name ||
                                allocationTransporter?.transporterName ||
                                allocationTransporter?.email ||
                                'Unknown'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {allocation.allocatedVehicles || 0} vehicles allocated
                              {typeof (allocation.finalRate ?? allocation.finalConfirmedRate) === 'number'
                                ? ` • ${formatMoney(allocation.finalRate ?? allocation.finalConfirmedRate)}`
                                : ''}
                            </p>
                            <Badge
                              className={cn(
                                'mt-2 px-2 py-0 text-[10px]',
                                load.status === 'delivered' ? 'bg-gray-100 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {allocation.status || (load.status === 'delivered' ? 'Completed' : 'Active')}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" className="gap-2" disabled>
                            <Phone className="h-3.5 w-3.5" />
                            Call
                          </Button>
                          {relatedBid ? (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleOpenChat(relatedBid)}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              Chat
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" className="gap-2" disabled>
                              <Mail className="h-3.5 w-3.5" />
                              Chat
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {isTransporter && myBid && (
              <Card className={cn('border shadow-sm', myBid.status === 'accepted' && 'border-emerald-200 bg-emerald-50/30')}>
                <CardHeader className="border-b bg-background p-5">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      My Bid
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize',
                        myBid.status === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                        myBid.status === 'accepted' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        myBid.status === 'rejected' && 'border-red-200 bg-red-50 text-red-700'
                      )}
                    >
                      {myBid.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="rounded-lg border bg-background p-4">
                    <p className="text-xs text-muted-foreground">Bid amount</p>
                    <p className="mt-1 text-2xl font-semibold">{formatMoney(myBid.bidAmount)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Delivery by {formatDateOnly(myBid.estimatedDeliveryDate)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPriceHistory(myBid)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    View Price History
                  </button>

                  {myBid.rejectionReason && (
                    <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{myBid.rejectionReason}</span>
                    </div>
                  )}

                  {myBid.status === 'pending' && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleOpenNegotiationCenter(myBid)}
                        disabled={openingNegotiationBidId === myBid._id}
                      >
                        {openingNegotiationBidId === myBid._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        Negotiate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setUpdatingBidId(myBid._id)
                          setUpdatingAmount(myBid.bidAmount.toString())
                          setShowUpdateModal(true)
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                          setDeletingBidId(myBid._id)
                          setShowDeleteConfirm(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Withdraw
                      </Button>
                    </div>
                  )}

                  {myBid.status === 'accepted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      disabled={!loadOwnerUserId}
                      onClick={() => handleOpenNegotiationCenter(myBid)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat with Admin
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </Layout.Body>

      <Sheet open={showNegotiationCenter} onOpenChange={setShowNegotiationCenter}>
        <SheetContent
          side="right"
          className="h-[100dvh] w-full overflow-hidden border-l border-slate-200 bg-[#f6f8fb] p-0 sm:max-w-[min(1120px,96vw)]"
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbfc_100%)] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4">
                <div className="space-y-2 pr-8">
                  <Badge variant="outline" className="w-fit rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                    Negotiation Center
                  </Badge>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">{activeNegotiationTitle}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      Discuss rates, upload documents, reply to messages, and manage negotiation activity with the same chat experience as the main conversations view.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Load</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{load?.loadNumber || 'N/A'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Route</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{pickupCity} to {deliveryCity}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bid Amount</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {activeNegotiationBid ? formatMoney(activeNegotiationBid.bidAmount) : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Status</p>
                    <div className="mt-1">
                      {activeNegotiationBid?.status ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize',
                            activeNegotiationBid.status === 'pending' && 'border-amber-200 bg-amber-50 text-amber-700',
                            activeNegotiationBid.status === 'accepted' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                            activeNegotiationBid.status === 'rejected' && 'border-red-200 bg-red-50 text-red-700'
                          )}
                        >
                          {activeNegotiationBid.status}
                        </Badge>
                      ) : (
                        <span className="text-sm font-semibold text-slate-900">Open</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-3 sm:p-4">
              <div className="h-full min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <NegotiationChatPanel
                  conversationId={activeConversationId}
                  recipientId={activeRecipientId ? String(activeRecipientId) : null}
                  loadId={id || null}
                  title={activeNegotiationTitle}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assignment Modal - Simple & Clean */}
      <AlertDialog open={showNegotiatedAmountModal} onOpenChange={handleNegotiatedAmountModalChange}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Assign Bid
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select transporter, confirm rate, and allocate vehicles
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isAdmin && pendingBids.length > 0 ? (
            <div className="space-y-4">
              {/* Bid Selection */}
              <div className="space-y-2">
                <Label htmlFor="assign-bid-select" className="text-xs font-semibold">
                  Transporter Bid
                </Label>
                <Select value={assignBidId} onValueChange={setAssignBidId}>
                  <SelectTrigger id="assign-bid-select" className="h-9">
                    <SelectValue placeholder="Select bid to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingBids.map((bid) => (
                      <SelectItem key={bid._id} value={bid._id}>
                        {getBidTransporterName(bid)} — {formatMoney(bid.bidAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssignBid && (
                <>
                  {/* Rate Display */}
                  <div className="rounded-lg bg-slate-50 p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Original Bid</span>
                      <span className="font-semibold">{formatMoney(selectedAssignBid.bidAmount)}</span>
                    </div>
                    {selectedAssignBid.rateDetails?.finalConfirmedRate && (
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-slate-600">Final Confirmed</span>
                        <span className="font-semibold text-emerald-700">
                          {formatMoney(selectedAssignBid.rateDetails.finalConfirmedRate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Final Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="assign-final-rate" className="text-xs font-semibold">
                      Final Rate (₹ / vehicle)
                    </Label>
                    <Input
                      id="assign-final-rate"
                      type="number"
                      min="0"
                      disabled={true}
                      value={finalConfirmedAmount}
                      onChange={(e) => setFinalConfirmedAmount(e.target.value)}
                      placeholder="Enter rate"
                      className="h-9 font-mono"
                    />
                  </div>

                  {/* Vehicle Allocation */}
                  <div className="space-y-2">
                    <Label htmlFor="assign-vehicles" className="text-xs font-semibold">
                      Vehicles ({remainingVehicles} available)
                    </Label>
                    <Input
                      id="assign-vehicles"
                      type="number"
                      min="1"
                      max={Math.max(1, Math.min(remainingVehicles || 1, selectedAssignBidRemainingVehicles || 1))}
                      value={assignVehicleCount}
                      onChange={(e) => setAssignVehicleCount(e.target.value)}
                      placeholder="1"
                      className="h-9 font-mono"
                    />
                  </div>

                  {/* Total Cost */}
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                    <p className="text-xs text-emerald-700 mb-1">Total Cost</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {finalConfirmedAmount && assignVehicleCount
                        ? formatMoney(parseFloat(finalConfirmedAmount) * parseInt(assignVehicleCount))
                        : formatMoney(0)}
                    </p>
                  </div>

                  {/* Validation Error */}
                  {(!finalConfirmedAmount || parseFloat(finalConfirmedAmount) <= 0) && (
                    <div className="flex gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 border border-red-200">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Rate must be greater than 0</span>
                    </div>
                  )}
                   
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {pendingBids.length === 0 ? 'No pending bids to assign' : 'No bids available'}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={assigning}>Cancel</AlertDialogCancel>
            <Button
              onClick={handleAssignWinner}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Assign
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Bid Modal */}
      <AlertDialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Update Bid Amount
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter your new bid amount</p>
            <Input
              type="number"
              value={updatingAmount}
              onChange={(e) => setUpdatingAmount(e.target.value)}
              disabled={submittingBid}
              min="0"
              className="mt-2"
              placeholder="Enter amount"
            />
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateBid}
              disabled={submittingBid}
              className="gap-2"
            >
              {submittingBid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submittingBid ? 'Updating...' : 'Update Bid'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeliveryConfirmModal} onOpenChange={setShowDeliveryConfirmModal}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            Confirm Delivery
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Record receiver details and POD information before closing this outbound load.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Receiver Name *</label>
                <Input
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Enter receiver name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Receiver Phone</label>
                <Input
                  value={receiverPhone}
                  onChange={(event) => setReceiverPhone(event.target.value)}
                  placeholder="Enter receiver phone"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">POD Upload *</label>
                <Input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || [])
                    setDeliveryProofFiles(files)
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Upload up to 5 files. Supported: JPG, PNG, WEBP, PDF.
                </p>
                {deliveryProofFiles.length > 0 && (
                  <div className="rounded-md border bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-700">Selected files</p>
                    <div className="mt-2 space-y-1">
                      {deliveryProofFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 text-xs text-slate-600">
                          <span className="truncate">{file.name}</span>
                          <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Delivery Remarks</label>
                <Textarea
                  value={deliveryRemarks}
                  onChange={(event) => setDeliveryRemarks(event.target.value)}
                  placeholder="Any final delivery note, shortage note, or receiver confirmation remarks"
                  className="min-h-[90px] text-sm"
                />
              </div>
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkDelivered}>
              Confirm & Mark Delivered
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Bid Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Withdraw Bid?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="text-sm">This action will withdraw your bid. You can submit a new bid later if the load is still open.</p>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdrawBid}
              disabled={submittingBid}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {submittingBid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submittingBid ? 'Withdrawing...' : 'Withdraw'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Submit Bid Modal */}
      <AlertDialog open={showBidModal} onOpenChange={setShowBidModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            Submit Your Bid
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Pricing basis</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter <span className="font-medium text-foreground">rate per vehicle</span>. Total = rate × vehicles you bid for.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    Vehicles left: {remainingVehicles}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Bid Rate (₹ / vehicle)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Enter rate per vehicle"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  disabled={submittingBid}
                  className="text-sm"
                  min="1"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {/* we assume transporter bids for 1 vehicle in this modal; backend currently stores bidAmount as bidAmount */}
                  Rate × Vehicles = Estimated Total (for 1 vehicle):{' '}
                  <span className="font-medium text-foreground">{(() => {
                    const rate = parseFloat(bidAmount)
                    if (!Number.isFinite(rate) || rate <= 0) return '₹0'
                    return `₹${rate.toLocaleString('en-IN')}`
                  })()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Comments (Optional)</label>
                <Textarea
                  placeholder="Add any relevant comments..."
                  value={bidComments}
                  onChange={(e) => setBidComments(e.target.value)}
                  disabled={submittingBid}
                  className="min-h-[70px] text-sm"
                />
              </div>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitBid}
              disabled={submittingBid}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {submittingBid ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submittingBid ? 'Submitting...' : 'Submit Bid'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advanced Price Negotiation Modal */}
      <NegotiatePriceModal
        isOpen={showAdvancedPriceModal}
        bidId={selectedBidForPricing?._id || ''}
        currentPrice={selectedBidForPricing?.bidAmount}
        isAdmin={isAdmin}
        constraints={{
          minPrice: load?.pricing?.floorPrice,
          maxPrice: load?.pricing?.ceilingPrice
        }}
        onClose={() => {
          setShowAdvancedPriceModal(false)
          setSelectedBidForPricing(null)
        }}
        onSuccess={() => {
          // Reload bids after successful price update
          getLoadDetails(id || '')
        }}
      />

      {/* Price Negotiation History Modal */}
      <PriceHistoryModal
        isOpen={showPriceHistoryModal}
        bidId={selectedBidForHistory?._id || ''}
        transporterName={selectedBidForHistory ? getBidTransporterName(selectedBidForHistory) : ''}
        onClose={() => {
          setShowPriceHistoryModal(false)
          setSelectedBidForHistory(null)
        }}
      />
    </Layout>
  )
}
