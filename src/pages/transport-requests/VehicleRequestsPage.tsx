import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useCallback,
  memo,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  IconBuildingWarehouse,
  IconDoorEnter,
  IconDoorExit,
  IconRefresh,
  IconPlus,
  IconTruck,
  IconUserCog,
  IconMapPin,
  IconAlertCircle,
  IconCheck,
  IconFileCheck,
  IconLoader,
  IconSearch,
  IconCamera,
  IconX,
  IconLayoutGrid,
  IconList,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconEye,
  IconChevronDown,
  IconPackage,
  IconUser,
  IconPhone,
  IconId,
  IconArrowLeft,
  IconArrowRight,
} from '@tabler/icons-react'

import {
  branchesService,
  Branch,
  BranchAcceptedBid,
  BranchAssignedLoad,
  BranchTransporter,
  OperationalRole,
  VehicleMovement,
  VehicleMovementGroup,
  VehicleRequestType,
} from '@/api/services/branches/branches.service'
import {
  uploadPhotos,
  deletePhoto,
  EvidenceServiceError,
} from '@/api/services/transport-requests/evidence.service'
import { Layout } from '@/components/custom/layout'
import { Button } from '@/components/custom/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { ALL_PERMISSIONS, hasPermission } from '@/lib/permissions'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { fetchVehicleLookup } from '@/features/vehicle-workflow/api'
import { fastagService } from '@/api/services/tracking/fastag.service'
import { API_ORIGIN } from '@/api/origin'
import {
  VehicleWorkflowDraft,
  VehicleWorkflowPhoto,
} from '@/features/vehicle-workflow/types'
import { validateVehicleWorkflowDraft } from '@/features/vehicle-workflow/validation'
import { VehicleWorkflowSection } from '@/features/vehicle-workflow/components/VehicleWorkflowSection'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'

// ─────────────────────────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────

type MovementChecks = {
  checkedTransporter: boolean
  checkedVehicle: boolean
  checkedRoute: boolean
  checkedBid: boolean
  rcBook: boolean
  insurance: boolean
  permit: boolean
  puc: boolean
  fitness: boolean
  driverLicense: boolean
  loadingComplete: boolean
  documentsReturned: boolean
  sealChecked: boolean
  exitApproved: boolean
}

type MovementFormState = {
  branchId: string
  loadId: string
  bidId: string
  transporterId: string
  transporterName: string
  vehicleNumber: string
  driverName: string
  driverPhone: string
  fromDestination: string
  toDestination: string
  requestType: VehicleRequestType
  purpose: string
  expectedAt: string
}

type ValidationErrors = Partial<Record<keyof MovementFormState, string>>

interface ConfirmDialogState {
  open: boolean
  action: 'reject' | 'cancel' | null
  movementId: string | null
  message: string
}

interface GateInModalState {
  open: boolean
  movementId: string | null
}

interface GateOutModalState {
  open: boolean
  movementId: string | null
}

interface PaginationState {
  page: number
  limit: number
  total: number
  pages: number
}

interface LoadRequirementGroup {
  key: string
  label: string
  load?: BranchAssignedLoad
  movements: VehicleMovement[]
  transporters: Record<
    string,
    { key: string; name: string; movements: VehicleMovement[] }
  >
}

type ComplianceCheckKind = 'FASTAG' | 'VAHAN' | 'echallanByVehicle'
type ComplianceStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error'
type ViewMode = 'grid' | 'table'
type MovementAction =
  | 'gate-in'
  | 'verify'
  | 'reject'
  | 'gate-out'
  | 'reopen'
  | 'cancel'

interface ComplianceCheckResult {
  kind: ComplianceCheckKind
  status: ComplianceStatus
  title: string
  message: string
  checkedAt?: string
  details: string[]
}

interface MovementEvidencePhoto {
  id: string
  name: string
  previewUrl: string
  addedAt: string
  file?: File
}

interface MovementEvidenceState {
  gateIn: MovementEvidencePhoto[]
  gateOut: MovementEvidencePhoto[]
}

const resolvePhotoUrl = (url?: string) => {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url
  }
  return `${API_ORIGIN}/${url.replace(/^\//, '')}`
}

// Helper: Convert backend evidence format to frontend format
const convertBackendEvidencePhoto = (
  photo: any,
  index: number,
  phase: 'gateIn' | 'gateOut'
): MovementEvidencePhoto => {
  const realId = photo._id || photo.id || `${phase}-${index}`
  return {
    id: `saved-${realId}`,
    name: photo.name || photo.originalFileName || `photo-${index}.jpg`,
    previewUrl: resolvePhotoUrl(photo.url || photo.path),
    addedAt: photo.uploadedAt || photo.createdAt || new Date().toISOString(),
  }
}

const createEmptyVehicleWorkflowDraft = (): VehicleWorkflowDraft => ({
  lookupStatus: 'idle',
  lookupMessage: 'Retrieve vehicle details before final review.',
  lookupResult: null,
  photos: [],
})

interface MovementFiltersState {
  search: string
  status: string[]
  transporterId: string[]
  loadId: string[]
  dateRange?: { from: string; to: string }
  vehicleType?: string
}

const DEFAULT_MOVEMENT_CHECKS: MovementChecks = {
  checkedTransporter: false,
  checkedVehicle: false,
  checkedRoute: false,
  checkedBid: false,
  rcBook: false,
  insurance: false,
  permit: false,
  puc: false,
  fitness: false,
  driverLicense: false,
  loadingComplete: false,
  documentsReturned: false,
  sealChecked: false,
  exitApproved: false,
}

const VALIDATION_RULES = {
  PHONE: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Enter a valid 10-digit phone number',
  },
  VEHICLE_NUMBER: {
    pattern: /^[A-Z]{2}\d{2}[A-Z]{0,2}\d{4}$/,
    message: 'e.g. GJ01AB1234',
  },
} as const

export const ROLE_CONFIG: Record<
  OperationalRole | 'none',
  { label: string; icon: ReactNode; description: string }
> = {
  none: {
    label: 'No branch duty',
    icon: null,
    description: 'No active branch assignment',
  },
  branch_manager: {
    label: 'Branch Manager',
    icon: <IconUserCog className='h-3.5 w-3.5' />,
    description: 'Full operational control',
  },
  watchman: {
    label: 'Watchman',
    icon: <IconDoorEnter className='h-3.5 w-3.5' />,
    description: 'Expected entry and gate in',
  },
  inspection_officer: {
    label: 'Inspection Officer',
    icon: <IconFileCheck className='h-3.5 w-3.5' />,
    description: 'Inspection and gate out approval',
  },
}

const REQUEST_TYPE_CONFIG: Record<
  VehicleRequestType,
  {
    title: string
    shortLabel: string
    purposeOptions: string[]
    defaultPurpose: string
  }
> = {
  outbound: {
    title: 'Outbound Load Requests',
    shortLabel: 'Outbound',
    purposeOptions: ['loading', 'pickup', 'delivery', 'other'],
    defaultPurpose: 'loading',
  },
  inbound: {
    title: 'Inbound Load Requests',
    shortLabel: 'Inbound',
    purposeOptions: ['unloading', 'delivery', 'maintenance', 'other'],
    defaultPurpose: 'unloading',
  },
}

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  expected: {
    label: 'Expected',
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  gate_in_recorded: {
    label: 'Inside Plant',
    dot: 'bg-amber-500',
    badge:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  inspection_verified: {
    label: 'Approved',
    dot: 'bg-emerald-500',
    badge:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  inspection_rejected: {
    label: 'Rejected',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
  gate_out_recorded: {
    label: 'Exited',
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-rose-300',
    badge: 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400',
  },
}

// ─────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

const getRefId = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'object' && '_id' in value)
    return String((value as any)._id || '')
  return String(value)
}

const normalizeVehicleNumber = (value?: string) =>
  String(value || '')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()

const vehicleNumbersMatch = (actual?: string, expected?: string) => {
  if (!expected) return true
  if (!actual) return false
  return normalizeVehicleNumber(actual) === normalizeVehicleNumber(expected)
}

const formatMoney = (amount?: number, currency = 'INR') => {
  if (typeof amount !== 'number' || isNaN(amount)) return '—'
  return currency === 'INR'
    ? `₹${amount.toLocaleString('en-IN')}`
    : `${currency} ${amount.toLocaleString()}`
}

const formatDateTime = (
  value?: string,
  format: 'full' | 'dateOnly' | 'timeOnly' = 'full'
) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-IN', {
      ...(format !== 'timeOnly'
        ? { day: '2-digit', month: 'short', year: 'numeric' }
        : {}),
      ...(format !== 'dateOnly' ? { hour: '2-digit', minute: '2-digit' } : {}),
    } as any)
  } catch {
    return '—'
  }
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback

const getLoadVehicleLimit = (load?: BranchAssignedLoad) => {
  const n = Number(load?.numberOfVehicles)
  return !isNaN(n) && n >= 1 ? n : 1
}

const getOpenAcceptedBids = (load?: BranchAssignedLoad) =>
  (load?.acceptedBids || []).filter((bid: any) => {
    const remaining = Number(bid?.remainingAllocatedVehicles)
    const allocated = Number(bid?.allocatedVehicles)
    if (!isNaN(remaining)) return remaining > 0
    if (!isNaN(allocated)) return allocated > 0
    return true
  })

const getBidTransporterId = (bid?: BranchAcceptedBid) => {
  if (!bid) return ''
  if (typeof bid.transporterId === 'object')
    return (bid.transporterId as any)._id || ''
  return bid.transporterId || ''
}

const getMovementLoadNumber = (movement: VehicleMovement) =>
  (typeof movement.loadId === 'object'
    ? (movement.loadId as any)?.loadNumber
    : '') ||
  movement.referenceSnapshot?.loadNumber ||
  ''

const getMovementTransporterName = (movement: VehicleMovement) =>
  movement.transporterName ||
  (typeof movement.transporterId === 'object'
    ? (movement.transporterId as any).companyName ||
    (movement.transporterId as any).name ||
    (movement.transporterId as any).email
    : '') ||
  ''

const getMovementDpNumber = (movement: VehicleMovement) => {
  const load =
    movement.loadId && typeof movement.loadId === 'object'
      ? (movement.loadId as any)
      : null

  return (
    load?.dpNum ||
    movement.referenceSnapshot?.dpNum ||
    (movement as any)?.dpNum ||
    'NA'
  )
}

const getMovementChecks = (
  checks?: Partial<MovementChecks>
): MovementChecks => ({ ...DEFAULT_MOVEMENT_CHECKS, ...(checks || {}) })

const getSavedMovementChecks = (
  movement: VehicleMovement
): Partial<MovementChecks> => ({
  checkedTransporter: !!movement.inspection?.checkedTransporter,
  checkedVehicle: !!movement.inspection?.checkedVehicle,
  checkedRoute: !!movement.inspection?.checkedRoute,
  checkedBid: !!movement.inspection?.checkedBid,
  rcBook: !!movement.inspection?.documents?.rcBook,
  insurance: !!movement.inspection?.documents?.insurance,
  permit: !!movement.inspection?.documents?.permit,
  puc: !!movement.inspection?.documents?.puc,
  fitness: !!movement.inspection?.documents?.fitness,
  driverLicense: !!movement.inspection?.documents?.driverLicense,
  loadingComplete: !!movement.gateOut?.checks?.loadingComplete,
  documentsReturned: !!movement.gateOut?.checks?.documentsReturned,
  sealChecked: !!movement.gateOut?.checks?.sealChecked,
  exitApproved: !!movement.gateOut?.checks?.exitApproved,
})

const getMovementRequestType = (
  movement: VehicleMovement
): VehicleRequestType =>
  movement.requestType || movement.referenceSnapshot?.requestType || 'outbound'

const getStatusCount = (
  movements: VehicleMovement[],
  status: VehicleMovement['status']
) => movements.filter((m) => m.status === status).length

const getComplianceSeed = (vehicleNumber?: string) =>
  normalizeVehicleNumber(vehicleNumber)
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0)

const buildMockComplianceResult = (
  vehicleNumber: string,
  kind: ComplianceCheckKind
): ComplianceCheckResult => {
  const normalized = normalizeVehicleNumber(vehicleNumber)
  const seed = getComplianceSeed(normalized)
  const checkedAt = new Date().toISOString()

  if (!normalized) {
    return {
      kind,
      status: 'error',
      title:
        kind === 'FASTAG' ? 'FASTag' : kind === 'VAHAN' ? 'VAHAN' : 'E-Challan',
      message: 'Enter vehicle number to run this check.',
      checkedAt,
      details: [],
    }
  }

  if (kind === 'FASTAG') {
    const status: ComplianceStatus = seed % 5 === 0 ? 'warning' : 'success'
    return {
      kind,
      status,
      title: 'FASTag Movement',
      message:
        status === 'warning'
          ? 'Recent tag activity is delayed. Manual verification suggested.'
          : 'Last toll movement looks valid for this trip.',
      checkedAt,
      details: [
        `Vehicle: ${normalized}`,
        `Last plaza: ${seed % 2 === 0 ? 'Surat Toll Gate' : 'Ahmedabad Ring Plaza'}`,
        `Movement age: ${(seed % 6) + 1} hour(s)`,
      ],
    }
  }

  if (kind === 'VAHAN') {
    const status: ComplianceStatus = seed % 4 === 0 ? 'warning' : 'success'
    return {
      kind,
      status,
      title: 'VAHAN Documents',
      message:
        status === 'warning'
          ? 'Permit or fitness is nearing expiry.'
          : 'Registration and document profile look valid.',
      checkedAt,
      details: [
        `RC status: Active`,
        `Insurance: Valid for ${(seed % 9) + 2} month(s)`,
        `Fitness: ${status === 'warning' ? 'Expires soon' : 'Valid'}`,
      ],
    }
  }

  const challanCount = seed % 3
  return {
    kind,
    status: challanCount > 0 ? 'warning' : 'success',
    title: 'E-Challan Review',
    message:
      challanCount > 0
        ? `${challanCount} pending challan(s) found. Review before gate out.`
        : 'No pending challans found.',
    checkedAt,
    details: [
      `Pending challans: ${challanCount}`,
      `Outstanding amount: ${formatMoney(challanCount * 500)}`,
      `Source: Mocked frontend preview for backend tracking integration`,
    ],
  }
}

const getComplianceTone = (status: ComplianceStatus) => {
  switch (status) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400'
    case 'warning':
      return 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300'
    case 'error':
      return 'border-rose-200 bg-rose-50/70 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-300'
    case 'loading':
      return 'border-sky-200 bg-sky-50/70 text-sky-700 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-300'
    default:
      return 'border-border/50 bg-muted/20 text-muted-foreground'
  }
}

const getLoadGroupTone = (movements: VehicleMovement[]) => {
  if (movements.some((m) => m.status === 'inspection_rejected'))
    return 'border-rose-200/70 bg-rose-50/40 dark:border-rose-900/30 dark:bg-rose-950/10'
  if (movements.some((m) => m.status === 'gate_in_recorded'))
    return 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10'
  if (movements.some((m) => m.status === 'inspection_verified'))
    return 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/10'
  return 'border-border/50 bg-background'
}

const getMovementPriority = (status: VehicleMovement['status']) => {
  switch (status) {
    case 'inspection_rejected':
      return 0
    case 'gate_in_recorded':
      return 1
    case 'inspection_verified':
      return 2
    case 'expected':
      return 3
    case 'cancelled':
      return 5
    case 'gate_out_recorded':
      return 6
    default:
      return 4
  }
}

const getRowAccent = (status: VehicleMovement['status']) => {
  switch (status) {
    case 'inspection_rejected':
      return 'border-l-rose-500'
    case 'gate_in_recorded':
      return 'border-l-amber-500'
    case 'inspection_verified':
      return 'border-l-emerald-500'
    case 'expected':
      return 'border-l-slate-400'
    default:
      return 'border-l-transparent'
  }
}

const buildTransporterGroups = (movements: VehicleMovement[]) =>
  movements.reduce<
    Record<string, { key: string; name: string; movements: VehicleMovement[] }>
  >((acc, movement) => {
    const name = getMovementTransporterName(movement) || 'Unknown'
    const key = getRefId(movement.transporterId) || name
    if (!acc[key]) acc[key] = { key, name, movements: [] }
    acc[key].movements.push(movement)
    return acc
  }, {})

const normalizeBackendLoadGroups = (
  groups: VehicleMovementGroup[] | undefined,
  assignedLoads: BranchAssignedLoad[]
): LoadRequirementGroup[] => {
  if (!groups?.length) return []

  const loadLookup = new Map(assignedLoads.map((load) => [String(load._id), load]))

  return groups.map((group, index) => {
    const movements = Array.isArray(group.movements) ? group.movements : []
    const firstMovement = movements[0]
    const loadId = getRefId(group.load?._id || firstMovement?.loadId)
    const resolvedLoad = group.load || (loadId ? loadLookup.get(loadId) : undefined)
    const label =
      group.label ||
      resolvedLoad?.loadNumber ||
      (firstMovement ? getMovementLoadNumber(firstMovement) : '') ||
      `Load Group ${index + 1}`

    return {
      key: group.key || loadId || `group-${index + 1}`,
      label,
      load: resolvedLoad,
      movements,
      transporters:
        group.transporters && Object.keys(group.transporters).length > 0
          ? group.transporters
          : buildTransporterGroups(movements),
    }
  })
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ─────────────────────────────────────────────────────────────
// COMPONENT DEFINITIONS
// ─────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
  required,
  error,
  description,
  className,
}: {
  label: string
  children: ReactNode
  required?: boolean
  error?: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
        {label} {required && <span className='text-red-500'>*</span>}
      </Label>
      {children}
      {error && <p className='text-[10px] font-medium text-red-500'>{error}</p>}
      {description && !error && (
        <p className='text-[9px] text-muted-foreground'>{description}</p>
      )}
    </div>
  )
}

const StatusBadge = memo(function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    badge: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        cfg.badge,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
})

