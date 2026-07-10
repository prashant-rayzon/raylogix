import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/custom/button'
import { Input } from '@/components/ui/input'
import ThemeSwitch from '@/components/theme-switch'
import { UserNav } from '@/components/user-nav'
import { toast } from '@/components/ui/use-toast'
import {
  IconArrowLeft,
  IconDownload,
  IconReceipt2,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { reportsService, BillingReportResponse } from '@/api/services/reports/reports.service'
import { exportToExcel } from '@/lib/export'
import { validateReportDateRange } from '@/lib/report-filters'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899']

export default function BillingReport() {
  const navigate = useNavigate()
  const [data, setData] = useState<BillingReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')

  const loadReport = useCallback(async () => {
    const validationError = validateReportDateRange({ dateFrom, dateTo })
    if (validationError) {
      toast({
        title: 'Invalid filters',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const res = await reportsService.getBillingReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || undefined,
      })
      setData(res)
    } catch (error: any) {
      toast({
        title: 'Failed to load billing report',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, status])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const filteredItems = data?.items.filter(item => {
    const term = search.toLowerCase()
    return (
      item.loadNumber.toLowerCase().includes(term) ||
      item.transporterName.toLowerCase().includes(term) ||
      item.pickupCity.toLowerCase().includes(term) ||
      item.deliveryCity.toLowerCase().includes(term) ||
      item.vehicleNumber.toLowerCase().includes(term) ||
      item.productName.toLowerCase().includes(term)
    )
  }) || []

  const handleExport = async () => {
    if (!data || filteredItems.length === 0) return
    try {
      const columns = [
        { header: 'Load Number', key: 'loadNumber', width: 18 },
        { header: 'Origin City', key: 'pickupCity', width: 15 },
        { header: 'Origin State', key: 'pickupState', width: 15 },
        { header: 'Destination City', key: 'deliveryCity', width: 15 },
        { header: 'Destination State', key: 'deliveryState', width: 15 },
        { header: 'Transporter Name', key: 'transporterName', width: 25 },
        { header: 'Allocated Vehicles', key: 'allocatedVehicles', width: 18 },
        { header: 'Rate Confirmed', key: 'rate', width: 15 },
        { header: 'Rate Type', key: 'rateType', width: 15 },
        { header: 'Total Billing (INR)', key: 'totalCost', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Assigned Date', key: 'assignedAt', width: 22 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 20 },
        { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
        { header: 'Driver Name', key: 'driverName', width: 18 },
        { header: 'Driver Phone', key: 'driverNumber', width: 18 },
        { header: 'Product Name', key: 'productName', width: 20 },
        { header: 'Quantity', key: 'loadQuantity', width: 15 },
        { header: 'Unit basis', key: 'loadBasis', width: 15 },
        { header: 'Distance (Km)', key: 'loadDistance', width: 15 },
        { header: 'PTPK Rate', key: 'ptpk', width: 12 },
        { header: 'Ceiling Price', key: 'ceilingPrice', width: 15 },
        { header: 'Remarks/Notes', key: 'remarks', width: 30 }
      ]

      const formattedData = filteredItems.map(item => ({
        loadNumber: item.loadNumber,
        pickupCity: item.pickupCity,
        pickupState: item.pickupState,
        deliveryCity: item.deliveryCity,
        deliveryState: item.deliveryState,
        transporterName: item.transporterName,
        allocatedVehicles: item.allocatedVehicles,
        rate: item.rate,
        rateType: item.rateType.replace('_', ' '),
        totalCost: item.totalCost,
        status: item.status.toUpperCase(),
        assignedAt: new Date(item.assignedAt).toLocaleString('en-IN'),
        vehicleType: item.vehicleType,
        vehicleNumber: item.vehicleNumber,
        driverName: item.driverName,
        driverNumber: item.driverNumber,
        productName: item.productName,
        loadQuantity: item.loadQuantity,
        loadBasis: item.loadBasis,
        loadDistance: item.loadDistance,
        ptpk: item.ptpk,
        ceilingPrice: item.ceilingPrice,
        remarks: item.remarks
      }))

      await exportToExcel('Billing_Report', [
        {
          name: 'Billing Data',
          columns,
          data: formattedData
        }
      ])
      toast({ title: 'Billing report exported successfully' })
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e.message,
        variant: 'destructive'
      })
    }
  }

  return (
    <Layout>
      <Layout.Header sticky>
        <Button variant="ghost" size="sm" onClick={() => navigate('/reports')} className="gap-1">
          <IconArrowLeft className="h-4 w-4" /> Back to Hub
        </Button>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="space-y-6">
        <div className="mx-auto max-w-7xl space-y-6">
          
          {/* Banner */}
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-emerald-500/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
                  <IconReceipt2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Billing & Cost Report</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Analyze all transporter cost allocations, confirmed load rates, and overall freight spending.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport} disabled={loading || filteredItems.length === 0}>
                  <IconDownload className="mr-2 h-4 w-4" /> Export Max Data
                </Button>
                <Button variant="outline" onClick={loadReport} disabled={loading}>
                  <IconRefresh className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total Spent</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.totalBilling || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Completed Billing</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  ₹{(data?.summary.completedBilling || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Active Dues</CardDescription>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  ₹{(data?.summary.activeBilling || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Average Cost per Load</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.avgBillingPerLoad || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Visual Charts */}
          {data && data.items.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Spending by Transporter</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px] pb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.aggregations.byTransporter}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value: number) => `₹${value}`} />
                      <Tooltip formatter={(value: number | string) => `₹${Number(value).toLocaleString('en-IN')}`} />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Freight Cost by Load Status</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[260px] flex-col justify-center pb-6 sm:flex-row">
                  <div className="h-full w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.aggregations.byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="status"
                        >
                          {data.aggregations.byStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col justify-center gap-2 pl-4">
                    {data.aggregations.byStatus.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="capitalize">{item.status.replace('_', ' ')}:</span>
                        <span className="font-semibold">₹{item.value.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Panel */}
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Filter Billing Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Pickup Date From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Pickup Date To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div className="relative flex flex-col justify-end">
                  <IconSearch className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search load, vendor, product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Table */}
          <Card className="rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Billing Records (Max Columns View)</CardTitle>
              <CardDescription>{filteredItems.length} records matching current criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-3">Load Number</th>
                      <th className="p-3">Origin City</th>
                      <th className="p-3">Origin State</th>
                      <th className="p-3">Destination City</th>
                      <th className="p-3">Destination State</th>
                      <th className="p-3">Transporter Name</th>
                      <th className="p-3 text-right">Allocated Vehicles</th>
                      <th className="p-3 text-right">Confirmed Rate</th>
                      <th className="p-3">Rate Type</th>
                      <th className="p-3 text-right">Total Cost</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned Date</th>
                      <th className="p-3">Vehicle Type</th>
                      <th className="p-3">Vehicle Number</th>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">Driver Phone</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Unit Basis</th>
                      <th className="p-3 text-right">Distance (Km)</th>
                      <th className="p-3 text-right">PTPK</th>
                      <th className="p-3 text-right">Ceiling Price</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={23} className="p-8 text-center text-muted-foreground text-xs">
                          Loading billing records...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={23} className="p-8 text-center text-muted-foreground text-xs">
                          No billing records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-semibold">{item.loadNumber}</td>
                          <td className="p-3">{item.pickupCity}</td>
                          <td className="p-3">{item.pickupState}</td>
                          <td className="p-3">{item.deliveryCity}</td>
                          <td className="p-3">{item.deliveryState}</td>
                          <td className="p-3 font-medium">{item.transporterName}</td>
                          <td className="p-3 text-right">{item.allocatedVehicles}</td>
                          <td className="p-3 text-right font-medium">
                            ₹{item.rate.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 capitalize">{item.rateType.replace('_', ' ')}</td>
                          <td className="p-3 text-right font-semibold text-foreground">
                            ₹{item.totalCost.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3">
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase',
                              item.status === 'delivered' && 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900',
                              item.status === 'in_transit' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900',
                              item.status === 'assigned' && 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-900',
                              (item.status === 'cancelled' || item.status === 'canceled') && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900'
                            )}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(item.assignedAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="p-3">{item.vehicleType}</td>
                          <td className="p-3 font-mono font-medium">{item.vehicleNumber}</td>
                          <td className="p-3">{item.driverName}</td>
                          <td className="p-3">{item.driverNumber}</td>
                          <td className="p-3">{item.productName}</td>
                          <td className="p-3 text-right">{item.loadQuantity}</td>
                          <td className="p-3">{item.loadBasis}</td>
                          <td className="p-3 text-right">{item.loadDistance}</td>
                          <td className="p-3 text-right">₹{item.ptpk}</td>
                          <td className="p-3 text-right">₹{item.ceilingPrice.toLocaleString('en-IN')}</td>
                          <td className="p-3 truncate max-w-[150px]">{item.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout.Body>
    </Layout>
  )
}
