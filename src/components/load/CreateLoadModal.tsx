import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  Loader2,
  AlertCircle,
  Lock,
  AlertTriangle,
  Save,
  Check,
  ChevronsUpDown,
  X,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/custom/button'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

import type { CreateLoadPayload } from '@/api/services/load/loads.crud.service'
import { RootState } from '@/store'
import { hasPermission } from '@/lib/permissions'
import { useLoadStore } from '@/lib/hooks/useLoadStore'
import { listAdminTransporters } from '@/api/services/load/loadAccess.service'
import { branchesService, type Branch } from '@/api/services/branches/branches.service'
import { cn } from '@/lib/utils'

interface CreateLoadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit' | 'manage'
  loadId?: string
  initialData?: Partial<LoadFormData>
  onSuccess?: () => void
}

type SearchableOption = {
  value: string
  label: string
  description?: string
}

type LoadFormData = {
  loadNumber?: string
  loadDirection: 'outbound' | 'inbound'
  isPublic: boolean
  allowedTransporters: string[]
  material: string
  vehicleType: 'truck' | 'van' | 'bike' | 'car' | 'bus' | 'flatbed' | 'container' | 'tanker'
  numberOfVehicles: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  pickupBranchId?: string
  pickupAddress: string
  pickupCity: string
  pickupState: string
  pickupZipCode: string
  pickupContactPerson?: string
  pickupPhone?: string
  pickupEmail?: string
  deliveryBranchId?: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryZipCode: string
  deliveryContactPerson?: string
  deliveryPhone?: string
  deliveryEmail?: string
  pickupDate: string
  deliveryDate: string
  specialRequirements?: string
  notes?: string
  refNumber?: string
  estimatedWeight?: number
}

// Priority Badge
const PriorityBadge = ({ priority }: { priority: string }) => {
  const config = {
    low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Low' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Medium' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'High' },
    urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Urgent' }
  }
  const config_item = config[priority as keyof typeof config] || config.medium

  return (
    <Badge className={cn(
      config_item.bg,
      config_item.text,
      config_item.border,
      'border font-medium px-3 py-1'
    )}>
      {config_item.label}
    </Badge>
  )
}

// Auto-generate load number
const generateLoadNumber = () => {
  const prefix = 'LDN'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Helper to convert datetime-local string to ISO string
const datetimeLocalToISO = (datetimeLocal: string): string => {
  if (!datetimeLocal) return ''
  const date = new Date(datetimeLocal)
  return date.toISOString()
}

// Helper to convert ISO string to datetime-local format
const isoToDatetimeLocal = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toISOString().slice(0, 16)
}

// FIXED: Clear all branch-related fields
const clearBranchFields = (
  prefix: 'pickup' | 'delivery',
  form: ReturnType<typeof useForm<LoadFormData>>
) => {
  const fields: (keyof LoadFormData)[] = [
    `${prefix}Address`,
    `${prefix}City`,
    `${prefix}State`,
    `${prefix}ZipCode`,
    `${prefix}ContactPerson`,
    `${prefix}Phone`,
    `${prefix}Email`
  ] as (keyof LoadFormData)[]

  fields.forEach((fieldName) => {
    form.setValue(fieldName, '', { shouldDirty: true })
  })
}

// FIXED: Fill location from branch
const fillLocationFromBranch = (
  branch: Branch | undefined,
  prefix: 'pickup' | 'delivery',
  form: ReturnType<typeof useForm<LoadFormData>>
) => {
  if (!branch) return

  const mapping: Record<string, string> = {
    Address: branch.address?.line1 || '',
    City: branch.address?.city || '',
    State: branch.address?.state || '',
    ZipCode: branch.address?.pincode || '',
    ContactPerson: branch.contactPerson?.name || branch.managerName || '',
    Phone: branch.contactPerson?.phone || branch.phone || '',
    Email: branch.contactPerson?.email || branch.email || '',
  }

  Object.entries(mapping).forEach(([suffix, nextValue]) => {
    const fieldName = `${prefix}${suffix}` as keyof LoadFormData
    form.setValue(fieldName, nextValue as never, { shouldDirty: true })
  })
}

const RequiredLabel = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <FormLabel className={className}>
    {children} <span className="text-red-500">*</span>
  </FormLabel>
)

