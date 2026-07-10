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
  IconPigMoney,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { reportsService, SavingsReportResponse } from '@/api/services/reports/reports.service'
import { exportToExcel } from '@/lib/export'
import { validateReportDateRange } from '@/lib/report-filters'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function SavingsReport() {
  const navigate = useNavigate()
  const [data, setData] = useState<SavingsReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [vehicleType, setVehicleType] = useState('')

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
      const res = await reportsService.getSavingsReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        vehicleType: vehicleType || undefined,
      })
      setData(res)
    } catch (error: any) {
      toast({
        title: 'Failed to load savings report',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, vehicleType])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const filteredItems = data?.items.filter(item => {
    const term = search.toLowerCase()
    return (
      item.loadNumber.toLowerCase().includes(term) ||
      item.transporterName.toLowerCase().includes(term) ||
      item.vehicleType.toLowerCase().includes(term) ||
      item.pickupCity.toLowerCase().includes(term) ||
      item.deliveryCity.toLowerCase().includes(term) ||
      item.productName.toLowerCase().includes(term)
    )
  }) || []

  // Format date-wise savings for the trend chart
  const dateSavingsMap: Record<string, number> = {}
  
  // Sort items by pickupDate ascending so trend dates are chronological
  const sortedTrendItems = [...filteredItems].sort(
    (a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime()
  )

  sortedTrendItems.forEach(item => {
    if (!item.pickupDate) return
    const dateStr = new Date(item.pickupDate).toLocaleDateString('en-IN')
    dateSavingsMap[dateStr] = (dateSavingsMap[dateStr] || 0) + item.savings
  })
  
  const savingsTrendData = Object.entries(dateSavingsMap).map(([date, savings]) => ({
    date,
    Savings: savings
  })).slice(-10) // show last 10 dates

  const handleExport = async () => {
    if (!data || filteredItems.length === 0) return
    try {
      const columns = [
        { header: 'Load Number', key: 'loadNumber', width: 18 },
        { header: 'Origin City', key: 'pickupCity', width: 15 },
        { header: 'Origin State', key: 'pickupState', width: 15 },
        { header: 'Destination City', key: 'deliveryCity', width: 15 },
        { header: 'Destination State', key: 'deliveryState', width: 15 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 20 },
        { header: 'Transporter', key: 'transporterName', width: 25 },
        { header: 'Allocated Vehicles', key: 'allocatedVehicles', width: 18 },
        { header: 'Target Rate (Budget/Ceiling)', key: 'budgetRate', width: 22 },
        { header: 'Actual Confirmed Rate', key: 'actualRate', width: 22 },
        { header: 'Rate Type', key: 'rateType', width: 15 },
        { header: 'Target Total Budget', key: 'budget', width: 22 },
        { header: 'Actual Total Spent', key: 'actualCost', width: 22 },
        { header: 'Savings Value (INR)', key: 'savings', width: 18 },
        { header: 'Savings %', key: 'savingsPercentage', width: 12 },
        { header: 'Product Name', key: 'productName', width: 20 },
        { header: 'Load Quantity', key: 'loadQuantity', width: 15 },
        { header: 'Unit Basis', key: 'loadBasis', width: 15 },
        { header: 'Distance (Km)', key: 'loadDistance', width: 15 },
        { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
        { header: 'Driver Name', key: 'driverName', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Pickup Date', key: 'pickupDate', width: 22 }
      ]

      const formattedData = filteredItems.map(item => ({
        loadNumber: item.loadNumber,
        pickupCity: item.pickupCity,
        pickupState: item.pickupState,
        deliveryCity: item.deliveryCity,
        deliveryState: item.deliveryState,
        vehicleType: item.vehicleType,
        transporterName: item.transporterName,
        allocatedVehicles: item.allocatedVehicles,
        budgetRate: item.budgetRate,
        actualRate: item.actualRate,
        rateType: item.rateType.replace('_', ' '),
        budget: item.budget,
        actualCost: item.actualCost,
        savings: item.savings,
        savingsPercentage: `${item.savingsPercentage}%`,
        productName: item.productName,
        loadQuantity: item.loadQuantity,
        loadBasis: item.loadBasis,
        loadDistance: item.loadDistance,
        vehicleNumber: item.vehicleNumber,
        driverName: item.driverName,
        status: item.status.toUpperCase(),
        pickupDate: item.pickupDate ? new Date(item.pickupDate).toLocaleDateString('en-IN') : 'N/A'
      }))

      await exportToExcel('Cost_Savings_Report', [
        {
          name: 'Savings Data',
          columns,
          data: formattedData
        }
      ])
      toast({ title: 'Savings report exported successfully' })
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
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-amber-500/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-600">
                  <IconPigMoney className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Cost Savings Analysis</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Evaluate budget limits against winning rates to calculate the financial cost-savings of bidding.
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
                <CardDescription>Estimated Budget (Ceiling)</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.totalBudget || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Actual Procurement Spent</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.totalActual || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm bg-gradient-to-tr from-amber-500/10 to-transparent">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-800 font-medium">Net Savings Value</CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600">
                  ₹{(data?.summary.totalSavings || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Average Savings %</CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600">
                  {data?.summary.avgSavingsPercentage || 0}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Charts */}
          {data && data.items.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Savings Trend over Time</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] pb-6">
                  {savingsTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={savingsTrendData}>
                        <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: any) => `₹${v}`} />
                        <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                        <Area type="monotone" dataKey="Savings" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No savings records to trend yet
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Savings by Vehicle Type</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] pb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.aggregations.byVehicleType}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: any) => `₹${v}`} />
                      <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                      <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Panel */}
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Filter Savings Report</CardTitle>
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
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Vehicle Type</label>
                  <Input
                    placeholder="e.g. Open Body, Container"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="relative flex flex-col justify-end">
                  <IconSearch className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search load number, vendor, product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Savings Details (Max Columns View)</CardTitle>
              <CardDescription>{filteredItems.length} records computed cost-savings</CardDescription>
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
                      <th className="p-3">Vehicle Type</th>
                      <th className="p-3">Transporter Name</th>
                      <th className="p-3 text-right">Allocated Vehicles</th>
                      <th className="p-3 text-right">Target Rate</th>
                      <th className="p-3 text-right">Actual Rate</th>
                      <th className="p-3">Rate Type</th>
                      <th className="p-3 text-right">Target Total Budget</th>
                      <th className="p-3 text-right">Actual Total Spent</th>
                      <th className="p-3 text-right">Savings Value</th>
                      <th className="p-3 text-right">Savings %</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Basis</th>
                      <th className="p-3 text-right">Distance (Km)</th>
                      <th className="p-3">Vehicle Number</th>
                      <th className="p-3">Driver Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Pickup Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={23} className="p-8 text-center text-muted-foreground text-xs">
                          Loading cost savings...
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={23} className="p-8 text-center text-muted-foreground text-xs">
                          No savings records found.
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
                          <td className="p-3">{item.vehicleType}</td>
                          <td className="p-3 font-medium">{item.transporterName}</td>
                          <td className="p-3 text-right">{item.allocatedVehicles}</td>
                          <td className="p-3 text-right">₹{item.budgetRate.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{item.actualRate.toLocaleString('en-IN')}</td>
                          <td className="p-3 capitalize">{item.rateType.replace('_', ' ')}</td>
                          <td className="p-3 text-right">₹{item.budget.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-medium">₹{item.actualCost.toLocaleString('en-IN')}</td>
                          <td className={cn("p-3 text-right font-semibold", item.savings >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            ₹{item.savings.toLocaleString('en-IN')}
                          </td>
                          <td className={cn("p-3 text-right font-semibold", item.savings >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {item.savingsPercentage}%
                          </td>
                          <td className="p-3">{item.productName}</td>
                          <td className="p-3 text-right">{item.loadQuantity}</td>
                          <td className="p-3">{item.loadBasis}</td>
                          <td className="p-3 text-right">{item.loadDistance}</td>
                          <td className="p-3 font-mono font-medium">{item.vehicleNumber}</td>
                          <td className="p-3">{item.driverName}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase bg-muted text-muted-foreground">
                              {item.status}
                            </span>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {item.pickupDate ? new Date(item.pickupDate).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
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
