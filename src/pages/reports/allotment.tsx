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
  IconBookmark,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { reportsService, AllotmentReportResponse } from '@/api/services/reports/reports.service'
import { exportToExcel } from '@/lib/export'
import { validateReportDateRange } from '@/lib/report-filters'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']

export default function AllotmentReport() {
  const navigate = useNavigate()
  const [data, setData] = useState<AllotmentReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filters
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
      const res = await reportsService.getAllotmentReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || undefined,
      })
      setData(res)
    } catch (error: any) {
      toast({
        title: 'Failed to load allotment report',
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

  const filteredAllotments = data?.allotments.filter(item => {
    const term = search.toLowerCase()
    return (
      item.loadNumber.toLowerCase().includes(term) ||
      item.allottedCarrier.toLowerCase().includes(term) ||
      item.originCity.toLowerCase().includes(term) ||
      item.destinationCity.toLowerCase().includes(term) ||
      item.productName.toLowerCase().includes(term)
    )
  }) || []

  // Business value share calculation for pie chart
  const statusPieData = data?.aggregations.byStatus.map(item => ({
    name: item.status.toUpperCase(),
    value: item.count
  })) || []

  const handleExport = async () => {
    if (!data || filteredAllotments.length === 0) return
    try {
      const columns = [
        { header: 'Load Id', key: 'loadNumber', width: 18 },
        { header: 'Load Stage', key: 'loadStage', width: 15 },
        { header: 'Load Type', key: 'loadType', width: 12 },
        { header: 'Origin', key: 'originCity', width: 15 },
        { header: 'Origin Party', key: 'originParty', width: 20 },
        { header: 'Origin State', key: 'originState', width: 15 },
        { header: 'Party Name', key: 'partyName', width: 20 },
        { header: 'Destination City', key: 'destinationCity', width: 18 },
        { header: 'Destination State', key: 'destinationState', width: 18 },
        { header: 'Vehicle Mode', key: 'vehicleMode', width: 15 },
        { header: 'Product Name/KVA', key: 'productName', width: 20 },
        { header: 'Load Quantity', key: 'loadQuantity', width: 15 },
        { header: 'Load Basis', key: 'loadBasis', width: 15 },
        { header: 'Qty/Vehicle', key: 'qtyPerVehicle', width: 12 },
        { header: 'Load Distance', key: 'loadDistance', width: 15 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 22 },
        { header: 'Average Rate', key: 'averageRate', width: 15 },
        { header: 'Bid Date and Time', key: 'bidDateTime', width: 22 },
        { header: 'Ceiling Price', key: 'ceilingPrice', width: 15 },
        { header: 'Last Rate', key: 'lastRate', width: 15 },
        { header: 'Last Rate Carrier name', key: 'lastRateCarrierName', width: 25 },
        { header: 'L1 Name', key: 'l1Name', width: 25 },
        { header: 'L1 Rate', key: 'l1Rate', width: 15 },
        { header: 'L2 Name', key: 'l2Name', width: 25 },
        { header: 'L2 Rate', key: 'l2Rate', width: 15 },
        { header: 'L3 Name', key: 'l3Name', width: 25 },
        { header: 'L3 Rate', key: 'l3Rate', width: 15 },
        { header: 'L4 Name', key: 'l4Name', width: 25 },
        { header: 'L4 Rate', key: 'l4Rate', width: 15 },
        { header: 'Allotted Rate', key: 'allottedRate', width: 15 },
        { header: 'Allotted Carrier', key: 'allottedCarrier', width: 25 },
        { header: 'Load Allotted On', key: 'loadAllottedOn', width: 22 },
        { header: 'Allotment Type(Offline)', key: 'offlineAllotment', width: 22 },
        { header: 'Avg Freight History', key: 'avgFreightHistory', width: 20 },
        { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
        { header: 'Driver Name', key: 'driverName', width: 18 },
        { header: 'Driver Number', key: 'driverNumber', width: 18 },
        { header: 'PTPK', key: 'ptpk', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 30 },
        { header: 'Total Amount', key: 'totalAmount', width: 18 },
        { header: 'Rate Type', key: 'rateType', width: 15 },
        { header: 'Load Post Date and Time', key: 'postDateTime', width: 22 },
        { header: 'Auction End Date and Time', key: 'auctionEndDateTime', width: 22 },
        { header: 'Last Rate Carrier Branch Name', key: 'lastRateCarrierBranchName', width: 25 },
        { header: 'Allotted Carrier Branch Name', key: 'allottedCarrierBranchName', width: 25 }
      ]

      const formattedData = filteredAllotments.map(item => ({
        loadNumber: item.loadNumber,
        loadStage: item.loadStage,
        loadType: item.loadType,
        originCity: item.originCity,
        originParty: item.originParty,
        originState: item.originState,
        partyName: item.partyName,
        destinationCity: item.destinationCity,
        destinationState: item.destinationState,
        vehicleMode: item.vehicleMode,
        productName: item.productName,
        loadQuantity: item.loadQuantity,
        loadBasis: item.loadBasis,
        qtyPerVehicle: item.qtyPerVehicle,
        loadDistance: item.loadDistance,
        vehicleType: item.vehicleType,
        averageRate: item.averageRate,
        bidDateTime: item.bidDateTime ? new Date(item.bidDateTime).toLocaleString('en-IN') : 'N/A',
        ceilingPrice: item.ceilingPrice,
        lastRate: item.lastRate,
        lastRateCarrierName: item.lastRateCarrierName,
        l1Name: item.l1Name,
        l1Rate: item.l1Rate,
        l2Name: item.l2Name,
        l2Rate: item.l2Rate,
        l3Name: item.l3Name,
        l3Rate: item.l3Rate,
        l4Name: item.l4Name,
        l4Rate: item.l4Rate,
        allottedRate: item.allottedRate,
        allottedCarrier: item.allottedCarrier,
        loadAllottedOn: item.loadAllottedOn ? new Date(item.loadAllottedOn).toLocaleString('en-IN') : 'N/A',
        offlineAllotment: item.offlineAllotment,
        avgFreightHistory: item.avgFreightHistory,
        vehicleNumber: item.vehicleNumber,
        driverName: item.driverName,
        driverNumber: item.driverNumber,
        ptpk: item.ptpk,
        remarks: item.remarks,
        totalAmount: item.totalAmount,
        rateType: item.rateType,
        postDateTime: item.postDateTime ? new Date(item.postDateTime).toLocaleString('en-IN') : 'N/A',
        auctionEndDateTime: item.auctionEndDateTime ? new Date(item.auctionEndDateTime).toLocaleString('en-IN') : 'N/A',
        lastRateCarrierBranchName: item.lastRateCarrierBranchName,
        allottedCarrierBranchName: item.allottedCarrierBranchName
      }))

      await exportToExcel('Allotments_Report', [
        {
          name: 'Allotments Data',
          columns,
          data: formattedData
        }
      ])
      toast({ title: 'Allotments report exported successfully' })
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
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-rose-500/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600">
                  <IconBookmark className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Load Allotment & Allocation Report</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitor vehicle allotments, L1-L4 rates, driver assignments, and historical freight metrics.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport} disabled={loading || filteredAllotments.length === 0}>
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
                <CardDescription>Total Allotments</CardDescription>
                <CardTitle className="text-2xl font-bold">{data?.summary.totalAllotments || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Allocated Vehicles</CardDescription>
                <CardTitle className="text-2xl font-bold text-rose-600">
                  {data?.summary.totalAllocatedVehicles || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Accepted Vehicles</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {data?.summary.totalAcceptedVehicles || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Average Confirmed Rate</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.avgRate || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Visual Charts */}
          {data && data.allotments.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Allotments by Transporter</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] pb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.aggregations.byTransporter}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Allotments by Status</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[250px] flex-col justify-center pb-6 sm:flex-row">
                  {statusPieData.length > 0 ? (
                    <>
                      <div className="h-full w-full sm:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {statusPieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center gap-2 pl-4">
                        {statusPieData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="capitalize font-medium">{item.name.toLowerCase().replace('_', ' ')}:</span>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No status values recorded yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Panel */}
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Filter Allotments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Date From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Date To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Allotment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors mt-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All Statuses</option>
                    <option value="allocated">Allocated</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="relative flex flex-col justify-end">
                  <IconSearch className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search load, vendor, route..."
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
              <CardTitle>Allotment Records (Max Columns View)</CardTitle>
              <CardDescription>{filteredAllotments.length} records matching current criteria</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-3">Load Id</th>
                      <th className="p-3">Load Stage</th>
                      <th className="p-3">Load Type</th>
                      <th className="p-3">Origin</th>
                      <th className="p-3">Origin Party</th>
                      <th className="p-3">Origin State</th>
                      <th className="p-3">Party Name</th>
                      <th className="p-3">Destination City</th>
                      <th className="p-3">Destination State</th>
                      <th className="p-3">Vehicle Mode</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Basis</th>
                      <th className="p-3 text-right">Qty/Vehicle</th>
                      <th className="p-3 text-right">Distance (Km)</th>
                      <th className="p-3">Vehicle Type</th>
                      <th className="p-3 text-right">Avg Rate</th>
                      <th className="p-3">Bid Date & Time</th>
                      <th className="p-3 text-right">Ceiling Price</th>
                      <th className="p-3 text-right">Last Rate</th>
                      <th className="p-3">Last Rate Carrier</th>
                      <th className="p-3">L1 Name</th>
                      <th className="p-3 text-right">L1 Rate</th>
                      <th className="p-3">L2 Name</th>
                      <th className="p-3 text-right">L2 Rate</th>
                      <th className="p-3">L3 Name</th>
                      <th className="p-3 text-right">L3 Rate</th>
                      <th className="p-3">L4 Name</th>
                      <th className="p-3 text-right">L4 Rate</th>
                      <th className="p-3 text-right">Allotted Rate</th>
                      <th className="p-3">Allotted Carrier</th>
                      <th className="p-3">Load Allotted On</th>
                      <th className="p-3">Offline Allotment</th>
                      <th className="p-3 text-right">Avg Freight History</th>
                      <th className="p-3">Vehicle Number</th>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">Driver Number</th>
                      <th className="p-3 text-right">PTPK</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3">Rate Type</th>
                      <th className="p-3">Post Date & Time</th>
                      <th className="p-3">Auction End Date</th>
                      <th className="p-3">Last Rate Carrier Branch</th>
                      <th className="p-3">Allotted Carrier Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={45} className="p-8 text-center text-muted-foreground text-xs">
                          Loading allotment records...
                        </td>
                      </tr>
                    ) : filteredAllotments.length === 0 ? (
                      <tr>
                        <td colSpan={45} className="p-8 text-center text-muted-foreground text-xs">
                          No allotment records found.
                        </td>
                      </tr>
                    ) : (
                      filteredAllotments.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 font-mono font-semibold">{item.loadNumber}</td>
                          <td className="p-3">
                            <span className={cn(
                              'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                              item.loadStage === 'Confirmed' && 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-900',
                              item.loadStage === 'Canceled' && 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900',
                              item.loadStage === 'Live' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-900'
                            )}>
                              {item.loadStage}
                            </span>
                          </td>
                          <td className="p-3 font-medium uppercase">{item.loadType}</td>
                          <td className="p-3">{item.originCity}</td>
                          <td className="p-3">{item.originParty}</td>
                          <td className="p-3">{item.originState}</td>
                          <td className="p-3">{item.partyName}</td>
                          <td className="p-3">{item.destinationCity}</td>
                          <td className="p-3">{item.destinationState}</td>
                          <td className="p-3 capitalize">{item.vehicleMode.replace('_', ' ')}</td>
                          <td className="p-3 font-medium">{item.productName}</td>
                          <td className="p-3 text-right">{item.loadQuantity}</td>
                          <td className="p-3">{item.loadBasis}</td>
                          <td className="p-3 text-right">{item.qtyPerVehicle}</td>
                          <td className="p-3 text-right">{item.loadDistance}</td>
                          <td className="p-3">{item.vehicleType}</td>
                          <td className="p-3 text-right">₹{item.averageRate.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-muted-foreground">
                            {item.bidDateTime ? new Date(item.bidDateTime).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-3 text-right">₹{item.ceilingPrice.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{item.lastRate.toLocaleString('en-IN')}</td>
                          <td className="p-3">{item.lastRateCarrierName}</td>
                          <td className="p-3">{item.l1Name}</td>
                          <td className="p-3 text-right">₹{item.l1Rate.toLocaleString('en-IN')}</td>
                          <td className="p-3">{item.l2Name}</td>
                          <td className="p-3 text-right">₹{item.l2Rate.toLocaleString('en-IN')}</td>
                          <td className="p-3">{item.l3Name}</td>
                          <td className="p-3 text-right">₹{item.l3Rate.toLocaleString('en-IN')}</td>
                          <td className="p-3">{item.l4Name}</td>
                          <td className="p-3 text-right">₹{item.l4Rate.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-foreground">₹{item.allottedRate.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-semibold">{item.allottedCarrier}</td>
                          <td className="p-3 text-muted-foreground">
                            {item.loadAllottedOn ? new Date(item.loadAllottedOn).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-3">{item.offlineAllotment}</td>
                          <td className="p-3 text-right">₹{item.avgFreightHistory.toLocaleString('en-IN')}</td>
                          <td className="p-3 font-mono font-medium">{item.vehicleNumber}</td>
                          <td className="p-3">{item.driverName}</td>
                          <td className="p-3">{item.driverNumber}</td>
                          <td className="p-3 text-right font-medium">₹{item.ptpk}</td>
                          <td className="p-3 truncate max-w-[150px]">{item.remarks}</td>
                          <td className="p-3 text-right font-semibold">₹{item.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 capitalize">{item.rateType.replace('_', ' ')}</td>
                          <td className="p-3 text-muted-foreground">
                            {item.postDateTime ? new Date(item.postDateTime).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {item.auctionEndDateTime ? new Date(item.auctionEndDateTime).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="p-3">{item.lastRateCarrierBranchName}</td>
                          <td className="p-3">{item.allottedCarrierBranchName}</td>
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
