// src/pages/load/index.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Package,
  Edit2,
} from 'lucide-react'

import { Button } from '@/components/custom/button'
import { Layout } from '@/components/custom/layout'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLoadStore } from '@/lib/hooks/useLoadStore'

// Types
import type { LoadStatus } from '@/api/services/load/loads.service'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { CreateLoadModal } from '@/components/load/CreateLoadModal'

type LoadPriority = 'low' | 'medium' | 'high' | 'urgent'

interface ModalConfig {
  open: boolean
  mode: 'create' | 'edit' | 'manage'
  loadId?: string
}

// Status badge component
const StatusBadge = ({ status }: { status: LoadStatus }) => {
  const variants: Record<LoadStatus, { label: string; className: string }> = {
    open: { label: 'Open', className: 'bg-blue-100 text-blue-800' },
    assigned: { label: 'Assigned', className: 'bg-yellow-100 text-yellow-800' },
    in_transit: { label: 'In Transit', className: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
    canceled: { label: 'Canceled', className: 'bg-red-100 text-red-800' },
  }

  return (
    <Badge className={variants[status].className}>
      {variants[status].label}
    </Badge>
  )
}

// Priority badge component
const PriorityBadge = ({ priority }: { priority: any }) => {
  const variants: Record<string, { label: string; className: string }> = {
    low: { label: 'Low', className: 'bg-gray-100 text-gray-800' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
    urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800 animate-pulse' },
  }

  const variant = variants[priority as string] || variants.low

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  )
}

export default function Loads() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    open: false,
    mode: 'create',
  })

  // Redux store
  const {
    loads,
    pagination,
    loading,
    listError,
    listLoads,
    clearListError,
    setPage,
  } = useLoadStore()

  // Local filter states for UI
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LoadStatus | 'all'>('all')
  const [priority, setPriority] = useState<LoadPriority | 'all'>('all')
  const [sortBy, setSortBy] = useState('-createdAt')

  // Pagination
  const canPrev = pagination.page > 1
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.limit))
  const canNext = pagination.page < pages

  // Fetch loads on mount and when filters change
  useEffect(() => {
    listLoads({
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : (priority as any),
      sortBy,
    })
  }, [pagination.page, search, status, priority, sortBy])

  // Display error toast
  useEffect(() => {
    if (listError) {
      toast({
        title: 'Failed to load loads',
        description: listError,
        variant: 'destructive',
      })
      clearListError()
    }
  }, [listError, toast, clearListError])

  // Handlers
  const handleSearch = () => {
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
    setPriority('all')
    setSortBy('-createdAt')
    setPage(1)
  }

  const handleCreateLoad = () => {
    setModalConfig({ open: true, mode: 'create' })
  }

  const handleViewLoad = (loadId: string) => {
    navigate(`/load/${loadId}`)
  }

  const handleEditLoad = (loadId: string) => {
    setModalConfig({ open: true, mode: 'edit', loadId })
  }

  const handleCloseModal = () => {
    setModalConfig({ open: false, mode: 'create' })
  }

  return (
    <>
      <Layout>
        <Layout.Header sticky>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <UserNav />
          </div>
        </Layout.Header>

        <Layout.Body>
          <div className="flex items-center justify-between w-full pb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Loads</h1>
              <p className="text-sm text-muted-foreground">
                Manage and track all your transportation loads
              </p>
            </div>
            <Button onClick={handleCreateLoad}>
              <Plus className="h-4 w-4" />
              Create Load
            </Button>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by load number or material..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={status} onValueChange={(v) => setStatus(v as LoadStatus | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priority} onValueChange={(v) => setPriority(v as LoadPriority | 'all')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-createdAt">Newest First</SelectItem>
                    <SelectItem value="createdAt">Oldest First</SelectItem>
                    <SelectItem value="-pickupDate">Pickup Soon</SelectItem>
                    <SelectItem value="pickupDate">Pickup Later</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>

                <Button onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pagination.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loads?.filter((l) => l?.status === 'open').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {loads.filter((l) => l.status === 'in_transit').length || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loads.filter((l) => l.status === 'delivered').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="p-2">
            <div className="rounded-lg ">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Load #</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Bid Cost</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="text-right">Winner Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-20 ml-auto bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-20 ml-auto bg-muted animate-pulse rounded" />
                        </TableCell>
                        <TableCell>
                          <div className="h-8 w-20 ml-auto bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : loads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-lg font-medium">No loads found</p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or create a new load
                          </p>
                          <Button variant="outline" className="mt-2" onClick={handleCreateLoad}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Load
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    loads.map((load) => (
                      <TableRow key={load._id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <button
                            onClick={() => handleViewLoad(load._id)}
                            className="hover:text-primary transition-colors"
                          >
                            {load.loadNumber}
                          </button>
                        </TableCell>
                        <TableCell>{load.material}</TableCell>
                        <TableCell>
                          <StatusBadge status={load.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={load.priority} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div>
                            <div>
                              {typeof load.bidSummary?.lowestBid === 'number'
                                ? `₹${load.bidSummary.lowestBid.toLocaleString()}`
                                : '-'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {load.bidSummary?.totalBids || 0} bids
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(load.pickupDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {load.pickupLocation?.city}, {load.pickupLocation?.state}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(load.deliveryDate), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {load.deliveryLocation?.city}, {load.deliveryLocation?.state}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {load.bidWinningPrice ? `₹${load.bidWinningPrice.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLoad(load._id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLoad(load._id)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {loads.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} loads
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => setPage(Math.max(1, pagination.page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </Layout.Body>
      </Layout>

      <CreateLoadModal
        open={modalConfig.open}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseModal()
          }
        }}
        mode={modalConfig.mode}
        loadId={modalConfig.loadId}
      />
    </>
  )
}