function ActionBtn({
  label,
  icon,
  onClick,
  disabled,
  loading,
  variant = 'outline',
}: {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'outline' | 'primary' | 'destructive' | 'blue'
}) {
  return (
    <Button
      type='button'
      size='sm'
      variant={
        variant === 'primary'
          ? 'default'
          : variant === 'destructive'
            ? 'destructive'
            : 'outline'
      }
      className={cn(
        'h-7 gap-1 rounded-full px-3 text-[10px] font-semibold uppercase tracking-wide',
        variant === 'blue' && 'bg-blue-600 text-white hover:bg-blue-700'
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled || loading}
    >
      {loading ? <IconLoader className='h-3 w-3 animate-spin' /> : icon}
      {label}
    </Button>
  )
}

function InfoPill({
  label,
  value,
}: {
  label: string
  value?: string | number
}) {
  return (
    <div className='min-w-0'>
      <p className='text-[9px] font-semibold uppercase tracking-wider text-muted-foreground'>
        {label}
      </p>
      <p className='mt-0.5 truncate text-[12px] font-medium text-foreground'>
        {value || '—'}
      </p>
    </div>
  )
}

function ComplianceCheckItem({
  result,
  onRun,
  loading,
}: {
  result?: ComplianceCheckResult
  onRun: () => void
  loading: boolean
}) {
  const label = result?.title || 'External Check'
  const showTone = getComplianceTone(result?.status || 'idle')

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border p-3 shadow-sm transition-all',
        showTone
      )}
    >
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-bold leading-none'>{label}</p>
          <p className='mt-1 truncate text-[10px] leading-tight opacity-90'>
            {result?.message || 'Check database profile matches local records.'}
          </p>
        </div>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={(e) => {
            e.stopPropagation()
            onRun()
          }}
          disabled={loading}
          className='h-6 shrink-0 gap-1 rounded-md px-2 text-[10px] font-semibold hover:bg-black/5 dark:hover:bg-white/5'
        >
          {loading ? (
            <IconLoader className='h-3 w-3 animate-spin' />
          ) : (
            <IconRefresh className='h-3 w-3' />
          )}
          Run
        </Button>
      </div>
      {result && result.details.length > 0 && (
        <div className='space-y-0.5 rounded-lg bg-black/5 p-2 font-mono text-[10px] leading-relaxed dark:bg-white/5'>
          {result.details.map((line, i) => (
            <p key={i} className='truncate'>
              {line}
            </p>
          ))}
          {result.checkedAt && (
            <p className='mt-1 text-right font-sans text-[9px] opacity-75'>
              Checked: {formatDateTime(result.checkedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface EvidencePhotoUploaderProps {
  photos: MovementEvidencePhoto[]
  onAdd: (files: FileList | null) => void | Promise<void>
  onRemove: (id: string) => void | Promise<void>
  disabled?: boolean
  isUploading?: boolean
}

function EvidencePhotoUploader({
  photos,
  onAdd,
  onRemove,
  disabled,
  isUploading,
}: EvidencePhotoUploaderProps) {
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleAdd = async (files: FileList | null) => {
    const result = onAdd(files)
    if (result instanceof Promise) {
      await result
    }
  }

  const handleRemove = async (id: string) => {
    try {
      setIsRemoving(id)
      const result = onRemove(id)
      if (result instanceof Promise) {
        await result
      }
    } finally {
      setIsRemoving(null)
    }
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <span className='text-[11px] font-semibold text-slate-700 dark:text-slate-300'>
          Evidence Photos
        </span>
        <label
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/10',
            (disabled || isUploading) && 'pointer-events-none opacity-50'
          )}
        >
          {isUploading ? (
            <>
              <IconLoader className='h-3.5 w-3.5 animate-spin' /> Uploading…
            </>
          ) : (
            <>
              <IconCamera className='h-3.5 w-3.5' /> Take / Upload
            </>
          )}
          <input
            type='file'
            multiple
            accept='image/*'
            capture='environment'
            className='hidden'
            onChange={(e) => handleAdd(e.target.files)}
            disabled={disabled || isUploading}
          />
        </label>
      </div>
      {photos.length > 0 ? (
        <div className='grid grid-cols-4 gap-2'>
          {photos.map((p) => (
            <div
              key={p.id}
              className='group relative aspect-square overflow-hidden rounded-lg border bg-muted shadow-sm'
            >
              <img
                src={p.previewUrl}
                alt={p.name}
                className='h-full w-full object-cover'
              />
              <button
                type='button'
                onClick={() => handleRemove(p.id)}
                disabled={isRemoving === p.id}
                className='absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-colors hover:bg-black/80 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100'
              >
                {isRemoving === p.id ? (
                  <IconLoader className='h-3 w-3 animate-spin' />
                ) : (
                  <IconX className='h-3 w-3' />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className='rounded-lg border border-dashed bg-slate-50/50 py-5 text-center text-[10px] text-muted-foreground'>
          No checkpoint evidence photos uploaded
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SKELETONS & DEFAULT STATES
// ─────────────────────────────────────────────────────────────

function VehicleTableSkeleton() {
  return (
    <div className='space-y-3 p-3'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className='flex items-center justify-between gap-4 border-b pb-3'
        >
          <div className='flex items-center gap-3'>
            <Skeleton className='h-9 w-9 rounded-full' />
            <div className='space-y-1'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-2 w-48' />
            </div>
          </div>
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>
      ))}
    </div>
  )
}

function VehicleGridSkeleton() {
  return (
    <div className='grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className='overflow-hidden border border-border/50'>
          <CardContent className='space-y-3 p-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-9 w-9 rounded-full' />
                <div className='space-y-1'>
                  <Skeleton className='h-3.5 w-20' />
                  <Skeleton className='h-2.5 w-16' />
                </div>
              </div>
              <Skeleton className='h-5 w-16 rounded-full' />
            </div>
            <Skeleton className='h-3 w-full' />
            <div className='grid grid-cols-3 gap-2'>
              <Skeleton className='h-9 w-full rounded-md' />
              <Skeleton className='h-9 w-full rounded-md' />
              <Skeleton className='h-9 w-full rounded-md' />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({
  message,
  description,
  icon,
  action,
}: {
  message: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className='flex flex-col items-center justify-center px-4 py-12 text-center'>
      <div className='mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground'>
        {icon || <IconBuildingWarehouse className='h-6 w-6' />}
      </div>
      <p className='text-sm font-semibold'>{message}</p>
      {description && (
        <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
          {description}
        </p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// GRID CARD
// ─────────────────────────────────────────────────────────────

interface VehicleGridCardProps {
  movement: VehicleMovement
  canGateIn: boolean
  canInspectMovement: boolean
  canGateOut: boolean
  saving: boolean
  operationLoading: Record<string, boolean>
  onAction: (id: string, action: MovementAction) => void
  onExpand: (id: string) => void
}

const VehicleGridCard = memo(function VehicleGridCard({
  movement,
  canGateIn,
  canInspectMovement,
  canGateOut,
  saving,
  operationLoading,
  onAction,
  onExpand,
}: VehicleGridCardProps) {
  const requestType = getMovementRequestType(movement)
  const requestMeta = REQUEST_TYPE_CONFIG[requestType]
  const branchName =
    typeof movement.branchId === 'object'
      ? movement.branchId?.name || movement.branchId?.code
      : ''

  const isLoading = operationLoading[movement._id] || false

  return (
    <Card className='overflow-hidden border-border/50 bg-white transition-shadow hover:shadow-md dark:bg-slate-900'>
      <CardContent className='space-y-3 p-4'>
        {/* Vehicle header */}
        <div className='flex items-start justify-between'>
          <div className='flex min-w-0 items-center gap-2'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
              <IconTruck className='h-5 w-5 text-primary' />
            </div>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold'>
                {movement.vehicleNumber}
              </p>
              <p className='truncate text-xs text-muted-foreground'>
                {movement.driverName || 'No driver'}
              </p>
            </div>
          </div>
          <StatusBadge status={movement.status} />
        </div>

        {/* Route info */}
        <div className='space-y-1'>
          <div className='flex items-center gap-1 text-muted-foreground'>
            <IconMapPin className='h-3 w-3 shrink-0' />
            <span className='truncate text-xs'>
              {movement.fromDestination || 'Origin'} →{' '}
              {movement.toDestination || 'Destination'}
            </span>
          </div>
          <div className='flex flex-wrap items-center gap-1 text-xs text-muted-foreground'>
            <span>{getMovementTransporterName(movement)}</span>
            <span>•</span>
            <span>{requestMeta.shortLabel}</span>
            {branchName && (
              <>
                <span>•</span>
                <span className='truncate'>{branchName}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className='grid grid-cols-3 gap-2'>
          <div className='rounded-md bg-muted/50 p-2 text-center'>
            <p className='text-[9px] font-bold uppercase leading-none text-muted-foreground'>
              Purpose
            </p>
            <p className='mt-1 truncate text-[11px] font-semibold capitalize text-foreground'>
              {movement.purpose || 'Delivery'}
            </p>
          </div>
          <div className='col-span-2 rounded-md bg-muted/50 p-2 text-center'>
            <p className='text-[9px] font-bold uppercase leading-none text-muted-foreground'>
              Expected arrival
            </p>
            <p className='mt-1 truncate text-[11px] font-semibold text-foreground'>
              {formatDateTime(movement.expectedAt)}
            </p>
          </div>
        </div>

        {/* Action strip */}
        <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-1'>
          <div className='flex items-center gap-1.5'>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 gap-1 rounded-full text-xs font-semibold'
              onClick={() => onExpand(movement._id)}
            >
              <IconEye className='h-3.5 w-3.5' /> Details
            </Button>
            {movement.driverPhone && (
              <Button
                variant='outline'
                size='sm'
                className='h-8 gap-1 rounded-full border-teal-500/30 bg-teal-50/50 text-xs font-semibold text-teal-600 hover:bg-teal-100/50'
                onClick={() =>
                  window.open(`/tracking/${movement._id}`, '_blank')
                }
              >
                <IconTruck className='h-3.5 w-3.5' /> Track Live
              </Button>
            )}
          </div>

          <div className='flex items-center gap-1'>
            {movement.status === 'expected' && canGateIn && (
              <ActionBtn
                label='Gate In'
                icon={<IconDoorEnter className='h-3 w-3' />}
                onClick={() => onAction(movement._id, 'gate-in')}
                disabled={saving}
                loading={isLoading}
                variant='primary'
              />
            )}
            {movement.status === 'gate_in_recorded' && canInspectMovement && (
              <ActionBtn
                label='Inspect'
                icon={<IconFileCheck className='h-3.5 w-3.5' />}
                onClick={() => onAction(movement._id, 'verify')}
                disabled={saving}
                loading={isLoading}
                variant='primary'
              />
            )}
            {movement.status === 'inspection_verified' && canGateOut && (
              <ActionBtn
                label='Gate Out'
                icon={<IconDoorExit className='h-3 w-3' />}
                onClick={() => onAction(movement._id, 'gate-out')}
                disabled={saving}
                loading={isLoading}
                variant='blue'
              />
            )}
            {movement.status === 'inspection_rejected' &&
              canInspectMovement && (
                <ActionBtn
                  label='Reopen'
                  icon={<IconRefresh className='h-3 w-3' />}
                  onClick={() => onAction(movement._id, 'reopen')}
                  disabled={saving}
                  loading={isLoading}
                  variant='outline'
                />
              )}
            {(movement.status === 'expected' ||
              movement.status === 'inspection_rejected') &&
              (canGateIn || canInspectMovement) && (
                <ActionBtn
                  label='Cancel'
                  icon={<IconX className='h-3 w-3' />}
                  onClick={() => onAction(movement._id, 'cancel')}
                  disabled={saving}
                  loading={isLoading}
                  variant='destructive'
                />
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// ─────────────────────────────────────────────────────────────
// TABLE ROW
// ─────────────────────────────────────────────────────────────

interface VehicleRowProps {
  movement: VehicleMovement
  canGateIn: boolean
  canInspectMovement: boolean
  canGateOut: boolean
  saving: boolean
  operationLoading: Record<string, boolean>
  notesByMovementId: Record<string, string>
  setNotesByMovementId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  inspectionChecks: Record<string, MovementChecks>
  setInspectionCheck: (
    id: string,
    key: keyof MovementChecks,
    value: boolean
  ) => void
  runMovementAction: (id: string, action: MovementAction) => Promise<void>
  handleActionWithConfirmation: (id: string, action: MovementAction) => void
  complianceByMovementId: Record<
    string,
    Partial<Record<ComplianceCheckKind, ComplianceCheckResult>>
  >
  runComplianceCheck: (
    movement: VehicleMovement,
    kind: ComplianceCheckKind
  ) => void
  evidenceByMovementId: Record<string, MovementEvidenceState>
  addEvidencePhotos: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    files: FileList | null
  ) => void
  removeEvidencePhoto: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    photoId: string
  ) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

const VehicleRow = memo(function VehicleRow({
  movement,
  canGateIn,
  canInspectMovement,
  canGateOut,
  saving,
  operationLoading,
  inspectionChecks,
  handleActionWithConfirmation,
  complianceByMovementId,
  runComplianceCheck,
  evidenceByMovementId,
  isExpanded,
  onToggleExpand,
}: VehicleRowProps) {
  const [activePanel, setActivePanel] = useState<
    'flow' | 'vahan' | 'challan' | 'evidence'
  >('flow')

  const requestType = getMovementRequestType(movement)
  const requestMeta = REQUEST_TYPE_CONFIG[requestType]
  const branchName =
    typeof movement.branchId === 'object'
      ? movement.branchId?.name || movement.branchId?.code
      : ''

  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand()
    }
  }

  const checks = getMovementChecks(inspectionChecks[movement._id])
  const isLoading = operationLoading[movement._id] || false

  // Check state transitions
  const showGateIn = movement.status === 'expected'
  const showInspect = movement.status === 'gate_in_recorded'
  const showGateOut = movement.status === 'inspection_verified'
  const showReopen = movement.status === 'inspection_rejected'

  // Checklist validation
  const allInspDone =
    checks.rcBook &&
    checks.insurance &&
    checks.permit &&
    checks.puc &&
    checks.fitness &&
    checks.driverLicense &&
    checks.checkedTransporter &&
    checks.checkedVehicle &&
    checks.checkedRoute &&
    checks.checkedBid
  const allGateOutDone =
    checks.loadingComplete &&
    checks.documentsReturned &&
    checks.sealChecked &&
    checks.exitApproved

  const compliance = complianceByMovementId[movement._id] || {}
  const evidence = evidenceByMovementId[movement._id] || {
    gateIn: [],
    gateOut: [],
  }
  const gateInPhotos = evidence.gateIn
  const gateOutPhotos = evidence.gateOut

  const getPanelNotificationBadge = (
    kind: 'flow' | 'vahan' | 'challan' | 'evidence'
  ) => {
    if (kind === 'vahan' && compliance.VAHAN?.status === 'warning')
      return <IconAlertCircle className='h-3.5 w-3.5 shrink-0 text-amber-500' />
    if (
      kind === 'challan' &&
      compliance.echallanByVehicle?.status === 'warning'
    )
      return <IconAlertCircle className='h-3.5 w-3.5 shrink-0 text-amber-500' />
    if (kind === 'flow' && showInspect && !allInspDone)
      return <span className='h-2 w-2 shrink-0 rounded-full bg-amber-500' />
    if (kind === 'flow' && showGateOut && !allGateOutDone)
      return <span className='h-2 w-2 shrink-0 rounded-full bg-blue-500' />
    return null
  }

  const panelItems = [
    {
      key: 'flow',
      label: 'Gate workflow',
      helper: 'Verify documents and checklist',
      badge: getPanelNotificationBadge('flow'),
    },
    {
      key: 'vahan',
      label: 'VAHAN Profile',
      helper: 'National transport records',
      badge: getPanelNotificationBadge('vahan'),
    },
    {
      key: 'challan',
      label: 'E-Challan List',
      helper: 'Pending police challans',
      badge: getPanelNotificationBadge('challan'),
    },
    {
      key: 'evidence',
      label: 'Evidence Photos',
      helper: 'Photos taken at gates',
      badge: getPanelNotificationBadge('evidence'),
    },
  ] as const

  return (
    <>
      <tr
        className={cn(
          'border-l-4 transition-colors hover:bg-muted/10',
          getRowAccent(movement.status)
        )}
      >
        <td className='px-3 py-2.5'>
          <div className='flex min-w-0 items-center gap-2'>
            <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground'>
              <IconTruck className='h-4 w-4' />
            </div>
            <div className='min-w-0'>
              <p className='truncate text-[12px] font-semibold tracking-tight text-foreground'>
                {movement.vehicleNumber}
              </p>
              <p className='truncate text-[10px] text-muted-foreground'>
                {getMovementTransporterName(movement)}
              </p>
            </div>
          </div>
        </td>
        <td className='hidden px-3 py-2.5 md:table-cell'>
          <div className='min-w-0 text-[11px]'>
            <p className='truncate font-semibold text-foreground'>
              {movement.driverName || '—'}
            </p>
            <p className='truncate text-muted-foreground'>
              {movement.driverPhone || '—'}
            </p>
          </div>
        </td>
        <td className='hidden px-3 py-2.5 text-[11px] font-medium text-foreground lg:table-cell'>
          <div className='flex items-center gap-1'>
            <IconMapPin className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span className='truncate'>
              {movement.fromDestination || 'Origin'} →{' '}
              {movement.toDestination || 'Destination'}
            </span>
          </div>
          {branchName && (
            <p className='mt-0.5 truncate text-[10px] font-normal text-muted-foreground'>
              {branchName}
            </p>
          )}
        </td>
        <td className='hidden px-3 py-2.5 text-[11px] xl:table-cell'>
          <span className='font-medium capitalize text-foreground'>
            {movement.purpose || 'Delivery'}
          </span>
          <p className='mt-0.5 text-[9px] text-muted-foreground'>
            Exp: {formatDateTime(movement.expectedAt)}
          </p>
        </td>
        <td className='px-3 py-2.5'>
          <StatusBadge status={movement.status} />
        </td>
        <td className='px-3 py-2.5 text-right'>
          <div className='flex items-center justify-end gap-1.5'>
            {movement.driverPhone && (
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 rounded-full border-teal-500/30 bg-teal-50/50 text-[10px] font-bold uppercase tracking-wider text-teal-600 hover:bg-teal-100/50'
                onClick={() =>
                  window.open(`/tracking/${movement._id}`, '_blank')
                }
              >
                <IconTruck className='h-3.5 w-3.5' /> Track
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              className='h-7 gap-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground'
              onClick={toggleExpand}
            >
              <IconEye className='h-3 w-3' /> View
            </Button>
            <div className='hidden gap-1.5 sm:inline-flex'>
              {showGateIn && canGateIn && (
                <ActionBtn
                  label='Gate In'
                  icon={<IconDoorEnter className='h-3 w-3' />}
                  onClick={() =>
                    handleActionWithConfirmation(movement._id, 'gate-in')
                  }
                  disabled={saving}
                  loading={isLoading}
                  variant='primary'
                />
              )}
              {showInspect && canInspectMovement && (
                <ActionBtn
                  label='Inspect'
                  icon={<IconFileCheck className='h-3.5 w-3.5' />}
                  onClick={() =>
                    handleActionWithConfirmation(movement._id, 'verify')
                  }
                  disabled={saving}
                  loading={isLoading}
                  variant='primary'
                />
              )}
              {showGateOut && canGateOut && (
                <ActionBtn
                  label='Gate Out'
                  icon={<IconDoorExit className='h-3 w-3' />}
                  onClick={() =>
                    handleActionWithConfirmation(movement._id, 'gate-out')
                  }
                  disabled={saving || isLoading}
                  loading={isLoading}
                  variant='blue'
                />
              )}
              {showReopen && canInspectMovement && (
                <ActionBtn
                  label='Reopen'
                  icon={<IconRefresh className='h-3 w-3' />}
                  onClick={() =>
                    handleActionWithConfirmation(movement._id, 'reopen')
                  }
                  disabled={saving || isLoading}
                  loading={isLoading}
                  variant='outline'
                />
              )}
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded details dialog */}
      <Dialog
        open={isExpanded}
        onOpenChange={(open) => {
          if (!open && isExpanded) toggleExpand()
        }}
      >
        <DialogContent className='flex max-h-[85vh] w-[95vw] flex-col overflow-hidden border-border/50 bg-white p-0 data-[state=closed]:slide-out-to-top-[8%] data-[state=open]:slide-in-from-top-[8%] dark:bg-slate-900 sm:top-[50%] sm:w-full sm:max-w-6xl sm:translate-y-[-50%] sm:rounded-lg'>
          <DialogHeader className='shrink-0 flex-row items-center justify-between gap-3 border-b bg-background px-5 py-4'>
            <DialogTitle className='flex min-w-0 items-center gap-3 text-base'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                <IconTruck className='h-5 w-5 text-primary' />
              </div>
              <div className='min-w-0'>
                <p className='truncate text-base font-semibold'>
                  {movement.vehicleNumber}
                </p>
                <p className='truncate text-sm font-normal text-muted-foreground'>
                  {getMovementTransporterName(movement) ||
                    'Unknown transporter'}{' '}
                  · {movement.fromDestination || 'Origin'} →{' '}
                  {movement.toDestination || 'Destination'}
                </p>
              </div>
            </DialogTitle>
            <StatusBadge
              status={movement.status}
              className='shrink-0 text-sm'
            />
          </DialogHeader>

          <div
            role='tablist'
            className='flex shrink-0 gap-2 overflow-x-auto border-b bg-background px-5 py-3'
          >
            {panelItems.map((item) => (
              <button
                key={item.key}
                type='button'
                role='tab'
                aria-selected={activePanel === item.key}
                onClick={() => setActivePanel(item.key)}
                className={cn(
                  'flex shrink-0 flex-col items-start rounded-lg border px-4 py-2 text-left transition-colors',
                  activePanel === item.key
                    ? 'bg-primary/8 border-primary ring-1 ring-primary/20'
                    : 'border-transparent bg-transparent hover:bg-muted/60'
                )}
              >
                <div className='flex items-center gap-1'>
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      activePanel === item.key
                        ? 'text-primary'
                        : 'text-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badge}
                </div>
                <span className='hidden text-xs text-muted-foreground sm:block'>
                  {item.helper}
                </span>
              </button>
            ))}
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto bg-slate-50/50 px-4 py-4 dark:bg-slate-950/20 sm:px-6 sm:py-5'>
            <div className='grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'>
              <div className='space-y-4'>
                <div className='rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm dark:bg-slate-950/50'>
                  <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
                    <InfoPill
                      label='Load Number'
                      value={getMovementLoadNumber(movement) || 'Manual Entry'}
                    />
                    <InfoPill
                      label='Request Type'
                      value={requestMeta.shortLabel}
                    />
                    <InfoPill
                      label='Scheduled'
                      value={formatDateTime(movement.expectedAt) || 'Not set'}
                    />
                    <InfoPill
                      label='Evidence'
                      value={`${gateInPhotos.length + gateOutPhotos.length} refs`}
                    />
                  </div>
                </div>

                <div className='space-y-3 rounded-2xl border border-border/60 bg-white/90 p-4 shadow-sm dark:bg-slate-950/50'>
                  <p className='text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'>
                    Driver Profile
                  </p>
                  <div className='flex items-center gap-2'>
                    <Avatar className='h-9 w-9'>
                      <AvatarFallback>
                        {(movement.driverName || 'D')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0'>
                      <p className='truncate text-xs font-bold'>
                        {movement.driverName || 'Driver name not set'}
                      </p>
                      <p className='truncate text-[10px] text-muted-foreground'>
                        {movement.driverPhone || 'No contact number'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Panel Content */}
              <div className='min-w-0'>
                {activePanel === 'flow' && (
                  <Card className='border border-border/60 shadow-sm'>
                    <CardHeader className='border-b bg-slate-50/20 px-4 py-3'>
                      <p className='text-xs font-semibold'>
                        Verification Checks & Action Checklists
                      </p>
                    </CardHeader>
                    <CardContent className='space-y-4 p-4'>
                      {/* Gate In Phase */}
                      <div className='space-y-2 rounded-xl border p-3'>
                        <div className='flex items-center justify-between'>
                          <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                            Phase 1: Plant Entry (Gate In)
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                              movement.gateIn?.recordedAt
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {movement.gateIn?.recordedAt
                              ? 'Completed'
                              : 'Pending'}
                          </span>
                        </div>
                        {movement.gateIn?.recordedAt && (
                          <div className='space-y-1 text-[11px] text-muted-foreground'>
                            <p>
                              Recorded At:{' '}
                              <span className='font-semibold'>
                                {formatDateTime(movement.gateIn.recordedAt)}
                              </span>
                            </p>
                            {movement.gateIn.notes && (
                              <p>
                                Gate In Notes:{' '}
                                <span className='italic'>
                                  "{movement.gateIn.notes}"
                                </span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inspection / Verification Phase */}
                      <div className='space-y-3 rounded-xl border p-3'>
                        <div className='flex items-center justify-between border-b pb-2'>
                          <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                            Phase 2: Vehicle Inspection Checklists
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                              movement.status === 'inspection_verified'
                                ? 'bg-emerald-100 text-emerald-700'
                                : movement.status === 'inspection_rejected'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {movement.status === 'inspection_verified'
                              ? 'Approved'
                              : movement.status === 'inspection_rejected'
                                ? 'Rejected'
                                : 'Awaiting Inspection'}
                          </span>
                        </div>

                        <div className='space-y-3'>
                          <div className='space-y-1.5 text-[11px] leading-relaxed text-muted-foreground'>
                            <p>
                              Status:{' '}
                              <span
                                className={cn(
                                  'font-bold capitalize',
                                  movement.status === 'inspection_verified'
                                    ? 'text-emerald-600'
                                    : movement.status === 'inspection_rejected'
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                )}
                              >
                                {movement.inspection?.status || 'pending'}
                              </span>
                            </p>
                            {movement.inspection?.verifiedAt && (
                              <p>
                                Verified At:{' '}
                                <span className='font-semibold'>
                                  {formatDateTime(
                                    movement.inspection.verifiedAt
                                  )}
                                </span>
                              </p>
                            )}
                            {movement.inspection?.notes && (
                              <p>
                                Inspection Notes:{' '}
                                <span className='italic'>
                                  "{movement.inspection.notes}"
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Static Checklist View */}
                          <div className='mt-2 grid gap-4 border-t pt-2 sm:grid-cols-2'>
                            <div className='space-y-1.5'>
                              <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                                Matching checks
                              </p>
                              {[
                                {
                                  k: 'checkedTransporter',
                                  l: 'Transporter Identity matches',
                                },
                                {
                                  k: 'checkedVehicle',
                                  l: 'Vehicle Number matches',
                                },
                                { k: 'checkedRoute', l: 'Trip Route matches' },
                                { k: 'checkedBid', l: 'Bid Details match' },
                              ].map(({ k, l }) => {
                                const isChecked =
                                  !!movement.inspection?.[
                                  k as keyof typeof movement.inspection
                                  ] || !!checks[k as keyof MovementChecks]
                                return (
                                  <div
                                    key={k}
                                    className='flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400'
                                  >
                                    <div
                                      className={cn(
                                        'flex h-4 w-4 items-center justify-center rounded-full border',
                                        isChecked
                                          ? 'border-emerald-500 bg-emerald-100 font-bold text-emerald-700'
                                          : 'border-slate-300 bg-slate-100 text-slate-400'
                                      )}
                                    >
                                      <IconCheck className='h-2.5 w-2.5 stroke-[3]' />
                                    </div>
                                    <span
                                      className={
                                        isChecked ? 'font-medium' : 'opacity-60'
                                      }
                                    >
                                      {l}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                            <div className='space-y-1.5'>
                              <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                                Documents verify
                              </p>
                              {[
                                {
                                  k: 'rcBook',
                                  l: 'Registration Certificate (RC)',
                                },
                                { k: 'insurance', l: 'Vehicle Insurance' },
                                { k: 'permit', l: 'Goods Permit' },
                                { k: 'puc', l: 'Pollution Card (PUC)' },
                                { k: 'fitness', l: 'Fitness Certificate' },
                                { k: 'driverLicense', l: 'Driver License' },
                              ].map(({ k, l }) => {
                                const isChecked =
                                  !!movement.inspection?.documents?.[
                                  k as keyof typeof movement.inspection.documents
                                  ] || !!checks[k as keyof MovementChecks]
                                return (
                                  <div
                                    key={k}
                                    className='flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400'
                                  >
                                    <div
                                      className={cn(
                                        'flex h-4 w-4 items-center justify-center rounded-full border',
                                        isChecked
                                          ? 'border-emerald-500 bg-emerald-100 font-bold text-emerald-700'
                                          : 'border-slate-300 bg-slate-100 text-slate-400'
                                      )}
                                    >
                                      <IconCheck className='h-2.5 w-2.5 stroke-[3]' />
                                    </div>
                                    <span
                                      className={
                                        isChecked ? 'font-medium' : 'opacity-60'
                                      }
                                    >
                                      {l}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gate Out Phase */}
                      <div className='space-y-3 rounded-xl border p-3'>
                        <div className='flex items-center justify-between border-b pb-2'>
                          <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                            Phase 3: Plant Exit Checklists (Gate Out)
                          </p>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                              movement.gateOut?.recordedAt
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {movement.gateOut?.recordedAt
                              ? 'Completed'
                              : 'Pending'}
                          </span>
                        </div>

                        <div className='space-y-3'>
                          <div className='space-y-1.5 text-[11px] leading-relaxed text-muted-foreground'>
                            <p>
                              Status:{' '}
                              <span
                                className={cn(
                                  'font-bold capitalize',
                                  movement.gateOut?.recordedAt
                                    ? 'text-emerald-600'
                                    : 'text-slate-500'
                                )}
                              >
                                {movement.gateOut?.recordedAt
                                  ? 'Completed'
                                  : 'Pending'}
                              </span>
                            </p>
                            {movement.gateOut?.recordedAt && (
                              <>
                                <p>
                                  Recorded At:{' '}
                                  <span className='font-semibold'>
                                    {formatDateTime(
                                      movement.gateOut.recordedAt
                                    )}
                                  </span>
                                </p>
                                {movement.gateOut.notes && (
                                  <p>
                                    Gate Out Notes:{' '}
                                    <span className='italic'>
                                      "{movement.gateOut.notes}"
                                    </span>
                                  </p>
                                )}
                              </>
                            )}
                          </div>

                          {/* Static Checklist View */}
                          <div className='mt-2 grid gap-3 border-t pt-2 sm:grid-cols-2'>
                            {[
                              {
                                k: 'loadingComplete',
                                l: 'Loading / Unloading Complete',
                              },
                              {
                                k: 'documentsReturned',
                                l: 'Documents Returned',
                              },
                              {
                                k: 'sealChecked',
                                l: 'Vehicle Seal & Lock Checked',
                              },
                              {
                                k: 'exitApproved',
                                l: 'Exit Clearance Approved',
                              },
                            ].map(({ k, l }) => {
                              const isChecked =
                                !!movement.gateOut?.[
                                k as keyof typeof movement.gateOut
                                ] || !!checks[k as keyof MovementChecks]
                              return (
                                <div
                                  key={k}
                                  className='flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400'
                                >
                                  <div
                                    className={cn(
                                      'flex h-4 w-4 items-center justify-center rounded-full border',
                                      isChecked
                                        ? 'border-emerald-500 bg-emerald-100 font-bold text-emerald-700'
                                        : 'border-slate-300 bg-slate-100 text-slate-400'
                                    )}
                                  >
                                    <IconCheck className='h-2.5 w-2.5 stroke-[3]' />
                                  </div>
                                  <span
                                    className={
                                      isChecked ? 'font-medium' : 'opacity-60'
                                    }
                                  >
                                    {l}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activePanel === 'vahan' && (
                  <div className='space-y-4'>
                    <ComplianceCheckItem
                      result={compliance.VAHAN}
                      loading={isLoading}
                      onRun={() => runComplianceCheck(movement, 'VAHAN')}
                    />
                  </div>
                )}

                {activePanel === 'challan' && (
                  <div className='space-y-4'>
                    <ComplianceCheckItem
                      result={compliance.echallanByVehicle}
                      loading={isLoading}
                      onRun={() =>
                        runComplianceCheck(movement, 'echallanByVehicle')
                      }
                    />
                  </div>
                )}

                {activePanel === 'evidence' && (
                  <Card className='border border-border/60 shadow-sm'>
                    <CardHeader className='border-b bg-slate-50/20 px-4 py-3'>
                      <p className='text-xs font-semibold'>
                        Checkpoint Photo Records
                      </p>
                    </CardHeader>
                    <CardContent className='space-y-4 p-4'>
                      <div className='grid gap-4 sm:grid-cols-2'>
                        {/* Gate In evidence */}
                        <div className='space-y-2.5'>
                          <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                            Gate In Photos
                          </p>
                          {gateInPhotos.length > 0 ? (
                            <PhotoGallery photos={gateInPhotos} />
                          ) : (
                            <p className='text-[10px] italic text-muted-foreground'>
                              No photos uploaded during Gate-In.
                            </p>
                          )}
                        </div>

                        {/* Gate Out evidence */}
                        <div className='space-y-2.5'>
                          <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                            Gate Out Photos
                          </p>
                          {gateOutPhotos.length > 0 ? (
                            <PhotoGallery photos={gateOutPhotos} />
                          ) : (
                            <p className='text-[10px] italic text-muted-foreground'>
                              No photos uploaded during Gate-Out.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className='shrink-0 gap-2 border-t bg-background px-5 py-4'>
            <div className='flex w-full items-center justify-between'>
              <div className='flex gap-2'>
                {showGateIn && canGateIn && (
                  <Button
                    size='sm'
                    variant='default'
                    onClick={() => {
                      toggleExpand() // Close the details view
                      handleActionWithConfirmation(movement._id, 'gate-in')
                    }}
                    className='gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700'
                  >
                    <IconDoorEnter className='h-3.5 w-3.5' />
                    Record Gate-In
                  </Button>
                )}
                {showInspect && canInspectMovement && (
                  <Button
                    size='sm'
                    variant='default'
                    onClick={() => {
                      toggleExpand() // Close the details view
                      handleActionWithConfirmation(movement._id, 'verify')
                    }}
                    className='gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700'
                  >
                    <IconFileCheck className='h-3.5 w-3.5' />
                    Inspect & Verify
                  </Button>
                )}
                {showGateOut && canGateOut && (
                  <Button
                    size='sm'
                    variant='default'
                    onClick={() => {
                      toggleExpand() // Close the details view
                      handleActionWithConfirmation(movement._id, 'gate-out')
                    }}
                    className='gap-1.5 bg-blue-600 text-white hover:bg-blue-700'
                  >
                    <IconDoorExit className='h-3.5 w-3.5' />
                    Record Gate-Out
                  </Button>
                )}
                {showReopen && canInspectMovement && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      toggleExpand() // Close the details view
                      handleActionWithConfirmation(movement._id, 'reopen')
                    }}
                    className='gap-1.5'
                  >
                    <IconRefresh className='h-3.5 w-3.5' />
                    Reopen Inspection
                  </Button>
                )}
                {movement.driverPhone && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      window.open(`/tracking/${movement._id}`, '_blank')
                    }}
                    className='gap-1.5 border-teal-500/40 text-teal-600 hover:bg-teal-50'
                  >
                    <IconTruck className='h-3.5 w-3.5' />
                    Track Live
                  </Button>
                )}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={toggleExpand}
              >
                Close Details
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
})

// ─────────────────────────────────────────────────────────────
// COMPONENT: ADVANCED FILTERS
// ─────────────────────────────────────────────────────────────

interface AdvancedFiltersProps {
  filters: MovementFiltersState
  setFilters: React.Dispatch<React.SetStateAction<MovementFiltersState>>
  activeFilterCount: number
}

function AdvancedFilters({
  filters,
  setFilters,
  activeFilterCount,
}: AdvancedFiltersProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='relative h-7 gap-1.5 rounded-lg bg-white text-[11px] dark:bg-slate-900'
        >
          <IconFilter className='h-3.5 w-3.5' /> Filters
          {activeFilterCount > 0 && (
            <span className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground'>
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-64 space-y-3 border-border/50 bg-white p-3 dark:bg-slate-900'
        align='end'
      >
        <p className='text-xs font-semibold text-foreground'>
          Advanced Filters
        </p>
        <div className='space-y-2'>
          {/* Vehicle Type Filter */}
          <div className='space-y-1'>
            <Label className='text-[10px] font-bold uppercase text-muted-foreground'>
              Vehicle Type
            </Label>
            <Input
              value={filters.vehicleType || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  vehicleType: e.target.value || undefined,
                }))
              }
              placeholder='e.g. Tanker, Flatbed'
              className='h-7 text-xs'
            />
          </div>
          {/* Date range inputs */}
          <div className='space-y-1'>
            <Label className='text-[10px] font-bold uppercase text-muted-foreground'>
              Scheduled From
            </Label>
            <Input
              type='date'
              value={filters.dateRange?.from || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: {
                    from: e.target.value,
                    to: prev.dateRange?.to || '',
                  },
                }))
              }
              className='h-7 text-xs'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-[10px] font-bold uppercase text-muted-foreground'>
              Scheduled To
            </Label>
            <Input
              type='date'
              value={filters.dateRange?.to || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: {
                    from: prev.dateRange?.from || '',
                    to: e.target.value,
                  },
                }))
              }
              className='h-7 text-xs'
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────
// COMPONENT: VIEW TOGGLE
// ─────────────────────────────────────────────────────────────

interface ViewToggleProps {
  view: ViewMode
  setView: (v: ViewMode) => void
}

function ViewToggle({ view, setView }: ViewToggleProps) {
  return (
    <div className='flex items-center gap-1 rounded-lg border bg-background p-0.5'>
      <Button
        variant={view === 'table' ? 'secondary' : 'ghost'}
        size='sm'
        className='h-6 w-6 rounded-md p-0'
        onClick={() => setView('table')}
      >
        <IconList className='h-3.5 w-3.5' />
      </Button>
      <Button
        variant={view === 'grid' ? 'secondary' : 'ghost'}
        size='sm'
        className='h-6 w-6 rounded-md p-0'
        onClick={() => setView('grid')}
      >
        <IconLayoutGrid className='h-3.5 w-3.5' />
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// VEHICLE FLOW TAB COMPONENT (INLINE FOR CLEANER PAGES)
// ─────────────────────────────────────────────────────────────

interface VehicleFlowTabProps {
  filteredMovements: VehicleMovement[]
  groupedLoadRequirements?: LoadRequirementGroup[]
  loading: boolean
  requestType: VehicleRequestType
  branches: Branch[]
  assignedLoads: BranchAssignedLoad[]
  transporters: BranchTransporter[]
  selectedBranchId: string
  setSelectedBranchId: (id: string) => void
  isBranchScopedUser: boolean
  canCreateMovement: boolean
  canGateIn: boolean
  canInspectMovement: boolean
  canGateOut: boolean
  saving: boolean
  operationLoading: Record<string, boolean>
  notesByMovementId: Record<string, string>
  setNotesByMovementId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  inspectionChecks: Record<string, MovementChecks>
  setInspectionCheck: (
    id: string,
    key: keyof MovementChecks,
    value: boolean
  ) => void
  runMovementAction: (id: string, action: MovementAction) => Promise<void>
  complianceByMovementId: Record<
    string,
    Partial<Record<ComplianceCheckKind, ComplianceCheckResult>>
  >
  runComplianceCheck: (
    movement: VehicleMovement,
    kind: ComplianceCheckKind
  ) => void
  evidenceByMovementId: Record<string, MovementEvidenceState>
  addEvidencePhotos: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    files: FileList | null
  ) => void
  removeEvidencePhoto: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    photoId: string
  ) => void
  setMovementForm: React.Dispatch<React.SetStateAction<MovementFormState>>
  resetMovementForm: (branchId?: string) => void
  setShowVehicleModal: (open: boolean) => void
  movementForm: MovementFormState
  expectedCount: number
  inspectionCount: number
  verifiedCount: number
  rejectedCount: number
  movementFilters: MovementFiltersState
  setMovementFilters: React.Dispatch<React.SetStateAction<MovementFiltersState>>
  movementPagination: PaginationState
  movementPage: number
  setMovementPage: (page: number) => void
  setMovementPageSize: (limit: number) => void
  expandedRows: Set<string>
  toggleRowExpansion: (id: string) => void
  collapsedLoadGroups: Set<string>
  toggleLoadGroup: (key: string) => void
}

function VehicleFlowTab(props: VehicleFlowTabProps) {
  const {
    filteredMovements,
    groupedLoadRequirements,
    loading,
    requestType,
    branches: _branches,
    assignedLoads,
    transporters,
    selectedBranchId: _selectedBranchId,
    setSelectedBranchId: _setSelectedBranchId,
    isBranchScopedUser: _isBranchScopedUser,
    canCreateMovement: _canCreateMovement,
    canGateIn,
    canInspectMovement,
    canGateOut,
    saving,
    operationLoading,
    notesByMovementId,
    setNotesByMovementId,
    inspectionChecks,
    setInspectionCheck,
    runMovementAction,
    complianceByMovementId,
    runComplianceCheck,
    evidenceByMovementId,
    addEvidencePhotos,
    removeEvidencePhoto,
    setMovementForm: _setMovementForm,
    resetMovementForm: _resetMovementForm,
    setShowVehicleModal: _setShowVehicleModal,
    movementForm: _movementForm,
    expectedCount: _expectedCount,
    inspectionCount: _inspectionCount,
    verifiedCount: _verifiedCount,
    rejectedCount: _rejectedCount,
    movementFilters,
    setMovementFilters,
    movementPagination,
    movementPage,
    setMovementPage,
    setMovementPageSize,
    expandedRows,
    toggleRowExpansion,
    collapsedLoadGroups,
    toggleLoadGroup,
  } = props

  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const requestMeta = REQUEST_TYPE_CONFIG[requestType]

  // Debounced search
  const debouncedSearch = useDebounce(movementFilters.search, 300)
  useEffect(() => {
    // Search is already applied through the filters
  }, [debouncedSearch])

  // Backend already paginates — use the full list as-is for grid/table grouping
  const paginatedMovements = filteredMovements
  const groupedLoads = useMemo(() => {
    if (groupedLoadRequirements && groupedLoadRequirements.length > 0) {
      return groupedLoadRequirements
    }

    const loadLookup = new Map(assignedLoads.map((l) => [String(l._id), l]))
    const groups = paginatedMovements.reduce<
      Record<
        string,
        {
          key: string
          label: string
          load?: BranchAssignedLoad
          movements: VehicleMovement[]
          transporters: Record<
            string,
            { key: string; name: string; movements: VehicleMovement[] }
          >
        }
      >
    >((acc, m) => {
      const loadId = getRefId(m.loadId)
      const load = loadId ? loadLookup.get(loadId) : undefined
      const loadLabel =
        getMovementLoadNumber(m) || load?.loadNumber || 'Manual / No Load'
      const groupKey = loadId || `manual:${loadLabel}`
      if (!acc[groupKey])
        acc[groupKey] = {
          key: groupKey,
          label: loadLabel,
          load,
          movements: [],
          transporters: {},
        }
      const name = getMovementTransporterName(m) || 'Unknown'
      const tKey = getRefId(m.transporterId) || name
      if (!acc[groupKey].transporters[tKey])
        acc[groupKey].transporters[tKey] = { key: tKey, name, movements: [] }
      acc[groupKey].movements.push(m)
      acc[groupKey].transporters[tKey].movements.push(m)
      return acc
    }, {})

    // Helper function to get the earliest expected time from a group's movements
    const getEarliestExpectedTime = (group:any) => {
      const times = group.movements
        .map((m:any) => m.expectedAt)
        .filter(Boolean)
        .map((t:any) => new Date(t))
        .filter((d:any) => !isNaN(d.getTime()))

      return times.length > 0 ? Math.min(...times) : null
    }

    // Helper to check if a group is completed (all movements done)
    const isGroupCompleted = (group: any) => {
      const total = group.movements.length
      const completed = group.movements.filter((m:any) =>
        m.status === 'gate_out_recorded' ||
        m.status === 'delivered' ||
        m.status === 'completed'
      ).length
      return total > 0 && completed === total
    }

    // Helper to check if a group has loading in progress
    const hasLoadingInProgress = (group: any) => {
      return group.movements.some((m: any) =>
        m.status === 'loading' ||
        m.status === 'in_progress' ||
        m.status === 'assigned'
      )
    }

    // Helper to check if a movement is urgent (loading within next 24 hours)
    const isUrgent = (expectedTime: any) => {
      if (!expectedTime) return false
      const now: any = new Date()
      const expected: any = new Date(expectedTime)
      const diffHours = (expected - now) / (1000 * 60 * 60)
      return diffHours >= 0 && diffHours <= 24
    }

    const sortedGroups = Object.values(groups).sort((a, b) => {
      // 1. Sort by completion status - active/in-progress first
      const aCompleted = isGroupCompleted(a)
      const bCompleted = isGroupCompleted(b)

      if (aCompleted !== bCompleted) {
        return aCompleted ? 1 : -1
      }

      // 2. Check if any movement in the group is currently in loading state
      const aLoading = hasLoadingInProgress(a)
      const bLoading = hasLoadingInProgress(b)

      if (aLoading !== bLoading) {
        return aLoading ? -1 : 1
      }

      // 3. Get earliest expected times
      const aTime = getEarliestExpectedTime(a)
      const bTime = getEarliestExpectedTime(b)

      // 4. If both have expected times, sort by time (earliest first)
      if (aTime && bTime) {
        // Check urgency (loading within 24 hours)
        const aUrgent = isUrgent(aTime)
        const bUrgent = isUrgent(bTime)

        if (aUrgent !== bUrgent) {
          return aUrgent ? -1 : 1
        }

        return aTime - bTime
      }

      // 5. If one has time and other doesn't, put the one with time first
      if (aTime && !bTime) return -1
      if (!aTime && bTime) return 1

      // 6. If no times, maintain manual vs load sorting
      const am = a.key.startsWith('manual:')
      const bm = b.key.startsWith('manual:')
      if (am !== bm) return am ? 1 : -1

      // 7. Final fallback - sort by label
      return a.label.localeCompare(b.label)
    })

    // Also sort movements within each group by expected time
    return sortedGroups.map(group => ({
      ...group,
      movements: [...group.movements].sort((a, b) => {
        const timeA: any = new Date(a.expectedAt || 0)
        const timeB: any = new Date(b.expectedAt || 0)
        return timeA - timeB
      })
    }))
  }, [assignedLoads, paginatedMovements, groupedLoadRequirements])
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (movementFilters.status.length > 0) count++
    if (movementFilters.transporterId.length > 0) count++
    if (movementFilters.loadId.length > 0) count++
    if (movementFilters.dateRange?.from || movementFilters.dateRange?.to)
      count++
    if (movementFilters.vehicleType) count++
    return count
  }, [movementFilters])

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-3'>
      <Card className='flex min-h-0 flex-1 flex-col overflow-hidden border-border/50 bg-white shadow-sm dark:bg-slate-900'>
        {/* Toolbar */}
        <div className='flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between'>
          {/* Left section - Title & Count */}
          <div className='flex min-w-0 items-center gap-3'>
            <div className='flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1'>
              <IconTruck className='h-4 w-4 shrink-0 text-primary' />
              <span className='text-sm font-semibold truncate'>
                {requestMeta.title}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {filteredMovements.length} request{filteredMovements.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Right section - Filters */}
          <div className='flex flex-wrap items-center gap-2'>
            {/* Search */}
            <div className='relative min-w-[180px] flex-1 lg:flex-none'>
              <IconSearch className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={movementFilters.search}
                onChange={(e) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
                placeholder='Search requests...'
                className='h-8 w-full rounded-md pl-8 text-xs'
              />
            </div>

            {/* Status */}
            <SearchableSelect
              value={movementFilters.status}
              onChange={(v) =>
                setMovementFilters((prev) => ({
                  ...prev,
                  status: Array.isArray(v) ? v : v ? [v] : [],
                }))
              }
              options={[
                { value: 'expected', label: 'Awaiting Entry' },
                { value: 'gate_in_recorded', label: 'In Inspection' },
                { value: 'inspection_verified', label: 'Ready To Exit' },
                { value: 'inspection_rejected', label: 'Rejected' },
                { value: 'gate_out_recorded', label: 'Completed' },
              ]}
              placeholder='Status'
              searchPlaceholder='Search status...'
              multiple
              className='h-8 min-w-[140px] text-xs'
            />

            {/* Transporter */}
            <SearchableSelect
              value={movementFilters.transporterId}
              onChange={(v) =>
                setMovementFilters((prev) => ({
                  ...prev,
                  transporterId: Array.isArray(v) ? v : v ? [v] : [],
                }))
              }
              options={transporters.map((t) => ({
                value: t._id,
                label: t.companyName || t.name || t.email || t._id,
              }))}
              placeholder='Transporter'
              searchPlaceholder='Search transporter...'
              multiple
              className='h-8 min-w-[140px] text-xs'
            />

            {/* Load Requirement */}
            <SearchableSelect
              value={movementFilters.loadId}
              onChange={(v) =>
                setMovementFilters((prev) => ({
                  ...prev,
                  loadId: Array.isArray(v) ? v : v ? [v] : [],
                }))
              }
              options={assignedLoads.map((load) => ({
                value: load._id,
                label: load.loadNumber || load._id,
              }))}
              placeholder='Load #'
              searchPlaceholder='Search load number...'
              multiple
              className='h-8 min-w-[120px] text-xs'
            />

            {/* Date Range Picker */}
            <DatePickerWithRange
              value={movementFilters.dateRange}
              onChange={(range) =>
                setMovementFilters((prev) => ({
                  ...prev,
                  dateRange: range,
                }))
              }
              className="h-8"
            />


            {/* View Toggle */}
            <ViewToggle view={viewMode} setView={setViewMode} />

            {/* Clear Button */}
            <Button
              variant='ghost'
              size='sm'
              className='h-8 px-3 text-xs text-muted-foreground hover:text-foreground'
              onClick={() =>
                setMovementFilters({
                  search: '',
                  status: [],
                  transporterId: [],
                  loadId: [],
                  vehicleType: '',
                  dateRange: undefined,
                })
              }
            >
              Clear all
            </Button>
          </div>
        </div>

        <CardContent className='p-0'>
          {loading ? (
            viewMode === 'grid' ? (
              <VehicleGridSkeleton />
            ) : (
              <VehicleTableSkeleton />
            )
          ) : filteredMovements.length === 0 ? (
            <EmptyState
              message='No load requests found'
              description='Adjust search or filters'
              icon={<IconTruck className='h-9 w-9' />}
              action={
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    setMovementFilters({
                      search: '',
                      status: [],
                      transporterId: [],
                      loadId: [],
                      vehicleType: '',
                      dateRange: undefined,
                    })
                  }
                >
                  Clear Filters
                </Button>
              }
            />
          ) : viewMode === 'grid' ? (
            // GRID VIEW with load requirement grouping
            <div
              className='space-y-6 p-4'
              style={{
                height: '75vh',
                overflow: 'scroll',
              }}
            >
              {groupedLoads.map((group) => {
                const isCollapsed = collapsedLoadGroups.has(group.key)
                const targetVehicles =
                  group.load?.numberOfVehicles || group.movements.length || 1
                const doneC = getStatusCount(
                  group.movements,
                  'gate_out_recorded'
                )
                const verC = getStatusCount(
                  group.movements,
                  'inspection_verified'
                )
                const progressValue = Math.min(
                  100,
                  Math.round(((doneC + verC) / targetVehicles) * 100)
                )

                return (
                  <div
                    key={group.key}
                    className='overflow-hidden rounded-xl border border-border/60 bg-card bg-white text-card-foreground shadow-sm dark:bg-slate-900/50'
                  >
                    {/* Collapsible header */}
                    <div
                      onClick={() => toggleLoadGroup(group.key)}
                      className='flex cursor-pointer items-center justify-between border-b bg-slate-50/50 px-4 py-2.5 transition-colors hover:bg-slate-100/60 dark:bg-slate-900/40'
                    >
                      <div className='space-y-0.5'>
                        <div className='flex items-center gap-2'>
                          {isCollapsed ? (
                            <IconChevronRight className='h-4 w-4 text-muted-foreground' />
                          ) : (
                            <IconChevronDown className='h-4 w-4 text-muted-foreground' />
                          )}
                          <span className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                            Load Requirement
                          </span>
                          <span className='text-xs font-bold text-foreground'>
                            {group.label}
                          </span>
                          {group.load?.status && (
                            <Badge
                              variant='outline'
                              className={cn(
                                'h-4 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider',
                                group.load.status === 'open' &&
                                'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                                group.load.status === 'assigned' &&
                                'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
                                group.load.status === 'in_transit' &&
                                'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
                                group.load.status === 'delivered' &&
                                'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
                                group.load.status === 'canceled' &&
                                'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                              )}
                            >
                              {group.load.status === 'assigned'
                                ? 'Assigned'
                                : group.load.status === 'in_transit'
                                  ? 'In Transit'
                                  : group.load.status}
                            </Badge>
                          )}
                        </div>
                        <p className='pl-6 text-[10px] text-muted-foreground'>
                          {group.load?.pickupLocation?.city ||
                            group.movements[0]?.fromDestination ||
                            '—'}{' '}
                          →{' '}
                          {group.load?.deliveryLocation?.city ||
                            group.movements[0]?.toDestination ||
                            '—'}
                          {group.load?.vehicleType
                            ? ` · ${group.load.vehicleType}`
                            : ''}
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='rounded-full border bg-muted/80 px-2 py-0.5 text-[10px] font-semibold'>
                          {group.movements.length} vehicle
                          {group.movements.length !== 1 ? 's' : ''}
                        </span>
                        <div className='hidden w-[100px] items-center gap-2 sm:flex'>
                          <Progress value={progressValue} className='h-1' />
                          <span className='text-[9px] font-bold text-muted-foreground'>
                            {progressValue}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible content (Grid cards) */}
                    {!isCollapsed && (
                      <div className='bg-slate-50/10 p-4 dark:bg-slate-900/5'>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                          {group.movements.map((movement) => (
                            <VehicleGridCard
                              key={movement._id}
                              movement={movement}
                              canGateIn={canGateIn}
                              canInspectMovement={canInspectMovement}
                              canGateOut={canGateOut}
                              saving={saving}
                              operationLoading={operationLoading}
                              onAction={runMovementAction}
                              onExpand={toggleRowExpansion}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // TABLE VIEW
            <div
              className='divide-y divide-border/40'
              style={{
                height: '75vh',
                overflow: 'scroll',
              }}
            >
              {groupedLoads.map((group) => {
                const expC = getStatusCount(group.movements, 'expected')
                const inspC = getStatusCount(
                  group.movements,
                  'gate_in_recorded'
                )
                const verC = getStatusCount(
                  group.movements,
                  'inspection_verified'
                )
                const rejC = getStatusCount(
                  group.movements,
                  'inspection_rejected'
                )
                const doneC = getStatusCount(
                  group.movements,
                  'gate_out_recorded'
                )
                const targetVehicles =
                  group.load?.numberOfVehicles || group.movements.length || 1
                const progressValue = Math.min(
                  100,
                  Math.round(((doneC + verC) / targetVehicles) * 100)
                )
                const isCollapsed = collapsedLoadGroups.has(group.key)
                const tGroups = Object.values(group.transporters)
                  .map((tg) => ({
                    ...tg,
                    movements: [...tg.movements].sort(
                      (a, b) =>
                        getMovementPriority(a.status) -
                        getMovementPriority(b.status) ||
                        String(a.expectedAt || a.createdAt || '').localeCompare(
                          String(b.expectedAt || b.createdAt || '')
                        )
                    ),
                  }))
                  .sort((a, b) => a.name.localeCompare(b.name))

                return (
                  <div
                    key={group.key}
                    className={cn(getLoadGroupTone(group.movements))}
                  >
                    {/* Collapsible Load group header */}
                    <div
                      onClick={() => toggleLoadGroup(group.key)}
                      className='cursor-pointer space-y-2 border-b border-black/5 bg-slate-50/50 px-3 py-2 transition-colors hover:bg-slate-100/60 dark:border-white/5'
                    >
                      <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
                        <div className='min-w-0 space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            {isCollapsed ? (
                              <IconChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
                            ) : (
                              <IconChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                            )}
                            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
                              Load Requirement
                            </span>
                            <span className='text-[13px] font-semibold text-foreground'>
                              {group.label}
                            </span>
                            {group.load?.status && (
                              <Badge
                                variant='outline'
                                className={cn(
                                  'h-4 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider',
                                  group.load.status === 'open' &&
                                  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
                                  group.load.status === 'assigned' &&
                                  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
                                  group.load.status === 'in_transit' &&
                                  'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
                                  group.load.status === 'delivered' &&
                                  'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
                                  group.load.status === 'canceled' &&
                                  'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400'
                                )}
                              >
                                {group.load.status === 'assigned'
                                  ? 'Assigned'
                                  : group.load.status === 'in_transit'
                                    ? 'In Transit'
                                    : group.load.status}
                              </Badge>
                            )}
                          </div>
                          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground'>
                            <span>
                              {group.load?.pickupLocation?.city ||
                                group.movements[0]?.fromDestination ||
                                '—'}
                              {' → '}
                              {group.load?.deliveryLocation?.city ||
                                group.movements[0]?.toDestination ||
                                '—'}
                            </span>
                            {(group.load?.vehicleType ||
                              group.load?.numberOfVehicles) && (
                                <span>
                                  {group.load?.vehicleType}
                                  {group.load?.numberOfVehicles
                                    ? ` · req ${group.load.numberOfVehicles}`
                                    : ''}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Visual Progress gauge */}
                        <div className='flex shrink-0 items-center gap-3 lg:w-[240px]'>
                          <div className='min-w-0 flex-1 space-y-1'>
                            <div className='flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                              <span>Flow progress</span>
                              <span>{progressValue}%</span>
                            </div>
                            <Progress value={progressValue} className='h-1.5' />
                          </div>
                          <span className='rounded-xl border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold'>
                            {doneC}/{targetVehicles} done
                          </span>
                        </div>
                      </div>

                      {/* Micro stats counter line */}
                      <div className='flex flex-wrap gap-1.5 pt-0.5'>
                        {[
                          {
                            label: 'Expected',
                            count: expC,
                            tone: 'text-slate-600 border-slate-100 bg-slate-50 font-semibold',
                          },
                          {
                            label: 'Inspection',
                            count: inspC,
                            tone: 'text-amber-700 border-amber-100 bg-amber-50/50 font-semibold',
                          },
                          {
                            label: 'Approved',
                            count: verC,
                            tone: 'text-emerald-700 border-emerald-100 bg-emerald-50/50 font-semibold',
                          },
                          {
                            label: 'Rejected',
                            count: rejC,
                            tone: 'text-rose-700 border-rose-100 bg-rose-50/50 font-semibold',
                          },
                          {
                            label: 'Completed',
                            count: doneC,
                            tone: 'text-slate-500 border-slate-200 bg-slate-50 font-semibold',
                          },
                        ]
                          .filter((c) => c.count > 0)
                          .map(({ label, count, tone }) => (
                            <span
                              key={label}
                              className={cn(
                                'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium leading-none',
                                tone
                              )}
                            >
                              {label}:{' '}
                              <span className='ml-0.5 font-bold'>{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Transporters & rows inside this load group */}
                    {!isCollapsed && (
                      <div className='divide-y divide-black/5 bg-slate-50/20 pl-4 dark:divide-white/5 dark:bg-slate-900/5 sm:pl-6'>
                        {tGroups.map((tg) => (
                          <div key={tg.key} className='space-y-1 py-1'>
                            <div className='px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80'>
                              {tg.name}
                            </div>
                            <table className='w-full border-collapse text-left'>
                              <tbody>
                                {tg.movements.map((m) => (
                                  <VehicleRow
                                    key={m._id}
                                    movement={m}
                                    canGateIn={canGateIn}
                                    canInspectMovement={canInspectMovement}
                                    canGateOut={canGateOut}
                                    saving={saving}
                                    operationLoading={operationLoading}
                                    notesByMovementId={notesByMovementId}
                                    setNotesByMovementId={setNotesByMovementId}
                                    inspectionChecks={inspectionChecks}
                                    setInspectionCheck={setInspectionCheck}
                                    runMovementAction={runMovementAction}
                                    handleActionWithConfirmation={
                                      runMovementAction
                                    }
                                    complianceByMovementId={
                                      complianceByMovementId
                                    }
                                    runComplianceCheck={runComplianceCheck}
                                    evidenceByMovementId={evidenceByMovementId}
                                    addEvidencePhotos={addEvidencePhotos}
                                    removeEvidencePhoto={removeEvidencePhoto}
                                    isExpanded={expandedRows.has(m._id)}
                                    onToggleExpand={() =>
                                      toggleRowExpansion(m._id)
                                    }
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Shared List Pagination */}
          {!loading && movementPagination.total > 0 && (
            <div className='flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50/50 p-4'>
              <span className='text-xs font-semibold text-muted-foreground'>
                Showing {(movementPage - 1) * movementPagination.limit + 1} -{' '}
                {Math.min(
                  movementPage * movementPagination.limit,
                  movementPagination.total
                )}{' '}
                of {movementPagination.total} load requirements
              </span>
              <div className='flex flex-wrap items-center gap-2'>
                {/* <Select
                  value={String(movementPagination.limit)}
                  onValueChange={(v) => setMovementPageSize(Number(v))}
                >
                  <SelectTrigger className='h-8 w-[100px] border-border/50 bg-white text-xs dark:bg-slate-900'>
                    <SelectValue placeholder='Per page' />
                  </SelectTrigger>
                  <SelectContent>
                    {[12, 24, 48, 96].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select> */}
                <div className='flex items-center gap-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 w-8 border-border/50 bg-white p-0 dark:bg-slate-900'
                    disabled={movementPage <= 1}
                    onClick={() =>
                      setMovementPage(Math.max(1, movementPage - 1))
                    }
                  >
                    <IconChevronLeft className='h-4 w-4' />
                  </Button>
                  <div className='flex items-center gap-1'>
                    {Array.from(
                      { length: Math.min(5, movementPagination.pages) },
                      (_, i) => {
                        const page = i + 1
                        return (
                          <Button
                            key={page}
                            variant={
                              movementPage === page ? 'default' : 'outline'
                            }
                            size='sm'
                            className='h-8 w-8 p-0 text-xs'
                            onClick={() => setMovementPage(page)}
                          >
                            {page}
                          </Button>
                        )
                      }
                    )}
                    {movementPagination.pages > 5 && (
                      <>
                        <span className='px-1 text-xs text-muted-foreground'>
                          ...
                        </span>
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-8 w-8 border-border/50 bg-white p-0 text-xs dark:bg-slate-900'
                          onClick={() =>
                            setMovementPage(movementPagination.pages)
                          }
                        >
                          {movementPagination.pages}
                        </Button>
                      </>
                    )}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-8 w-8 border-border/50 bg-white p-0 dark:bg-slate-900'
                    disabled={movementPage >= movementPagination.pages}
                    onClick={() =>
                      setMovementPage(
                        Math.min(movementPagination.pages, movementPage + 1)
                      )
                    }
                  >
                    <IconChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// VEHICLE ENTRY MODAL
// ─────────────────────────────────────────────────────────────

interface VehicleEntryModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  movementForm: MovementFormState
  setMovementForm: React.Dispatch<React.SetStateAction<MovementFormState>>
  branches: Branch[]
  transporters: BranchTransporter[]
  selectedTransporterAssignments: BranchAssignedLoad[]
  selectedLoadBids: BranchAcceptedBid[]
  needsLoadConfirmation: boolean
  validationErrors: ValidationErrors
  workflowDraft?: VehicleWorkflowDraft
  onTransporterChange: (id: string) => void
  onLoadChange: (id: string) => void
  onBidChange: (id: string) => void
  onLookupVehicle?: () => void
  onAddWorkflowPhotos?: (files: FileList | null) => void
  onRemoveWorkflowPhoto?: (photoId: string) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  saving: boolean
  manualLoadEntry: boolean
  setManualLoadEntry: (v: boolean) => void
}

function VehicleEntryModal({
  open,
  onOpenChange,
  movementForm,
  setMovementForm,
  branches,
  transporters,
  selectedTransporterAssignments,
  selectedLoadBids,
  needsLoadConfirmation,
  validationErrors,
  onTransporterChange,
  onLoadChange,
  onBidChange,
  onSubmit,
  saving,
  workflowDraft = {
    lookupStatus: 'idle',
    lookupMessage: '',
    lookupResult: null,
    photos: [],
  },
  onLookupVehicle = () => { },
  onAddWorkflowPhotos = () => { },
  onRemoveWorkflowPhoto = () => { },
}: VehicleEntryModalProps) {
  const updateField = <K extends keyof MovementFormState>(
    key: K,
    value: MovementFormState[K]
  ) => {
    setMovementForm((prev) => ({ ...prev, [key]: value }))
  }

  const hasLoads =
    !!movementForm.transporterId && selectedTransporterAssignments.length > 0
  const hasBids = !!movementForm.loadId && selectedLoadBids.length > 0

  // Compact selection card with proper alignment
  const SelectionCard = ({
    children,
    selected,
    onClick,
    className
  }: {
    children: React.ReactNode
    selected: boolean
    onClick: () => void
    className: any
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[min(96vw,920px)] flex-col overflow-hidden rounded-3xl border bg-white p-0 shadow-2xl dark:bg-slate-900">
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-5 py-3.5">
          <DialogTitle className="flex items-center gap-3 text-base font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <IconTruck className="h-5 w-5" />
            </span>
            <span className="space-y-0.5">
              <span className="block">New Vehicle Entry</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Choose the load, confirm allocation, then add vehicle details.
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2.5">

            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Branch <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={movementForm.branchId}
                  onChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v
                    updateField('branchId', val)
                      ;['loadId', 'bidId', 'transporterId', 'transporterName'].forEach(
                        (f) => updateField(f as any, '')
                      )
                  }}
                  options={branches.map((b) => ({ value: b._id, label: b.name }))}
                  placeholder="Select branch"
                  searchPlaceholder="Search branch..."
                  className="h-9 text-sm"
                />
                {validationErrors.branchId && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.branchId}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Transporter <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={movementForm.transporterId}
                  onChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v
                    onTransporterChange(val)
                  }}
                  options={transporters.map((t) => ({
                    value: t._id,
                    label: t.companyName || t.name || t.email || '',
                  }))}
                  placeholder="Select transporter"
                  searchPlaceholder="Search transporter..."
                  className="h-9 text-sm"
                />
                {validationErrors.transporterName && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.transporterName}</p>
                )}
              </div>
            </div>
          </div>
          {hasLoads && (
            <div className="space-y-3">

              {/* Header */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Select Load <span className="text-destructive">*</span>
                </label>

                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {selectedTransporterAssignments.length} Available
                </span>
              </div>

              {/* Cards */}
              <div className="grid gap-3 md:grid-cols-2">
                {selectedTransporterAssignments.map((load: any) => {
                  const selected = movementForm.loadId === load._id;

                  const route = [
                    load.pickupLocation?.city || movementForm.fromDestination,
                    load.deliveryLocation?.city || movementForm.toDestination,
                  ]
                    .filter(Boolean)
                    .join(" → ");

                  return (
                    <SelectionCard
                      key={load._id}
                      selected={selected}
                      onClick={() => onLoadChange(load._id)}
                      className={cn(
                        "relative min-h-[70px] cursor-pointer rounded-xl border p-3 transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "hover:border-primary/40 hover:shadow-sm"
                      )}
                    >
                      {/* Selected Tick */}
                      {selected && (
                        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <IconCheck className="h-3 w-3 text-white" />
                        </div>
                      )}

                      <div className="flex h-full flex-col justify-between">

                        {/* Top */}
                        <div className="pr-7">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-[13px]">
                              {load.loadNumber}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2">

                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {route || "Route not available"}
                            </p>


                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              DP-{load.dpNum || "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SelectionCard>
                  );
                })}
              </div>

              {validationErrors.loadId && (
                <p className="text-xs text-destructive">
                  {validationErrors.loadId}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2.5">

            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Driver <span className="text-red-500">*</span>
                </label>
                <IconInput
                  icon={<IconUser className="h-4 w-4" />}
                  value={movementForm.driverName}
                  onChange={(v) => updateField('driverName', v)}
                  placeholder="Name"
                />
                {validationErrors.driverName && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.driverName}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Phone
                </label>
                <IconInput
                  icon={<IconPhone className="h-4 w-4" />}
                  value={movementForm.driverPhone}
                  onChange={(v) => updateField('driverPhone', v)}
                  placeholder="10-digit"
                  inputMode="numeric"
                />
                {validationErrors.driverPhone && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.driverPhone}</p>
                )}
              </div>
            </div>

            <div className="mt-2.5">
              <label className="mb-1 block text-xs text-muted-foreground">
                Vehicle Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IconId className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  maxLength={10}
                  value={movementForm.vehicleNumber}
                  onChange={(e) =>
                    updateField('vehicleNumber', e.target.value.toUpperCase())
                  }
                  placeholder="e.g. GJ01AB1234"
                  className="h-9 w-full pl-9 font-mono text-sm tracking-wider"
                />
              </div>
              {validationErrors.vehicleNumber && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.vehicleNumber}</p>
              )}
            </div>

            {needsLoadConfirmation && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                <IconAlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Vehicle mismatch:{' '}
                  <strong>{selectedLoadBids[0]?.vehicleDetails?.vehicleNumber}</strong>
                </span>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/20 px-5 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateField('vehicleNumber', '')}
            disabled={saving}
            className="h-9 text-sm px-4"
          >
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={saving}
            onClick={onSubmit}
            className="h-9 flex-1 gap-2 text-sm font-bold"
          >
            {saving ? (
              <IconLoader className="h-4 w-4 animate-spin" />
            ) : (
              <IconCheck className="h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IconInput({
  icon,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  icon: React.ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className='relative'>
      <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' >
        {icon}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className='h-9 pl-8 text-sm h-9 text-sm'
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PHOTO GALLERY COMPONENT FOR MODALS
// ─────────────────────────────────────────────────────────────

interface PhotoGalleryProps {
  photos: MovementEvidencePhoto[]
  onRemove?: (id: string) => void
  photosPerPage?: number
}

function PhotoGallery({
  photos,
  onRemove,
  photosPerPage = 8,
}: PhotoGalleryProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(photos.length / photosPerPage)
  const startIdx = (currentPage - 1) * photosPerPage
  const paginatedPhotos = photos.slice(startIdx, startIdx + photosPerPage)

  const handleRemove = (id: string) => {
    if (onRemove) {
      onRemove(id)
      if (paginatedPhotos.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      }
    }
  }

  if (photos.length === 0) {
    return (
      <div className='rounded-lg border border-dashed bg-slate-50/50 py-6 text-center text-[10px] text-muted-foreground'>
        No photos uploaded
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] font-bold text-muted-foreground'>
            Photo Gallery
          </span>
          <span className='inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-bold text-primary'>
            <IconCamera className='h-3 w-3' /> {photos.length}
          </span>
        </div>
        {totalPages > 1 && (
          <span className='text-[9px] text-muted-foreground'>
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      <div className='grid grid-cols-4 gap-2'>
        {paginatedPhotos.map((p) => (
          <div
            key={p.id}
            className='group relative aspect-square overflow-hidden rounded-lg border bg-muted shadow-sm'
          >
            <img
              src={p.previewUrl}
              alt={p.name}
              className='h-full w-full object-cover'
            />
            {onRemove && (
              <div className='absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40'>
                <button
                  type='button'
                  onClick={() => handleRemove(p.id)}
                  className='flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-100 transition-opacity hover:bg-black/90 md:opacity-0 md:group-hover:opacity-100'
                >
                  <IconX className='h-4 w-4' />
                </button>
              </div>
            )}
            {p.addedAt && (
              <div className='absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100'>
                <p className='truncate text-[8px] leading-none'>
                  {formatDateTime(p.addedAt, 'timeOnly')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-between pt-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 w-7 p-0'
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          >
            <IconChevronLeft className='h-3 w-3' />
          </Button>
          <div className='text-[9px] text-muted-foreground'>
            {startIdx + 1}–{Math.min(startIdx + photosPerPage, photos.length)}{' '}
            of {photos.length}
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 w-7 p-0'
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
          >
            <IconChevronRight className='h-3 w-3' />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// INSPECTION MODAL COMPONENT
// ─────────────────────────────────────────────────────────────

interface InspectModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  movementId: string | null
  movements: VehicleMovement[]
  inspectionChecks: Record<string, MovementChecks>
  setInspectionCheck: (
    id: string,
    key: keyof MovementChecks,
    value: boolean
  ) => void
  notesByMovementId: Record<string, string>
  setNotesByMovementId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  evidenceByMovementId: Record<string, MovementEvidenceState>
  onSubmit: (id: string, action: 'verify' | 'reject') => Promise<void>
  saving: boolean
}

function InspectModal({
  open,
  onOpenChange,
  movementId,
  movements,
  inspectionChecks,
  setInspectionCheck,
  notesByMovementId,
  setNotesByMovementId,
  evidenceByMovementId,
  onSubmit,
  saving,
}: InspectModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const movement: any = movements.find((m) => m._id === movementId)
  const checks = movementId
    ? inspectionChecks[movementId] || getMovementChecks(movement)
    : getMovementChecks()
  const notes = movementId ? notesByMovementId[movementId] || '' : ''
  const evidence = movementId
    ? evidenceByMovementId[movementId] || { gateIn: [], gateOut: [] }
    : { gateIn: [], gateOut: [] }
  const gateInPhotos = evidence.gateIn

  const allInspDone =
    checks.checkedTransporter &&
    checks.checkedVehicle &&
    checks.checkedRoute &&
    checks.checkedBid &&
    checks.rcBook &&
    checks.insurance &&
    checks.permit &&
    checks.puc &&
    checks.fitness &&
    checks.driverLicense

  const handleAction = async (action: 'verify' | 'reject') => {
    if (movementId) {
      await onSubmit(movementId, action)
      onOpenChange(false)
      setStep(1)
    }
  }

  if (!movement) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setStep(1)
        onOpenChange(v)
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto border-border/50 bg-white p-0 dark:bg-slate-900 sm:max-w-3xl'>
        <DialogHeader className='border-b bg-slate-50/20 px-4 py-3'>
          <DialogTitle className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm font-semibold'>
              <IconFileCheck className='h-4 w-4 text-primary' />
              Vehicle Quality Inspection Checkpoint
            </div>
            <div className='text-[10px] font-semibold text-muted-foreground'>
              Step {step} of 2
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 px-4 py-4'>
          {step === 1 && (
            <div className='grid gap-4 md:grid-cols-2'>
              {/* Left Column: VAHAN & Remarks */}
              <div className='space-y-3'>
                <div className='grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-[10px]'>
                  <div>
                    <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                      Vehicle Number
                    </span>
                    <span className='block font-bold text-foreground'>
                      {movement.vehicleNumber || '—'}
                    </span>
                  </div>
                  <div>
                    <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                      DP No.
                    </span>
                    <span className='block font-bold text-foreground'>
                      {getMovementDpNumber(movement)}
                    </span>
                  </div>
                </div>

                {/* VAHAN Live Verification (Dummy Data) */}
                <div className='space-y-2 rounded-xl border border-blue-200 bg-blue-50/20 p-3 dark:border-blue-900/40 dark:bg-blue-950/15'>
                  <div className='flex items-center justify-between border-b pb-1.5'>
                    <p className='flex items-center gap-1 text-[11px] font-bold text-blue-900 dark:text-blue-300'>
                      <IconSearch className='h-3.5 w-3.5' /> VAHAN Verification
                    </p>
                    <span className='rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'>
                      ✓ Active
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px]'>
                    <div>
                      <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                        Owner
                      </span>
                      <span className='block truncate font-bold text-slate-800 dark:text-slate-200'>
                        Prashant Sharma
                      </span>
                    </div>
                    <div>
                      <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                        Model / Class
                      </span>
                      <span className='block truncate font-bold text-slate-800 dark:text-slate-200'>
                        TATA Dumper 3118
                      </span>
                    </div>
                    <div>
                      <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                        RC Status
                      </span>
                      <span className='block truncate font-bold text-emerald-600'>
                        ACTIVE ({movement.vehicleNumber})
                      </span>
                    </div>
                    <div>
                      <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                        Fitness
                      </span>
                      <span className='block truncate font-bold text-slate-800 dark:text-slate-200'>
                        12-Dec-2028
                      </span>
                    </div>
                    <div className='col-span-2'>
                      <span className='block text-[8px] font-semibold uppercase text-muted-foreground'>
                        Insurance Policy
                      </span>
                      <span className='block truncate text-[9px] font-bold text-slate-800 dark:text-slate-200'>
                        ICICI Lombard · 14-Aug-2027
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remarks/Notes */}
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-bold text-slate-700 dark:text-slate-300'>
                    Action Remarks / Notes
                  </Label>
                  <Textarea
                    value={notes}
                    onChange={(e) =>
                      movementId &&
                      setNotesByMovementId((prev) => ({
                        ...prev,
                        [movementId]: e.target.value,
                      }))
                    }
                    placeholder='Add notes for this inspection status...'
                    className='min-h-[50px] py-1 text-xs'
                  />
                </div>

                {!allInspDone && (
                  <div className='flex gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[10px] leading-normal text-amber-800'>
                    <IconAlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                    <span>
                      Checklists must be fully completed to pass inspection.
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: Checklists grid */}
              <div className='grid grid-cols-2 gap-3 border-l pl-4'>
                {/* Matching checks */}
                <div className='space-y-1.5'>
                  <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                    Matching checks
                  </p>
                  {[
                    { k: 'checkedTransporter', l: 'Transporter ID' },
                    { k: 'checkedVehicle', l: 'Vehicle No.' },
                    { k: 'checkedRoute', l: 'Trip Route' },
                    { k: 'checkedBid', l: 'Bid Details' },
                  ].map(({ k, l }) => {
                    const isChecked = checks[k as keyof MovementChecks]
                    return (
                      <button
                        key={k}
                        type='button'
                        onClick={() =>
                          setInspectionCheck(
                            movement._id,
                            k as keyof MovementChecks,
                            !isChecked
                          )
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-all',
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                            isChecked
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                          )}
                        >
                          {isChecked && (
                            <IconCheck className='h-2.5 w-2.5 stroke-[3]' />
                          )}
                        </div>
                        <span className='text-[11px] font-semibold leading-none'>
                          {l}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Document verify */}
                <div className='space-y-1.5'>
                  <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                    Documents verify
                  </p>
                  {[
                    { k: 'rcBook', l: 'RC Book' },
                    { k: 'insurance', l: 'Insurance' },
                    { k: 'permit', l: 'Permit' },
                    { k: 'puc', l: 'PUC Card' },
                    { k: 'fitness', l: 'Fitness Cert' },
                    { k: 'driverLicense', l: 'License' },
                  ].map(({ k, l }) => {
                    const isChecked = checks[k as keyof MovementChecks]
                    return (
                      <button
                        key={k}
                        type='button'
                        onClick={() =>
                          setInspectionCheck(
                            movement._id,
                            k as keyof MovementChecks,
                            !isChecked
                          )
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg border p-1.5 text-left transition-all',
                          isChecked
                            ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                            isChecked
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                          )}
                        >
                          {isChecked && (
                            <IconCheck className='h-2.5 w-2.5 stroke-[3]' />
                          )}
                        </div>
                        <span className='text-[11px] font-semibold leading-none'>
                          {l}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className='space-y-4'>
              <div className='space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4'>
                <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                  Review & Confirm
                </p>
                <div className='mt-3 space-y-3 border-t pt-3'>
                  <div>
                    <p className='mb-1 text-[9px] font-semibold uppercase text-muted-foreground'>
                      Vehicle Number
                    </p>
                    <p className='font-mono text-sm font-bold text-foreground'>
                      {movement.vehicleNumber}
                    </p>
                  </div>
                  <div>
                    <p className='mb-1 text-[9px] font-semibold uppercase text-muted-foreground'>
                      Inspection Status
                    </p>
                    <span
                      className={cn(
                        'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold',
                        allInspDone
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      )}
                    >
                      {allInspDone
                        ? '✓ Checklist Complete'
                        : '⚠ Checklist Incomplete'}
                    </span>
                  </div>
                  {notes && (
                    <div>
                      <p className='mb-1 text-[9px] font-semibold uppercase text-muted-foreground'>
                        Notes
                      </p>
                      <p className='text-[11px] italic text-foreground'>
                        "{notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Render Gate In photos so inspector can see them */}
              <div className='space-y-2'>
                <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>
                  Gate In Evidence Photos
                </p>
                {gateInPhotos.length > 0 ? (
                  <PhotoGallery photos={gateInPhotos} />
                ) : (
                  <p className='text-[10px] italic text-muted-foreground'>
                    No photos uploaded during Gate-In.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className='gap-2 border-t bg-slate-50/20 px-4 py-3'>
          <div className='flex w-full items-center justify-between'>
            <div className='flex gap-1'>
              {step > 1 && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setStep(1)}
                >
                  ← Back
                </Button>
              )}
            </div>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  onOpenChange(false)
                  setStep(1)
                }}
              >
                Cancel
              </Button>
              {step === 1 && (
                <Button
                  type='button'
                  size='sm'
                  disabled={!allInspDone}
                  onClick={() => setStep(2)}
                >
                  Next →
                </Button>
              )}
              {step === 2 && (
                <>
                  <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    disabled={saving}
                    onClick={() => handleAction('reject')}
                    className='gap-1.5'
                  >
                    {saving ? (
                      <IconLoader className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <IconX className='h-3.5 w-3.5' />
                    )}
                    Reject
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    disabled={saving || !allInspDone}
                    onClick={() => handleAction('verify')}
                    className='gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700'
                  >
                    {saving ? (
                      <IconLoader className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <IconCheck className='h-3.5 w-3.5' />
                    )}
                    Approve Inspection
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// GATE CHECKPOINT MODAL - COMPACT VERSION
// ─────────────────────────────────────────────────────────────

interface GateCheckpointModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  movementId: string | null
  movements: VehicleMovement[]
  checkpointType: 'gateIn' | 'gateOut'
  inspectionChecks?: Record<string, MovementChecks>
  setInspectionCheck?: (
    id: string,
    key: keyof MovementChecks,
    value: boolean
  ) => void
  notesByMovementId: Record<string, string>
  setNotesByMovementId: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >
  evidenceByMovementId: Record<string, MovementEvidenceState>
  addEvidencePhotos: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    files: FileList | null
  ) => void | Promise<void>
  removeEvidencePhoto: (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    photoId: string
  ) => void | Promise<void>
  onSubmit: (id: string, action: MovementAction, extraData?: any) => Promise<void>
  saving: boolean
  photoUploadingByMovementId?: Record<string, boolean>
}

function GateCheckpointModal({
  open,
  onOpenChange,
  movementId,
  movements,
  checkpointType,
  inspectionChecks = {},
  setInspectionCheck = () => { },
  notesByMovementId,
  setNotesByMovementId,
  evidenceByMovementId,
  addEvidencePhotos,
  removeEvidencePhoto,
  onSubmit,
  saving,
  photoUploadingByMovementId = {},
}: GateCheckpointModalProps) {
  const movement: any = movements.find((m) => m._id === movementId)
  const notes = movementId ? notesByMovementId[movementId] || '' : ''
  const evidence = movementId
    ? evidenceByMovementId[movementId] || { gateIn: [], gateOut: [] }
    : { gateIn: [], gateOut: [] }

  const [tareWeight, setTareWeight] = useState('')
  const [weighbridgeSlipIn, setWeighbridgeSlipIn] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [weighbridgeSlipOut, setWeighbridgeSlipOut] = useState('')

  useEffect(() => {
    if (open && movement) {
      setTareWeight(movement.gateIn?.tareWeight ? String(movement.gateIn.tareWeight) : '')
      setWeighbridgeSlipIn(movement.gateIn?.weighbridgeSlipIn || '')
      setGrossWeight(movement.gateOut?.grossWeight ? String(movement.gateOut.grossWeight) : '')
      setWeighbridgeSlipOut(movement.gateOut?.weighbridgeSlipOut || '')
    }
  }, [open, movementId, movement])

  const photos =
    checkpointType === 'gateIn' ? evidence.gateIn : evidence.gateOut

  const checks = movementId
    ? inspectionChecks[movementId] || getMovementChecks(movement)
    : getMovementChecks()

  const exitChecks = {
    loadingComplete: checks.loadingComplete || false,
    documentsReturned: checks.documentsReturned || false,
    sealChecked: checks.sealChecked || false,
    exitApproved: checks.exitApproved || false,
  }

  const allExitChecksDone =
    exitChecks.loadingComplete &&
    exitChecks.documentsReturned &&
    exitChecks.sealChecked &&
    exitChecks.exitApproved

  const isGateIn = checkpointType === 'gateIn'
  const isGateOut = checkpointType === 'gateOut'

  const gateOutChecklist = [
    { key: 'loadingComplete', label: 'Loading Complete' },
    { key: 'documentsReturned', label: 'Documents Returned' },
    { key: 'sealChecked', label: 'Seal & Lock Checked' },
    { key: 'exitApproved', label: 'Exit Clearance' },
  ]


  const handleAddPhotos = (files: FileList | null) => {
    if (movementId) addEvidencePhotos(movementId, checkpointType, files)
  }

  const handleRemovePhoto = (photoId: string) => {
    if (movementId) removeEvidencePhoto(movementId, checkpointType, photoId)
  }

  const handleSubmit = async (action: MovementAction) => {
    if (movementId) {
      const extraData: any = {}
      if (checkpointType === 'gateIn') {
        extraData.tareWeight = tareWeight ? Number(tareWeight) : undefined
        extraData.weighbridgeSlipIn = weighbridgeSlipIn || undefined
      } else if (checkpointType === 'gateOut') {
        extraData.grossWeight = grossWeight ? Number(grossWeight) : undefined
        extraData.weighbridgeSlipOut = weighbridgeSlipOut || undefined
      }
      await onSubmit(movementId, action, extraData)
      onOpenChange(false)
    }
  }

  if (!movement) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onOpenChange(v)
      }}
    >
      <DialogContent className='max-h-[85vh] overflow-y-auto border-border/50 bg-white p-0 dark:bg-slate-900 sm:max-w-2xl'>
        {/* Header */}
        <DialogHeader className='border-b bg-slate-50/20 px-4 py-2.5'>
          <DialogTitle className='flex items-center justify-between text-sm'>
            <div className='flex items-center gap-2'>
              {isGateIn ? (
                <IconDoorEnter className='h-4 w-4 text-primary' />
              ) : (
                <IconDoorExit className='h-4 w-4 text-primary' />
              )}
              <span>{isGateIn ? 'Gate In' : 'Gate Out'}</span>
              <span className='ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'>
                {movement.vehicleNumber}
              </span>
            </div>
            <div className='flex items-center gap-2'>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 px-4 py-3'>
          {/* Quick Info Bar */}
          <div className='flex flex-wrap items-center gap-3 rounded-lg bg-slate-50/50 px-3 py-2 text-xs dark:bg-slate-900/30'>
            <div>
              <span className='text-[8px] font-semibold uppercase text-muted-foreground'>
                DP No.
              </span>
              <p className='font-medium'>{getMovementDpNumber(movement)}</p>
            </div>
            <div>
              <span className='text-[8px] font-semibold uppercase text-muted-foreground'>
                Driver
              </span>
              <p className='font-medium'>{movement.driverName || 'N/A'}</p>
            </div>
            <div>
              <span className='text-[8px] font-semibold uppercase text-muted-foreground'>
                Transporter
              </span>
              <p className='font-medium'>{getMovementTransporterName(movement)}</p>
            </div>
            <div>
              <span className='text-[8px] font-semibold uppercase text-muted-foreground'>
                Purpose
              </span>
              <p className='font-medium'>{movement.purpose || 'Transit'}</p>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-2'>
            {/* Checklist */}
            <div className='space-y-1.5'>
              <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                {isGateIn ? 'Verifications' : 'Exit Checklist'}
              </p>

              {isGateIn ? (
                // Gate In - Auto-verified
                <div className='space-y-1'>
                  {['Transporter', 'Vehicle', 'Route', 'Load'].map((label) => (
                    <div
                      key={label}
                      className='flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50/30 px-2 py-1 text-xs dark:border-emerald-900/30 dark:bg-emerald-950/10'
                    >
                      <IconCheck className='h-3 w-3 text-emerald-600' />
                      <span>{label} ✓</span>
                    </div>
                  ))}
                </div>
              ) : (
                // Gate Out - Toggleable
                <div className='space-y-1'>
                  {gateOutChecklist.map(({ key, label }) => {
                    const checked = checks[key as keyof MovementChecks]
                    return (
                      <button
                        key={key}
                        type='button'
                        onClick={() =>
                          movementId &&
                          setInspectionCheck(
                            movementId,
                            key as keyof MovementChecks,
                            !checked
                          )
                        }
                        className={cn(
                          'flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-xs transition-all',
                          checked
                            ? 'border-emerald-300 bg-emerald-50/40 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all',
                            checked
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white dark:border-slate-600'
                          )}
                        >
                          {checked && (
                            <IconCheck className='h-2 w-2 stroke-[3]' />
                          )}
                        </div>
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Photos & Notes */}
            <div className='space-y-2'>
              {/* Photos */}
              <div>
                <div className='flex items-center justify-between'>
                  <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                    Photos ({photos.length})
                  </p>
                </div>
                <EvidencePhotoUploader
                  photos={photos}
                  onAdd={handleAddPhotos}
                  onRemove={handleRemovePhoto}
                  disabled={saving}
                  isUploading={
                    movementId
                      ? photoUploadingByMovementId[movementId] || false
                      : false
                  }
                />
              </div>

              {/* Notes */}
              <div>
                <p className='text-[9px] font-bold uppercase tracking-wider text-muted-foreground'>
                  Notes
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) =>
                    movementId &&
                    setNotesByMovementId((prev) => ({
                      ...prev,
                      [movementId]: e.target.value,
                    }))
                  }
                  placeholder='Add notes...'
                  className='min-h-[40px] py-1 text-xs'
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className='gap-2 border-t bg-slate-50/20 px-4 py-2.5'>
          <div className='flex w-full items-center justify-between'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <div className='flex gap-2'>
              {isGateOut && (
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  disabled={saving}
                  onClick={() => handleSubmit('reject')}
                >
                  {saving ? (
                    <IconLoader className='h-3 w-3 animate-spin' />
                  ) : (
                    <IconX className='h-3 w-3' />
                  )}
                  Reject
                </Button>
              )}
              <Button
                type='button'
                size='sm'
                disabled={saving}
                onClick={() => handleSubmit(isGateIn ? 'gate-in' : 'gate-out')}
                className={cn(
                  'gap-1.5',
                  isGateIn
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {saving ? (
                  <IconLoader className='h-3 w-3 animate-spin' />
                ) : isGateIn ? (
                  <IconDoorEnter className='h-3 w-3' />
                ) : (
                  <IconCheck className='h-3 w-3' />
                )}
                {saving
                  ? 'Processing…'
                  : isGateIn
                    ? 'Record Gate-In'
                    : 'Record Gate-Out'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
// ─────────────────────────────────────────────────────────────
// CORE VEHICLE REQUESTS PAGE
// ─────────────────────────────────────────────────────────────

interface VehicleRequestsPageProps {
  requestType: VehicleRequestType
}

export default function VehicleRequestsPage({
  requestType,
}: VehicleRequestsPageProps) {
  const user = useSelector((state: RootState) => state.auth.user)
  const userOperationalRole = user?.operationalRole || 'none'
  const isAdminUser =
    user?.role === 'super_admin' || user?.role === 'company_admin'
  const canHandleEntryFlow =
    isAdminUser || ['branch_manager', 'watchman'].includes(userOperationalRole)
  const canHandleInspectionFlow =
    isAdminUser ||
    ['branch_manager', 'inspection_officer'].includes(userOperationalRole)
  const isBranchScopedUser = user?.role === 'company_user' && !!user?.branchId
  const defaultBranchId = user?.branchId || ''

  const requestTypeConfig = REQUEST_TYPE_CONFIG[requestType]
  const defaultMovementPurpose = requestTypeConfig.defaultPurpose

  const [branches, setBranches] = useState<Branch[]>([])
  const [transporters, setTransporters] = useState<BranchTransporter[]>([])
  const [assignedLoads, setAssignedLoads] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [operationLoading, setOperationLoading] = useState<
    Record<string, boolean>
  >({})
  // ── URL-synced filter state ──────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams()
  const [movementFilters, setMovementFiltersRaw] =
    useState<MovementFiltersState>(() => ({
      search: searchParams.get('search') || '',
      status: searchParams.get('status')
        ? searchParams.get('status')!.split(',')
        : [],
      transporterId: searchParams.get('transporterId')
        ? searchParams.get('transporterId')!.split(',')
        : [],
      loadId: searchParams.get('loadId')
        ? searchParams.get('loadId')!.split(',')
        : [],
      vehicleType: searchParams.get('vehicleType') || '',
      dateRange:
        searchParams.get('dateFrom') || searchParams.get('dateTo')
          ? {
            from: searchParams.get('dateFrom') || '',
            to: searchParams.get('dateTo') || '',
          }
          : undefined,
    }))

  // Wrapper that syncs state changes back to URL
  const setMovementFilters: React.Dispatch<
    React.SetStateAction<MovementFiltersState>
  > = useCallback(
    (action) => {
      setMovementFiltersRaw((prev) => {
        const next = typeof action === 'function' ? action(prev) : action
        setSearchParams(
          (sp) => {
            const updated = new URLSearchParams(sp)
            if (next.search) updated.set('search', next.search)
            else updated.delete('search')
            if (next.status?.length)
              updated.set('status', next.status.join(','))
            else updated.delete('status')
            if (next.transporterId?.length)
              updated.set('transporterId', next.transporterId.join(','))
            else updated.delete('transporterId')
            if (next.loadId?.length)
              updated.set('loadId', next.loadId.join(','))
            else updated.delete('loadId')
            if (next.vehicleType) updated.set('vehicleType', next.vehicleType)
            else updated.delete('vehicleType')
            if (next.dateRange?.from)
              updated.set('dateFrom', next.dateRange.from)
            else updated.delete('dateFrom')
            if (next.dateRange?.to) updated.set('dateTo', next.dateRange.to)
            else updated.delete('dateTo')
            return updated
          },
          { replace: true }
        )
        return next
      })
    },
    [setSearchParams]
  )

  const debouncedSearch = useDebounce(movementFilters.search, 300)

  const [movementPage, setMovementPage] = useState(1)
  const [movementPageSize, setMovementPageSize] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [collapsedLoadGroups, setCollapsedLoadGroups] = useState<Set<string>>(
    new Set()
  )
  const [movementPagination, setMovementPagination] = useState<PaginationState>(
    { page: 1, limit: 10, total: 0, pages: 1 }
  )
  const [groupedLoadRequirements, setGroupedLoadRequirements] = useState<
    LoadRequirementGroup[]
  >([])
  const [backendCounts, setBackendCounts] = useState<Record<string, number>>({
    expected: 0,
    gate_in_recorded: 0,
    inspection_verified: 0,
    inspection_rejected: 0,
    gate_out_recorded: 0,
  })

  const toggleLoadGroup = (key: string) => {
    setCollapsedLoadGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Interactive checkpoint state
  const [notesByMovementId, setNotesByMovementId] = useState<
    Record<string, string>
  >({})
  const [inspectionChecks, setInspectionChecks] = useState<
    Record<string, MovementChecks>
  >({})
  const [complianceByMovementId, setComplianceByMovementId] = useState<
    Record<string, Partial<Record<ComplianceCheckKind, ComplianceCheckResult>>>
  >({})
  const [evidenceByMovementId, setEvidenceByMovementId] = useState<
    Record<string, MovementEvidenceState>
  >({})
  const [photoUploadingByMovementId, setPhotoUploadingByMovementId] = useState<
    Record<string, boolean>
  >({})
  const [vehicleWorkflowDraft, setVehicleWorkflowDraft] =
    useState<VehicleWorkflowDraft>(createEmptyVehicleWorkflowDraft)
  const [manualLoadEntry, setManualLoadEntry] = useState(false)

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    action: null,
    movementId: null,
    message: '',
  })

  const [gateInModal, setGateInModal] = useState<GateInModalState>({
    open: false,
    movementId: null,
  })
  const [gateOutModal, setGateOutModal] = useState<GateOutModalState>({
    open: false,
    movementId: null,
  })
  const [inspectModal, setInspectModal] = useState<{
    open: boolean
    movementId: string | null
  }>({
    open: false,
    movementId: null,
  })

  const [movementForm, setMovementForm] = useState<MovementFormState>({
    branchId: '',
    loadId: '',
    bidId: '',
    transporterId: '',
    transporterName: '',
    vehicleNumber: '',
    driverName: '',
    driverPhone: '',
    fromDestination: '',
    toDestination: '',
    requestType,
    purpose: defaultMovementPurpose,
    expectedAt: '',
  })

  // Permissions
  const canCreateMovement =
    hasPermission(user, ALL_PERMISSIONS.BRANCH_MOVEMENT_CREATE) &&
    canHandleEntryFlow
  const canGateIn =
    hasPermission(user, ALL_PERMISSIONS.BRANCH_GATE_IN) && canHandleEntryFlow
  const canInspectMovement =
    hasPermission(user, ALL_PERMISSIONS.BRANCH_INSPECT) &&
    canHandleInspectionFlow
  const canGateOut =
    hasPermission(user, ALL_PERMISSIONS.BRANCH_GATE_OUT) &&
    canHandleInspectionFlow

  const effectiveBranchId = isBranchScopedUser
    ? defaultBranchId
    : selectedBranchId

  // Derived lists
  const activeMovements = useMemo(
    () =>
      movements.filter((m) =>
        [
          'expected',
          'inspection_verified',
          'gate_in_recorded',
          'inspection_rejected',
        ].includes(m.status)
      ),
    [movements]
  )

  const loadEntryCounts = useMemo(
    () =>
      movements
        .filter((m) =>
          [
            'expected',
            'gate_in_recorded',
            'inspection_verified',
            'inspection_rejected',
            'gate_out_recorded',
          ].includes(m.status)
        )
        .reduce<Record<string, number>>((acc, m) => {
          const id = getRefId(m.loadId)
          if (id) acc[id] = (acc[id] || 0) + 1
          return acc
        }, {}),
    [movements]
  )

  const activeVehicleNumbers = useMemo(
    () =>
      new Set(
        activeMovements
          .map((m) => normalizeVehicleNumber(m.vehicleNumber))
          .filter(Boolean)
      ),
    [activeMovements]
  )

  const availableAssignedLoads = useMemo(
    () =>
      assignedLoads
        .map((l) => {
          const active = Math.max(
            l.activeVehicleEntries || 0,
            loadEntryCounts[l._id] || 0
          )
          const limit = getLoadVehicleLimit(l)
          return {
            ...l,
            acceptedBids: getOpenAcceptedBids(l),
            activeVehicleEntries: active,
            remainingVehicleSlots: Math.max(0, limit - active),
          }
        })
        .filter((l) => {
          if (
            (l.acceptedBids || []).length === 0 ||
            (l.remainingVehicleSlots || 0) <= 0
          )
            return false
          return ['assigned', 'in_transit'].includes(String(l.status || ''))
        }),
    [assignedLoads, loadEntryCounts]
  )

  // Build full load list for the filter dropdown:
  // Merge assignedLoads (from API) with any loads referenced in current movements
  // so fully-allocated or completed loads still appear as filter options
  const filterLoads = useMemo(() => {
    const loadMap = new Map(assignedLoads.map((l) => [String(l._id), l]))
    movements.forEach((m: any) => {
      const id = m.loadId ? String(m.loadId._id || m.loadId) : null
      if (!id) return
      if (!loadMap.has(id)) {
        // Synthesise a minimal entry from movement's referenceSnapshot
        const snap = m.referenceSnapshot || {}
        loadMap.set(id, {
          _id: id,
          loadNumber:
            snap.loadNumber ||
            m.referenceSnapshot?.loadNumber ||
            `Load ${id.slice(-5)}`,
          status: 'assigned',
          acceptedBids: [],
          remainingVehicleSlots: 0,
          activeVehicleEntries: 0,
        } as any)
      }
    })
    return Array.from(loadMap.values()).sort((a, b) =>
      (a.loadNumber || '').localeCompare(b.loadNumber || '')
    )
  }, [assignedLoads, movements])

  const selectedTransporterAssignments = useMemo(() => {
    if (!movementForm.transporterId) return []
    return availableAssignedLoads.filter((l) =>
      (l.acceptedBids || []).some(
        (b: any) =>
          String(getBidTransporterId(b)) === String(movementForm.transporterId)
      )
    )
  }, [availableAssignedLoads, movementForm.transporterId])

  const selectedLoadBids = useMemo(() => {
    if (!movementForm.loadId) return []
    const load = availableAssignedLoads.find(
      (l) => l._id === movementForm.loadId
    )
    if (!load) return []
    return (load.acceptedBids || []).filter((b: BranchAcceptedBid) =>
      movementForm.transporterId
        ? String(getBidTransporterId(b)) === String(movementForm.transporterId)
        : true
    )
  }, [availableAssignedLoads, movementForm.loadId, movementForm.transporterId])

  const needsLoadConfirmation = useMemo(() => {
    if (!movementForm.bidId || !movementForm.vehicleNumber) return false
    const bid = selectedLoadBids.find(
      (b: BranchAcceptedBid) => b._id === movementForm.bidId
    )
    if (!bid || !bid.vehicleDetails?.vehicleNumber) return false
    return !vehicleNumbersMatch(
      movementForm.vehicleNumber,
      bid.vehicleDetails.vehicleNumber
    )
  }, [selectedLoadBids, movementForm.bidId, movementForm.vehicleNumber])

  // Load backend records
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      const [lookupsRes, movementsRes] = await Promise.all([
        branchesService.getLookups({
          requestType,
          branchId: effectiveBranchId || undefined,
        }),
        branchesService.listMovements({
          page: movementPage,
          limit: movementPageSize,
          branchId: effectiveBranchId || undefined,
          requestType,
          status:
            movementFilters.status.length > 0
              ? movementFilters.status.join(',')
              : undefined,
          transporterId:
            movementFilters.transporterId.length > 0
              ? movementFilters.transporterId.join(',')
              : undefined,
          loadId:
            movementFilters.loadId.length > 0
              ? movementFilters.loadId.join(',')
              : undefined,
          search: debouncedSearch || undefined,
          vehicleType: movementFilters.vehicleType || undefined,
          dateFrom: movementFilters.dateRange?.from || undefined,
          dateTo: movementFilters.dateRange?.to || undefined,
        }),
      ])

      setBranches(lookupsRes.branches || [])
      setTransporters(lookupsRes.transporters || [])
      setAssignedLoads(lookupsRes.assignedLoads || [])

      if (movementsRes.pagination) {
        setMovementPagination(movementsRes.pagination)
      }
      if (movementsRes.counts) {
        setBackendCounts(movementsRes.counts)
      }

      setGroupedLoadRequirements(
        normalizeBackendLoadGroups(
          movementsRes.groupedLoads || movementsRes.loadRequirements,
          lookupsRes.assignedLoads || []
        )
      )

      const list = movementsRes.movements || []
      setMovements(list)

      // Prepopulate notes, checklists, and compliance checks
      const checks: Record<string, MovementChecks> = {}
      const notes: Record<string, string> = {}
      const comp: Record<
        string,
        Partial<Record<ComplianceCheckKind, ComplianceCheckResult>>
      > = {}
      const ev: Record<string, MovementEvidenceState> = {}

      list.forEach((m) => {
        checks[m._id] = getMovementChecks(getSavedMovementChecks(m))
        notes[m._id] = ''
        comp[m._id] = {
          FASTAG: buildMockComplianceResult(m.vehicleNumber, 'FASTAG'),
          VAHAN: buildMockComplianceResult(m.vehicleNumber, 'VAHAN'),
          echallanByVehicle: buildMockComplianceResult(
            m.vehicleNumber,
            'echallanByVehicle'
          ),
        }

        // Convert backend evidence format to frontend format
        const gateInPhotos = (m.evidence?.gateInPhotos || []).map(
          (photo: any, idx: number) =>
            convertBackendEvidencePhoto(photo, idx, 'gateIn')
        )
        const gateOutPhotos = (m.evidence?.gateOutPhotos || []).map(
          (photo: any, idx: number) =>
            convertBackendEvidencePhoto(photo, idx, 'gateOut')
        )

        ev[m._id] = {
          gateIn: gateInPhotos,
          gateOut: gateOutPhotos,
        }
      })

      setInspectionChecks(checks)
      setNotesByMovementId(notes)
      setComplianceByMovementId(comp)
      setEvidenceByMovementId(ev)
    } catch (e: any) {
      setGroupedLoadRequirements([])
      if (!silent) {
        toast({
          title: 'Failed to fetch tracking records',
          description: getApiErrorMessage(e, 'Internal operations error'),
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [
    debouncedSearch,
    effectiveBranchId,
    movementFilters.dateRange?.from,
    movementFilters.dateRange?.to,
    movementFilters.loadId,
    movementFilters.status,
    movementFilters.transporterId,
    movementFilters.vehicleType,
    movementPage,
    movementPageSize,
    requestType,
  ])

  // Reset to page 1 whenever filters change (but not when page itself changes)
  const serializedStatus = JSON.stringify(movementFilters.status)
  const serializedTransporters = JSON.stringify(movementFilters.transporterId)
  const serializedLoads = JSON.stringify(movementFilters.loadId)

  useEffect(() => {
    setMovementPage(1)
  }, [
    serializedStatus,
    serializedTransporters,
    serializedLoads,
    movementFilters.vehicleType,
    movementFilters.dateRange?.from,
    movementFilters.dateRange?.to,
    debouncedSearch,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadData(true)
      }
    }

    const intervalId = window.setInterval(refresh, 10000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [loadData])

  // Form Resets
  const resetMovementForm = (branchId = '') => {
    setMovementForm({
      branchId: branchId || effectiveBranchId || branches[0]?._id || '',
      loadId: '',
      bidId: '',
      transporterId: '',
      transporterName: '',
      vehicleNumber: '',
      driverName: '',
      driverPhone: '',
      fromDestination: '',
      toDestination: '',
      requestType,
      purpose: defaultMovementPurpose,
      expectedAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16), // +2 hours from now
    })
    setManualLoadEntry(false)
    setValidationErrors({})
    setVehicleWorkflowDraft(createEmptyVehicleWorkflowDraft())
  }

  const handleBranchChange = (branchId: string) => {
    if (isBranchScopedUser) return
    setSelectedBranchId(branchId)
    setMovementPage(1)
    resetMovementForm(branchId)
    setNotesByMovementId({})
    setInspectionChecks({})
  }
  const formatLocation = (location?: any) => {
    if (!location) return ''

    return [
      location.branchName,
      location.address,
      location.city,
      location.state,
      location.zipCode,
    ]
      .filter((value) => value && String(value).trim())
      .join(', ')
  }
  const handleTransporterChange = (transporterId: string) => {
    const t = transporters.find((x) => x._id === transporterId)
    const assignments = availableAssignedLoads.filter((l) =>
      (l.acceptedBids || []).some(
        (b: any) => String(getBidTransporterId(b)) === String(transporterId)
      )
    )
    const onlyLoad = assignments.length === 1 ? assignments[0] : undefined
    const onlyBid = onlyLoad?.acceptedBids?.find(
      (b: any) => String(getBidTransporterId(b)) === String(transporterId)
    )
    setManualLoadEntry(assignments.length === 0)
    setMovementForm((p) => ({
      ...p,
      transporterId,
      transporterName: t?.companyName || t?.name || t?.email || '',
      loadId: onlyLoad?._id || '',
      bidId: onlyBid?._id || '',
      vehicleNumber: onlyBid?.vehicleDetails?.vehicleNumber || '',
      driverName: onlyBid?.driverDetails?.driverName || '',
      driverPhone: onlyBid?.driverDetails?.mobile || '',
      fromDestination:
        onlyLoad?.pickupLocation?.city ||
        onlyLoad?.pickupLocation?.address ||
        '',
      toDestination:
        onlyLoad?.deliveryLocation?.city ||
        onlyLoad?.deliveryLocation?.address ||
        '',
    }))
  }

  const handleLoadChange = (loadId: string) => {
    const load = availableAssignedLoads.find((l) => l._id === loadId)
    const bid =
      load?.acceptedBids?.find((b: any) =>
        movementForm.transporterId
          ? String(getBidTransporterId(b)) ===
          String(movementForm.transporterId)
          : true
      ) || load?.acceptedBids?.[0]
    const transporter =
      typeof bid?.transporterId === 'object'
        ? bid.transporterId
        : typeof load?.assignedTransporter === 'object'
          ? load.assignedTransporter
          : undefined
    setManualLoadEntry(false)
    setMovementForm((p) => ({
      ...p,
      loadId,
      bidId: bid?._id || '',
      transporterId:
        typeof bid?.transporterId === 'string'
          ? bid.transporterId
          : bid?.transporterId?._id || '',
      transporterName:
        transporter?.companyName || transporter?.name || p.transporterName,
      vehicleNumber: bid?.vehicleDetails?.vehicleNumber || p.vehicleNumber,
      driverName: bid?.driverDetails?.driverName || p.driverName,
      driverPhone: bid?.driverDetails?.mobile || p.driverPhone,
      fromDestination:
        load?.pickupLocation?.city ||
        load?.pickupLocation?.address ||
        p.fromDestination,
      toDestination:
        load?.deliveryLocation?.city ||
        load?.deliveryLocation?.address ||
        p.toDestination,
    }))
  }

  const handleBidChange = (bidId: string) => {
    const bid = availableAssignedLoads
      .flatMap((l) => l.acceptedBids || [])
      .find((b: any) => b._id === bidId)
    const t =
      typeof bid?.transporterId === 'object' ? bid.transporterId : undefined
    setMovementForm((p) => ({
      ...p,
      bidId,
      transporterId:
        typeof bid?.transporterId === 'string'
          ? bid.transporterId
          : bid?.transporterId?._id || p.transporterId,
      transporterName: t?.companyName || t?.name || p.transporterName,
      vehicleNumber: bid?.vehicleDetails?.vehicleNumber || p.vehicleNumber,
      driverName: bid?.driverDetails?.driverName || p.driverName,
      driverPhone: bid?.driverDetails?.mobile || p.driverPhone,
    }))
  }

  const handleLookupVehicle = async () => {
    const vehicleNumber = normalizeVehicleNumber(movementForm.vehicleNumber)
    if (!vehicleNumber) {
      setValidationErrors((prev) => ({
        ...prev,
        vehicleNumber: 'Enter vehicle number first',
      }))
      return
    }

    setVehicleWorkflowDraft((prev) => ({
      ...prev,
      lookupStatus: 'loading',
      lookupMessage: 'Fetching vehicle profile...',
    }))

    try {
      const result = await fetchVehicleLookup(vehicleNumber)
      setVehicleWorkflowDraft((prev) => ({
        ...prev,
        lookupStatus: 'success',
        lookupMessage: 'Vehicle information retrieved successfully.',
        lookupResult: result,
      }))
    } catch (error) {
      setVehicleWorkflowDraft((prev) => ({
        ...prev,
        lookupStatus: 'error',
        lookupMessage: getApiErrorMessage(
          error,
          'Unable to retrieve vehicle information'
        ),
        lookupResult: null,
      }))
    }
  }

  const handleAddWorkflowPhotos = (files: FileList | null) => {
    if (!files?.length) return
    const incoming: VehicleWorkflowPhoto[] = Array.from(files).map(
      (file, index) => ({
        id: `workflow-${Date.now()}-${index}`,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        addedAt: new Date().toISOString(),
        file,
      })
    )

    setVehicleWorkflowDraft((prev) => ({
      ...prev,
      photos: [...prev.photos, ...incoming],
    }))
  }

  const handleRemoveWorkflowPhoto = (photoId: string) => {
    setVehicleWorkflowDraft((prev) => {
      const target = prev.photos.find((photo) => photo.id === photoId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return {
        ...prev,
        photos: prev.photos.filter((photo) => photo.id !== photoId),
      }
    })
  }

  const validateForm = (): boolean => {
    const errs: ValidationErrors = {}
    if (!movementForm.branchId) errs.branchId = 'Select a branch'
    if (!movementForm.transporterId && !movementForm.transporterName)
      errs.transporterName = 'Enter transporter'
    if (!movementForm.vehicleNumber) errs.vehicleNumber = 'Required'
    else if (
      !VALIDATION_RULES.VEHICLE_NUMBER.pattern.test(movementForm.vehicleNumber)
    )
      errs.vehicleNumber = VALIDATION_RULES.VEHICLE_NUMBER.message
    if (!movementForm.driverName) errs.driverName = 'Required'
    if (
      movementForm.driverPhone &&
      !VALIDATION_RULES.PHONE.pattern.test(movementForm.driverPhone)
    )
      errs.driverPhone = VALIDATION_RULES.PHONE.message
    if (!movementForm.fromDestination) errs.fromDestination = 'Required'
    if (!movementForm.toDestination) errs.toDestination = 'Required'
    if (!movementForm.expectedAt) errs.expectedAt = 'Required'

    if (
      activeVehicleNumbers.has(
        normalizeVehicleNumber(movementForm.vehicleNumber)
      )
    ) {
      errs.vehicleNumber = 'This vehicle is already registered inside plant'
    }

    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreateMovement = async (event: React.FormEvent) => {
    event.preventDefault()

    try {
      setSaving(true)
      const workflow = {
        lookupResult: vehicleWorkflowDraft.lookupResult,
      }
      await branchesService.createMovement({
        ...movementForm,
        workflow,
        photos: vehicleWorkflowDraft.photos
          .map((photo) => photo.file)
          .filter(Boolean) as File[],
      })
      resetMovementForm(movementForm.branchId)
      setShowVehicleModal(false)
      toast({ title: 'Vehicle entry created' })
      await loadData()
    } catch (e: any) {
      toast({
        title: 'Failed to create entry',
        description: getApiErrorMessage(e, 'Unable to create vehicle entry'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const runMovementAction = async (id: string, action: MovementAction) => {
    const movement = movements.find((m) => m._id === id)

    try {
      setOperationLoading((p) => ({ ...p, [id]: true }))
      const checks = getMovementChecks(inspectionChecks[id])
      const notes = notesByMovementId[id] || ''

      if (!movement?.branchId) {
        toast({
          title: 'Cannot complete flow',
          description: 'Branch information missing. Refresh list.',
          variant: 'destructive',
        })
        return
      }

      const evidence = evidenceByMovementId[id] || { gateIn: [], gateOut: [] }

      // Extract file objects from evidence photos
      const getPhotoFiles = (photos: MovementEvidencePhoto[]): File[] =>
        photos.map((p) => p.file).filter((f): f is File => f instanceof File)

      if (action === 'gate-in') {
        await branchesService.gateIn(id, {
          notes,
          photos: getPhotoFiles(evidence.gateIn),
        } as any)
        // Immediately update evidence state from uploaded photos
        setEvidenceByMovementId((prev) => {
          const current = prev[id] || { gateIn: [], gateOut: [] }
          return {
            ...prev,
            [id]: {
              ...current,
              gateIn: current.gateIn.map((p) => ({
                ...p,
                id: `saved-gateIn-${id}-${p.id}`, // Mark as saved
              })),
            },
          }
        })
      }

      if (action === 'reopen')
        await branchesService.reopenMovement(id, { notes })
      if (action === 'cancel')
        await branchesService.cancelMovement(id, { notes })

      if (action === 'gate-out') {
        await branchesService.gateOut(id, {
          notes,
          checks: {
            loadingComplete: !!checks.loadingComplete,
            documentsReturned: !!checks.documentsReturned,
            sealChecked: !!checks.sealChecked,
            exitApproved: !!checks.exitApproved,
          },
          photos: getPhotoFiles(evidence.gateOut),
        } as any) // Type assertion for flexible backend structure
        // Immediately update evidence state from uploaded photos
        setEvidenceByMovementId((prev) => {
          const current = prev[id] || { gateIn: [], gateOut: [] }
          return {
            ...prev,
            [id]: {
              ...current,
              gateOut: current.gateOut.map((p) => ({
                ...p,
                id: `saved-gateOut-${id}-${p.id}`, // Mark as saved
              })),
            },
          }
        })
      }

      if (action === 'verify' || action === 'reject') {
        await branchesService.inspect(id, {
          status: action === 'verify' ? 'verified' : 'rejected',
          notes,
          documents: {
            rcBook: checks.rcBook,
            insurance: checks.insurance,
            permit: checks.permit,
            puc: checks.puc,
            fitness: checks.fitness,
            driverLicense: checks.driverLicense,
          },
          ...checks,
          photos: getPhotoFiles(evidence.gateIn),
        } as any) // Type assertion for flexible backend structure
        // Update evidence state
        setEvidenceByMovementId((prev) => {
          const current = prev[id] || { gateIn: [], gateOut: [] }
          return {
            ...prev,
            [id]: {
              ...current,
              gateIn: current.gateIn.map((p) => ({
                ...p,
                id: `saved-gateIn-${id}-${p.id}`, // Mark as saved
              })),
            },
          }
        })
      }

      setNotesByMovementId((p) => ({ ...p, [id]: '' }))
      const msgs = {
        'gate-in': 'Vehicle entered',
        'gate-out': 'Vehicle exited',
        verify: 'Inspection approved',
        reject: 'Inspection rejected',
        reopen: 'Reopened for re-inspection',
        cancel: 'Entry cancelled',
      }
      toast({ title: msgs[action] })
      await loadData()
    } catch (e: any) {
      toast({
        title: 'Action failed',
        description: getApiErrorMessage(e, 'Unable to complete vehicle action'),
        variant: 'destructive',
      })
    } finally {
      setOperationLoading((p) => ({ ...p, [id]: false }))
    }
  }

  const handleActionWithConfirmation = async (
    id: string,
    action: MovementAction
  ) => {
    if (action === 'reject') {
      setConfirmDialog({
        open: true,
        action: 'reject',
        movementId: id,
        message: 'Are you sure you want to reject this vehicle inspection?',
      })
    } else if (action === 'cancel') {
      setConfirmDialog({
        open: true,
        action: 'cancel',
        movementId: id,
        message: 'Are you sure you want to cancel this vehicle entry?',
      })
    } else if (action === 'gate-in') {
      setGateInModal({ open: true, movementId: id })
    } else if (action === 'gate-out') {
      setGateOutModal({ open: true, movementId: id })
    } else if (action === 'verify') {
      setInspectModal({ open: true, movementId: id })
    } else {
      await runMovementAction(id, action)
    }
  }

  const getVehicleTracking = async (
    movement: VehicleMovement,
    kind: ComplianceCheckKind
  ) => {
    const id = movement._id
    const titleMap: Record<ComplianceCheckKind, string> = {
      FASTAG: 'FASTag',
      VAHAN: 'VAHAN',
      echallanByVehicle: 'E-Challan',
    }
    try {
      // Set loading state
      setComplianceByMovementId((prev) => {
        const current = prev[id] || {}
        return {
          ...prev,
          [id]: {
            ...current,
            [kind]: {
              kind,
              status: 'loading',
              title: titleMap[kind],
              message: 'Checking live system profile...',
              details: [],
            },
          },
        }
      })

      let result: ComplianceCheckResult

      if (kind === 'FASTAG') {
        // ── Real FASTag API call ──
        try {
          const fastagRes = await fastagService.getVehicleTracking(movement.vehicleNumber)
          const norm = fastagRes.data?.normalized
          const tagStatus = norm?.tagStatus?.toLowerCase() || 'unknown'
          const isActive = tagStatus === 'active'
          const isLowBal = tagStatus === 'low balance'
          const lastPlaza = norm?.lastPlaza || 'Unknown plaza'
          const lastState = norm?.lastState || ''
          const lastTime = norm?.lastCrossingTime
            ? new Date(norm.lastCrossingTime).toLocaleString('en-IN')
            : 'N/A'
          const balance = norm?.walletBalance ? `₹${norm.walletBalance}` : 'N/A'
          const totalXings = norm?.totalTransactions ?? 0

          result = {
            kind,
            status: isActive ? 'success' : isLowBal ? 'warning' : 'error',
            title: 'FASTag Movement',
            message: isActive
              ? `Tag active — last crossing ${lastTime}.`
              : isLowBal
                ? 'Low FASTag balance. Recharge recommended before gate out.'
                : `Tag status: ${norm?.tagStatus || 'Unknown'}. Manual verification required.`,
            checkedAt: new Date().toISOString(),
            details: [
              `Vehicle: ${norm?.vehicleNumber || movement.vehicleNumber}`,
              `Tag Status: ${norm?.tagStatus || 'Unknown'}`,
              `Issuer Bank: ${norm?.issuerBank || 'N/A'}`,
              `Wallet Balance: ${balance}`,
              `Last Plaza: ${lastPlaza}${lastState ? `, ${lastState}` : ''}`,
              `Last Crossing: ${lastTime}`,
              `Total Crossings (48h): ${totalXings}`,
              fastagRes.isDemoData ? '⚠ Demo data (live API not configured)' : '✓ Live FASTag data',
            ],
          }
        } catch {
          // If API fails, fall back to mock
          result = buildMockComplianceResult(movement.vehicleNumber, kind)
          result.details.push('Note: API unavailable, showing estimated data')
        }
      } else {
        // ── VAHAN and E-Challan remain simulated ──
        await new Promise((resolve) => setTimeout(resolve, 700))
        result = buildMockComplianceResult(movement.vehicleNumber, kind)
      }

      setComplianceByMovementId((prev) => {
        const current = prev[id] || {}
        return {
          ...prev,
          [id]: {
            ...current,
            [kind]: { ...result, checkedAt: new Date().toISOString() },
          },
        }
      })
      toast({ title: `${result.title} check complete` })
    } catch (error) {
      toast({
        title: 'Check failed',
        description: getApiErrorMessage(error, 'Check request timed out'),
        variant: 'destructive',
      })
    }
  }

  const addEvidencePhotos = async (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    files: FileList | null
  ) => {
    if (!files?.length) return

    try {
      // Set loading state
      setPhotoUploadingByMovementId((prev) => ({
        ...prev,
        [movementId]: true,
      }))

      // Create File array from FileList
      const fileArray = Array.from(files)

      // Call API to upload photos
      const uploadedPhotos = await uploadPhotos(movementId, phase, fileArray)

      // Convert API response photos to frontend format
      const convertedPhotos: MovementEvidencePhoto[] = uploadedPhotos.map(
        (photo: any) => ({
          id: `saved-${photo.id || photo._id}`,
          name: photo.fileName || photo.name,
          previewUrl:
            resolvePhotoUrl(photo.url || photo.path) ||
            URL.createObjectURL(fileArray[0]), // Fallback for preview
          addedAt: photo.uploadedAt || photo.createdAt,
          file: undefined, // API-managed photos don't need File object
        })
      )

      // Update local state with uploaded photos
      setEvidenceByMovementId((prev) => {
        const current = prev[movementId] || { gateIn: [], gateOut: [] }
        return {
          ...prev,
          [movementId]: {
            ...current,
            [phase]: [...current[phase], ...convertedPhotos],
          },
        }
      })

      toast({
        title: 'Photos uploaded successfully',
        description: `${uploadedPhotos.length} photo(s) have been added to your evidence.`,
        variant: 'default',
      })
    } catch (error) {
      const errorMessage =
        error instanceof EvidenceServiceError
          ? error.message
          : 'Failed to upload photos. Please try again.'

      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      })

      console.error('Photo upload error:', error)
    } finally {
      // Clear loading state
      setPhotoUploadingByMovementId((prev) => ({
        ...prev,
        [movementId]: false,
      }))
    }
  }

  const removeEvidencePhoto = async (
    movementId: string,
    phase: 'gateIn' | 'gateOut',
    photoId: string
  ) => {
    try {
      // Delete from API if it's a server-persisted photo (id starts with 'saved-' indicates from backend)
      if (photoId.startsWith('saved-')) {
        const cleanPhotoId = photoId.substring(6) // strip 'saved-' prefix
        if (cleanPhotoId.length === 24) {
          await deletePhoto(movementId, cleanPhotoId)
        }
      }

      // Remove from local state
      setEvidenceByMovementId((prev) => {
        const current = prev[movementId]
        if (!current) return prev

        const target = current[phase].find((photo) => photo.id === photoId)
        // Revoke object URLs for local files
        if (target?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl)
        }

        return {
          ...prev,
          [movementId]: {
            ...current,
            [phase]: current[phase].filter((photo) => photo.id !== photoId),
          },
        }
      })

      toast({
        title: 'Photo removed',
        description: 'The photo has been removed from evidence.',
        variant: 'default',
      })
    } catch (error) {
      const errorMessage =
        error instanceof EvidenceServiceError
          ? error.message
          : 'Failed to remove photo. Please try again.'

      toast({
        title: 'Removal failed',
        description: errorMessage,
        variant: 'destructive',
      })

      console.error('Photo removal error:', error)
    }
  }

  const setInspectionCheck = (
    id: string,
    key: keyof MovementChecks,
    value: boolean
  ) => {
    setInspectionChecks((prev) => {
      const current = prev[id] || DEFAULT_MOVEMENT_CHECKS
      return {
        ...prev,
        [id]: {
          ...current,
          [key]: value,
        },
      }
    })
  }

  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter movements (handled by backend pagination)
  const filteredMovements = movements

  return (
    <Layout>
      <Layout.Body className='flex h-[calc(100vh-10px)] flex-col space-y-4 overflow-hidden p-4 lg:p-5'>
        {/* Page header */}
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h1 className='text-[1.4rem] font-semibold tracking-tight'>
              {requestTypeConfig.title}
            </h1>
          </div>
          {/* Summary chip strip */}
          <div className='sticky top-0 z-20 -mx-1 flex  border-b bg-background/95 px-1 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => loadData()}
              disabled={loading}
              className='mx-2 h-8 gap-1.5 border-border/50 bg-white text-[12px] dark:bg-slate-900'
            >
              <IconRefresh
                className={cn('h-3.5 w-3.5', loading && 'animate-spin')}
              />
              {loading ? 'Loading…' : 'Refresh'}
            </Button>

            <SearchableSelect
              value={selectedBranchId}
              onChange={(v) => {
                const val = Array.isArray(v) ? v[0] : v
                setSelectedBranchId(val)
              }}
              options={branches.map((b) => ({
                value: b._id,
                label: b.name,
              }))}
              placeholder='All branches'
              searchPlaceholder='Search branch...'
              disabled={isBranchScopedUser}
              className='mx-2 h-7 w-full text-[11px] sm:w-[200px]'
            />
            <div className='flex flex-wrap items-center gap-1.5'>
              <div className='mt-2 flex w-full items-center gap-2 sm:ml-auto sm:mt-0 sm:w-auto'>
                {canCreateMovement && (
                  <Button
                    size='sm'
                    className='h-7 flex-1 gap-1 rounded-full px-3 text-[11px] sm:flex-none'
                    onClick={() => {
                      setMovementForm((prev) => ({
                        ...prev,
                        branchId: selectedBranchId || prev.branchId,
                      }))
                      resetMovementForm(
                        selectedBranchId || movementForm.branchId
                      )
                      setShowVehicleModal(true)
                    }}
                  >
                    <IconPlus className='h-3 w-3' /> New Entry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab content */}
        <VehicleFlowTab
          filteredMovements={filteredMovements}
          groupedLoadRequirements={groupedLoadRequirements}
          loading={loading}
          requestType={requestType}
          branches={branches}
          assignedLoads={filterLoads}
          transporters={transporters}
          selectedBranchId={effectiveBranchId}
          setSelectedBranchId={handleBranchChange}
          isBranchScopedUser={isBranchScopedUser}
          canCreateMovement={canCreateMovement}
          canGateIn={canGateIn}
          canInspectMovement={canInspectMovement}
          canGateOut={canGateOut}
          saving={saving}
          operationLoading={operationLoading}
          notesByMovementId={notesByMovementId}
          setNotesByMovementId={setNotesByMovementId}
          inspectionChecks={inspectionChecks}
          setInspectionCheck={setInspectionCheck}
          runMovementAction={handleActionWithConfirmation}
          complianceByMovementId={complianceByMovementId}
          runComplianceCheck={() => {

          }}
          evidenceByMovementId={evidenceByMovementId}
          addEvidencePhotos={addEvidencePhotos}
          removeEvidencePhoto={removeEvidencePhoto}
          setMovementForm={setMovementForm}
          resetMovementForm={resetMovementForm}
          setShowVehicleModal={setShowVehicleModal}
          movementForm={movementForm}
          expectedCount={backendCounts.expected}
          inspectionCount={backendCounts.gate_in_recorded}
          verifiedCount={backendCounts.inspection_verified}
          rejectedCount={backendCounts.inspection_rejected}
          movementFilters={movementFilters}
          setMovementFilters={setMovementFilters}
          movementPagination={movementPagination}
          movementPage={movementPage}
          setMovementPage={setMovementPage}
          setMovementPageSize={setMovementPageSize}
          expandedRows={expandedRows}
          toggleRowExpansion={toggleRowExpansion}
          collapsedLoadGroups={collapsedLoadGroups}
          toggleLoadGroup={toggleLoadGroup}
        />

        {/* Vehicle Entry Modal */}
        <VehicleEntryModal
          open={showVehicleModal}
          onOpenChange={setShowVehicleModal}
          movementForm={movementForm}
          setMovementForm={setMovementForm}
          branches={branches}
          transporters={transporters}
          selectedTransporterAssignments={selectedTransporterAssignments}
          selectedLoadBids={selectedLoadBids}
          needsLoadConfirmation={needsLoadConfirmation}
          validationErrors={validationErrors}
          workflowDraft={vehicleWorkflowDraft}
          onTransporterChange={handleTransporterChange}
          onLoadChange={handleLoadChange}
          onBidChange={handleBidChange}
          onLookupVehicle={handleLookupVehicle}
          onAddWorkflowPhotos={handleAddWorkflowPhotos}
          onRemoveWorkflowPhoto={handleRemoveWorkflowPhoto}
          onSubmit={handleCreateMovement}
          saving={saving}
          manualLoadEntry={manualLoadEntry}
          setManualLoadEntry={setManualLoadEntry}
        />

        {/* Confirm dialog modal */}
        <Dialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog((p) => ({ ...p, open }))}
        >
          <DialogContent className='max-w-md border-border/50 bg-white dark:bg-slate-900'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-1.5 text-sm font-semibold'>
                <IconAlertCircle className='h-4.5 w-4.5 text-rose-500' />
                Confirm Vehicle Action
              </DialogTitle>
            </DialogHeader>
            <div className='py-2 text-xs leading-relaxed text-muted-foreground'>
              {confirmDialog.message}
            </div>
            <DialogFooter className='gap-2 border-t pt-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setConfirmDialog((p) => ({ ...p, open: false }))}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={async () => {
                  if (confirmDialog.movementId && confirmDialog.action) {
                    await runMovementAction(
                      confirmDialog.movementId,
                      confirmDialog.action
                    )
                  }
                  setConfirmDialog((p) => ({ ...p, open: false }))
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Gate In modal - now using combined component */}
        <GateCheckpointModal
          open={gateInModal.open}
          onOpenChange={(open) => setGateInModal((p) => ({ ...p, open }))}
          movementId={gateInModal.movementId}
          movements={movements}
          checkpointType='gateIn'
          notesByMovementId={notesByMovementId}
          setNotesByMovementId={setNotesByMovementId}
          evidenceByMovementId={evidenceByMovementId}
          addEvidencePhotos={addEvidencePhotos}
          removeEvidencePhoto={removeEvidencePhoto}
          onSubmit={runMovementAction}
          saving={saving}
          photoUploadingByMovementId={photoUploadingByMovementId}
        />

        {/* Gate Out modal - using same component with different props */}
        <GateCheckpointModal
          open={gateOutModal.open}
          onOpenChange={(open) => setGateOutModal((p) => ({ ...p, open }))}
          movementId={gateOutModal.movementId}
          movements={movements}
          checkpointType='gateOut'
          inspectionChecks={inspectionChecks}
          setInspectionCheck={setInspectionCheck}
          notesByMovementId={notesByMovementId}
          setNotesByMovementId={setNotesByMovementId}
          evidenceByMovementId={evidenceByMovementId}
          addEvidencePhotos={addEvidencePhotos}
          removeEvidencePhoto={removeEvidencePhoto}
          onSubmit={runMovementAction}
          saving={saving}
          photoUploadingByMovementId={photoUploadingByMovementId}
        />
        {/* Inspect modal */}
        <InspectModal
          open={inspectModal.open}
          onOpenChange={(open) => setInspectModal((p) => ({ ...p, open }))}
          movementId={inspectModal.movementId}
          movements={movements}
          inspectionChecks={inspectionChecks}
          setInspectionCheck={setInspectionCheck}
          notesByMovementId={notesByMovementId}
          setNotesByMovementId={setNotesByMovementId}
          evidenceByMovementId={evidenceByMovementId}
          onSubmit={async (id, action) => await runMovementAction(id, action)}
          saving={saving}
        />
      </Layout.Body>
    </Layout>
  )
}