// FIXED: SearchableSelect with proper clear handling
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  className,
}: {
  value?: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)

  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.description || ''}`.toLowerCase().includes(searchInput.toLowerCase())
  )

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setSearchInput('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setOpen((current) => {
            const next = !current
            if (!next) setSearchInput('')
            return next
          })
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-all',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
          <div className="space-y-2">
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              disabled={disabled}
              autoFocus
              className="h-9"
            />
            <div className="max-h-60 overflow-y-auto rounded-md border">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                    onClick={() => {
                      onChange(option.value)
                      setOpen(false)
                      setSearchInput('')
                    }}
                  >
                    <Check
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0 transition-opacity',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.description && (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function CreateLoadModal({
  open,
  onOpenChange,
  mode = 'create',
  initialData,
  onSuccess
}: CreateLoadModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('basic')
  const [isDirty, setIsDirty] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const user: any = useSelector((state: RootState) => state.auth.user)
  const canCreateLoad = user ? hasPermission(user, 'load.create') : false
  const canEditLoad = user ? hasPermission(user, 'load.edit') : false
  const canManageLoad = user ? hasPermission(user, 'load.manage') : false

  const { createLoad, creating } = useLoadStore()

  const [transportersOptions, setTransportersOptions] = useState<Array<{ _id: string; name: string; companyName?: string }>>([])
  const [branchOptions, setBranchOptions] = useState<Branch[]>([])

  const hasPermissionForMode =
    (mode === 'create' && canCreateLoad) ||
    (mode === 'edit' && canEditLoad) ||
    (mode === 'manage' && canManageLoad)

  useEffect(() => {
    if (!open) return

      ; (async () => {
        try {
          const [branchList, transporterList] = await Promise.all([
            branchesService.list({ limit: 100, status: 'active' }),
            ['company_admin', 'super_admin'].includes(user?.role) ? listAdminTransporters() : Promise.resolve([]),
          ])
          setBranchOptions(branchList.branches || [])
          setTransportersOptions(transporterList)
        } catch (e) {
          console.error('Failed to load load-form options', e)
        }
      })()
  }, [open, user?.role])

  const form = useForm<LoadFormData>({
    defaultValues: {
      loadNumber: initialData?.loadNumber || generateLoadNumber(),
      loadDirection: initialData?.loadDirection || 'outbound',
      isPublic: initialData?.isPublic ?? true,
      allowedTransporters: initialData?.allowedTransporters || [],
      priority: initialData?.priority || 'medium',
      vehicleType: initialData?.vehicleType || 'truck',
      numberOfVehicles: initialData?.numberOfVehicles || 1,
      pickupDate: initialData?.pickupDate ? isoToDatetimeLocal(initialData.pickupDate) : '',
      deliveryDate: initialData?.deliveryDate ? isoToDatetimeLocal(initialData.deliveryDate) : '',
      ...initialData
    },
  })

  const watchedValues = form.watch()
  const branchSelectOptions = branchOptions.map((branch) => ({
    value: branch._id,
    label: branch.name,
    description: [branch.code, branch.address?.city, branch.address?.state].filter(Boolean).join(' • '),
  }))
  const transporterSelectOptions = transportersOptions.map((transporter) => ({
    value: transporter._id,
    label: transporter.companyName || transporter.name,
    description: transporter.companyName && transporter.name && transporter.companyName !== transporter.name
      ? transporter.name
      : undefined,
  }))

  useEffect(() => {
    setIsDirty(form.formState.isDirty)
  }, [watchedValues, form.formState.isDirty])

  const pickupBranchId = form.watch('pickupBranchId')
  const deliveryBranchId = form.watch('deliveryBranchId')

  // FIXED: Handle pickup branch selection
  useEffect(() => {
    if (pickupBranchId) {
      const branch = branchOptions.find((item) => item._id === pickupBranchId)
      if (branch) {
        fillLocationFromBranch(branch, 'pickup', form)
      }
    }
  }, [pickupBranchId, branchOptions, form])

  // FIXED: Handle delivery branch selection
  useEffect(() => {
    if (deliveryBranchId) {
      const branch = branchOptions.find((item) => item._id === deliveryBranchId)
      if (branch) {
        fillLocationFromBranch(branch, 'delivery', form)
      }
    }
  }, [deliveryBranchId, branchOptions, form])

  // FIXED: Handle clear pickup branch - clears branch ID and all fields
  const handleClearPickupBranch = useCallback(() => {
    form.setValue('pickupBranchId', '')
    clearBranchFields('pickup', form)
    // Trigger dirty state
    form.trigger()
  }, [form])

  // FIXED: Handle clear delivery branch - clears branch ID and all fields
  const handleClearDeliveryBranch = useCallback(() => {
    form.setValue('deliveryBranchId', '')
    clearBranchFields('delivery', form)
    // Trigger dirty state
    form.trigger()
  }, [form])

  const getTitle = useCallback(() => {
    switch (mode) {
      case 'edit': return 'Edit Load'
      case 'manage': return 'Manage Load'
      default: return 'Create New Load'
    }
  }, [mode])

  const getDescription = useCallback(() => {
    switch (mode) {
      case 'edit': return 'Update the details of this load'
      case 'manage': return 'Manage load assignment and tracking'
      default: return 'Enter the details of the load to be transported'
    }
  }, [mode])

  const validateForm = useCallback((): boolean => {
    const values = form.getValues()
    const errors: string[] = []

    if (!values.material?.trim()) errors.push('Material is required')
    if (!values.vehicleType) errors.push('Vehicle type is required')
    if (!values.numberOfVehicles || values.numberOfVehicles < 1) errors.push('Number of vehicles must be at least 1')
    if (!values.priority) errors.push('Priority is required')
    if (!values.isPublic && values.allowedTransporters.length === 0) {
      errors.push('Select at least one transporter for private visibility')
    }

    if (values.loadDirection === 'outbound' && !values.pickupBranchId) {
      errors.push('Pickup branch is required for outbound requests')
    }
    if (values.loadDirection === 'inbound' && !values.deliveryBranchId) {
      errors.push('Delivery branch is required for inbound requests')
    }

    if (!values.pickupAddress?.trim()) errors.push('Pickup address is required')
    if (!values.pickupCity?.trim()) errors.push('Pickup city is required')
    if (!values.pickupState?.trim()) errors.push('Pickup state is required')
    if (!values.pickupZipCode?.trim()) errors.push('Pickup zip code is required')
    if (!values.pickupDate) errors.push('Pickup date is required')
    if (!values.deliveryAddress?.trim()) errors.push('Delivery address is required')
    if (!values.deliveryCity?.trim()) errors.push('Delivery city is required')
    if (!values.deliveryState?.trim()) errors.push('Delivery state is required')
    if (!values.deliveryZipCode?.trim()) errors.push('Delivery zip code is required')
    if (!values.deliveryDate) errors.push('Delivery date is required')

    if (values.pickupDate) {
      const pickupDate = new Date(values.pickupDate)
      if (pickupDate <= new Date()) errors.push('Pickup date must be in the future')
    }
    if (values.deliveryDate) {
      const deliveryDate = new Date(values.deliveryDate)
      if (deliveryDate <= new Date()) errors.push('Delivery date must be in the future')
    }
    if (values.pickupDate && values.deliveryDate) {
      const pickupDate = new Date(values.pickupDate)
      const deliveryDate = new Date(values.deliveryDate)
      if (deliveryDate <= pickupDate) errors.push('Delivery date must be after pickup date')
    }

    if (errors.length > 0) {
      setFormErrors(errors)
      return false
    }
    setFormErrors([])
    return true
  }, [form])

  const onSubmit = async (data: LoadFormData) => {
    try {
      if (!hasPermissionForMode) {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action',
          variant: 'destructive',
        })
        return
      }

      setIsSubmitting(true)
      setFormErrors([])

      if (!validateForm()) {
        setIsSubmitting(false)
        return
      }

      const payload: CreateLoadPayload = {
        loadNumber: data.loadNumber || generateLoadNumber(),
        loadDirection: data.loadDirection,
        isPublic: data.isPublic,
        allowedTransporters: data.isPublic ? [] : data.allowedTransporters,
        material: data.material,
        vehicleType: data.vehicleType,
        numberOfVehicles: data.numberOfVehicles,
        priority: data.priority,
        pickupLocation: {
          branchId: data.pickupBranchId || undefined,
          address: data.pickupAddress,
          city: data.pickupCity,
          state: data.pickupState,
          zipCode: data.pickupZipCode,
          contactPerson: data.pickupContactPerson || undefined,
          phone: data.pickupPhone || undefined,
          email: data.pickupEmail || undefined,
        },
        deliveryLocation: {
          branchId: data.deliveryBranchId || undefined,
          address: data.deliveryAddress,
          city: data.deliveryCity,
          state: data.deliveryState,
          zipCode: data.deliveryZipCode,
          contactPerson: data.deliveryContactPerson || undefined,
          phone: data.deliveryPhone || undefined,
          email: data.deliveryEmail || undefined,
        },
        pickupDate: datetimeLocalToISO(data.pickupDate),
        deliveryDate: datetimeLocalToISO(data.deliveryDate),
        specialRequirements: data.specialRequirements
          ? data.specialRequirements
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .join(',')
          : undefined,
        notes: data.notes || undefined,
        refNumber: data.refNumber || undefined,
        estimatedWeight: data.estimatedWeight || undefined,
      }

      await createLoad(payload)

      toast({
        title: 'Success',
        description: `Load ${payload.loadNumber} created successfully`,
        duration: 5000,
      })

      form.reset()
      setIsDirty(false)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (error: any) {
      console.error('Create load error:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
      if (error?.response?.data?.errors) {
        const errors = error.response.data.errors
        setFormErrors(Object.values(errors).flat() as string[])
      }
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      )
      if (!confirmClose) return
    }
    form.reset()
    setIsDirty(false)
    setFormErrors([])
    onOpenChange(false)
  }, [isDirty, onOpenChange, form])

  if (!hasPermissionForMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Lock className="h-5 w-5" />
              Access Denied
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-600">Permission Required</p>
                <p className="mt-1 text-sm text-gray-600">
                  You don't have permission to {mode} loads. Only authorized users can perform this action.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-gray-500">
              Contact your administrator to request access
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              className="mt-4 w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const now = new Date()
  const minDateTime = now.toISOString().slice(0, 16)
  const pickupDateValue = form.watch('pickupDate')
  let minDeliveryDateTime = new Date(now.getTime() + 3600000).toISOString().slice(0, 16)
  if (pickupDateValue) {
    const pickupDate = new Date(pickupDateValue)
    minDeliveryDateTime = new Date(pickupDate.getTime() + 3600000).toISOString().slice(0, 16)
  }

  const loadDirection = form.watch('loadDirection')
  const pickupSectionTitle = loadDirection === 'inbound' ? 'Origin / Supplier' : 'Pickup / Dispatch'
  const deliverySectionTitle = loadDirection === 'inbound' ? 'Receiving / Plant' : 'Delivery / Customer'
  const showPickupBranchSelector = loadDirection === 'outbound'
  const showDeliveryBranchSelector = loadDirection === 'inbound'
  const pickupBranchDescription =
    loadDirection === 'outbound'
      ? 'Select the dispatch branch. Details will auto-fill.'
      : 'Enter the supplier details below.'
  const deliveryBranchDescription =
    loadDirection === 'inbound'
      ? 'Select the receiving branch. Details will auto-fill.'
      : 'Enter the destination details below.'
  const selectedPickupBranch = branchOptions.find((branch) => branch._id === pickupBranchId)
  const selectedDeliveryBranch = branchOptions.find((branch) => branch._id === deliveryBranchId)

  // FIXED: Check if pickup branch is selected and fields are filled
  const isPickupBranchFilled = pickupBranchId && selectedPickupBranch

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0 rounded-lg overflow-hidden"
        onInteractOutside={(e) => {
          if (isDirty) e.preventDefault()
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {getTitle()}
                {mode === 'edit' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Edit
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {getDescription()}
              </DialogDescription>
            </div>
            {isDirty && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="px-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                {/* Error Display */}
                {formErrors.length > 0 && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                      <div className="flex-1">
                        <p className="font-medium text-red-600 text-sm">Please fix the following errors:</p>
                        <ul className="mt-2 space-y-1">
                          {formErrors.map((error, index) => (
                            <li key={index} className="text-sm text-red-600">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="location">Locations</TabsTrigger>
                    <TabsTrigger value="additional">Additional</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Basic Info */}
                  <TabsContent value="basic" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="loadDirection"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <RequiredLabel>Request Direction</RequiredLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || creating}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="outbound">Outbound (branch to customer)</SelectItem>
                                <SelectItem value="inbound">Inbound (supplier to branch)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visibility</FormLabel>
                            <Select
                              onValueChange={(v) => {
                                field.onChange(v === 'public')
                                if (v === 'public') {
                                  form.setValue('allowedTransporters', [])
                                }
                              }}
                              value={field.value ? 'public' : 'private'}
                              disabled={isSubmitting || creating}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="public">Public (all transporters)</SelectItem>
                                <SelectItem value="private">Private (selected transporters)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <RequiredLabel>Priority</RequiredLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || creating}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low"><PriorityBadge priority="low" /></SelectItem>
                                <SelectItem value="medium"><PriorityBadge priority="medium" /></SelectItem>
                                <SelectItem value="high"><PriorityBadge priority="high" /></SelectItem>
                                <SelectItem value="urgent"><PriorityBadge priority="urgent" /></SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="loadNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Load Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Auto-generated"
                                {...field}
                                disabled={isSubmitting || creating}
                              />
                            </FormControl>
                            <FormDescription>Auto-generated if empty</FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="material"
                        render={({ field }) => (
                          <FormItem>
                            <RequiredLabel>Material</RequiredLabel>
                            <FormControl>
                              <Input placeholder="e.g., Steel, Wood, Electronics" {...field} disabled={isSubmitting || creating} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vehicleType"
                        render={({ field }) => (
                          <FormItem>
                            <RequiredLabel>Vehicle Type</RequiredLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || creating}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="truck">Truck</SelectItem>
                                <SelectItem value="van">Van</SelectItem>
                                <SelectItem value="flatbed">Flatbed</SelectItem>
                                <SelectItem value="container">Container</SelectItem>
                                <SelectItem value="tanker">Tanker</SelectItem>
                                <SelectItem value="bike">Bike</SelectItem>
                                <SelectItem value="car">Car</SelectItem>
                                <SelectItem value="bus">Bus</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="numberOfVehicles"
                        render={({ field }) => (
                          <FormItem>
                            <RequiredLabel>Number of Vehicles</RequiredLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="Enter number"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? 0 : Number(e.target.value)
                                  field.onChange(value)
                                }}
                                disabled={isSubmitting || creating}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="refNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reference Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional reference" {...field} disabled={isSubmitting || creating} />
                            </FormControl>
                            <FormDescription>Optional tracking reference</FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estimatedWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Optional weight"
                                value={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value)
                                  field.onChange(value)
                                }}
                                disabled={isSubmitting || creating}
                              />
                            </FormControl>
                            <FormDescription>Optional weight estimate</FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Transporter Selection */}
                    <div className="mt-6 pt-6 border-t">
                      <FormField
                        control={form.control}
                        name="allowedTransporters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowed Transporters</FormLabel>
                            {!form.watch('isPublic') ? (
                              <div className="space-y-3">
                                <SearchableSelect
                                  value={undefined}
                                  onChange={(value) => {
                                    if (!field.value.includes(value)) {
                                      field.onChange([...field.value, value])
                                    }
                                  }}
                                  options={transporterSelectOptions.filter((option) => !field.value.includes(option.value))}
                                  placeholder="Search and add transporter"
                                  searchPlaceholder="Search by name or company..."
                                  emptyMessage="No transporter found"
                                  disabled={isSubmitting || creating || transporterSelectOptions.length === 0}
                                />

                                {field.value.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {field.value.map((id) => {
                                      const opt = transportersOptions.find((t) => t._id === id)
                                      if (!opt) return null
                                      return (
                                        <Badge
                                          key={id}
                                          variant="secondary"
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
                                        >
                                          {opt.name}
                                          <button
                                            type="button"
                                            onClick={() => field.onChange(field.value.filter((x) => x !== id))}
                                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                                <p>Public loads are visible to all transporters</p>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Tab 2: Locations */}
                  <TabsContent value="location" className="mt-4">
                    <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
                      <p className="text-sm font-medium">
                        {loadDirection === 'outbound'
                          ? 'Flow: Branch → Customer'
                          : 'Flow: Supplier → Branch'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {loadDirection === 'outbound'
                          ? 'Select the pickup branch, then confirm delivery destination'
                          : 'Select the receiving branch, then confirm origin location'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Pickup Location */}
                      <div>
                        <h3 className="font-semibold text-sm mb-4">{pickupSectionTitle}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{pickupBranchDescription}</p>

                        <div className="space-y-4">
                          {showPickupBranchSelector && (
                            <FormField
                              control={form.control}
                              name="pickupBranchId"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">Branch</RequiredLabel>
                                  <div className="relative">
                                    <SearchableSelect
                                      value={field.value}
                                      onChange={(value) => {
                                        field.onChange(value)
                                      }}
                                      options={branchSelectOptions}
                                      placeholder="Select dispatch branch"
                                      searchPlaceholder="Search branch..."
                                      emptyMessage="No branch found"
                                      disabled={isSubmitting || creating}
                                    />
                                    {field.value && (
                                      <button
                                        type="button"
                                        onClick={handleClearPickupBranch}
                                        className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        disabled={isSubmitting || creating}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  {isPickupBranchFilled && (
                                    <div className="mt-1.5 rounded bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                      <span>✓</span> Auto-filled from {selectedPickupBranch.name}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="pickupAddress"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">Address</RequiredLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Street address"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="pickupCity"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">City</RequiredLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="City"
                                      {...field}
                                      disabled={isSubmitting || creating}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="pickupState"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">State</RequiredLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="State"
                                      {...field}
                                      disabled={isSubmitting || creating}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="pickupZipCode"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">ZIP Code</RequiredLabel>
                                <FormControl>
                                  <Input
                                    placeholder="ZIP code"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Separator />

                          <FormField
                            control={form.control}
                            name="pickupContactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Contact Person</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Contact person"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pickupPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Phone number"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pickupEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Email address"
                                    type="email"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pickupDate"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">Pickup Date & Time</RequiredLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    min={minDateTime}
                                    {...field}
                                    disabled={isSubmitting || creating}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">Must be in the future</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Delivery Location */}
                      <div>
                        <h3 className="font-semibold text-sm mb-4">{deliverySectionTitle}</h3>
                        <p className="text-xs text-muted-foreground mb-4">{deliveryBranchDescription}</p>

                        <div className="space-y-4">
                          {showDeliveryBranchSelector && (
                            <FormField
                              control={form.control}
                              name="deliveryBranchId"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">Branch</RequiredLabel>
                                  <div className="relative">
                                    <SearchableSelect
                                      value={field.value}
                                      onChange={(value) => {
                                        field.onChange(value)
                                      }}
                                      options={branchSelectOptions}
                                      placeholder="Select receiving branch"
                                      searchPlaceholder="Search branch..."
                                      emptyMessage="No branch found"
                                      disabled={isSubmitting || creating}
                                    />
                                    {field.value && (
                                      <button
                                        type="button"
                                        onClick={handleClearDeliveryBranch}
                                        className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        disabled={isSubmitting || creating}
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  {selectedDeliveryBranch && (
                                    <div className="mt-1.5 rounded bg-blue-50 px-3 py-1.5 text-xs text-blue-700 border border-blue-200 flex items-center gap-1.5">
                                      <span>✓</span> Auto-filled from {selectedDeliveryBranch.name}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">Address</RequiredLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Street address"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name="deliveryCity"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">City</RequiredLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="City"
                                      {...field}
                                      disabled={isSubmitting || creating}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deliveryState"
                              render={({ field }) => (
                                <FormItem>
                                  <RequiredLabel className="text-xs font-medium">State</RequiredLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="State"
                                      {...field}
                                      disabled={isSubmitting || creating}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="deliveryZipCode"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">ZIP Code</RequiredLabel>
                                <FormControl>
                                  <Input
                                    placeholder="ZIP code"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Separator />

                          <FormField
                            control={form.control}
                            name="deliveryContactPerson"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Contact Person</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Contact person"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="deliveryPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Phone</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Phone number"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="deliveryEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium">Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Email address"
                                    type="email"
                                    {...field}
                                    disabled={isSubmitting || creating}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="deliveryDate"
                            render={({ field }) => (
                              <FormItem>
                                <RequiredLabel className="text-xs font-medium">Delivery Date & Time</RequiredLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    min={minDeliveryDateTime}
                                    {...field}
                                    disabled={isSubmitting || creating}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">Must be after pickup date</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Additional */}
                  <TabsContent value="additional" className="mt-4">
                    <FormField
                      control={form.control}
                      name="specialRequirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Requirements</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Fragile, Handle with care, Temperature controlled"
                              className="resize-none min-h-[100px]"
                              {...field}
                              disabled={isSubmitting || creating}
                            />
                          </FormControl>
                          <FormDescription>Separate multiple requirements with commas</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any additional notes about this load"
                              className="resize-none min-h-[100px]"
                              {...field}
                              disabled={isSubmitting || creating}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </form>
            </Form>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="text-red-500">*</span> Required fields
              {isDirty && (
                <span className="ml-2 text-yellow-600">Unsaved changes</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting || creating}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting || creating}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {mode === 'create' ? 'Create Load' : 'Save Changes'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
