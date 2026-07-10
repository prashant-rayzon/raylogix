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
  IconUsers,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'
import { reportsService, VendorReportResponse } from '@/api/services/reports/reports.service'
import { exportToExcel } from '@/lib/export'
import { validateReportDateRange } from '@/lib/report-filters'
import { cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4']

export default function VendorReport() {
  const navigate = useNavigate()
  const [data, setData] = useState<VendorReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
      const res = await reportsService.getVendorReport({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setData(res)
    } catch (error: any) {
      toast({
        title: 'Failed to load vendor report',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const filteredVendors = data?.vendors.filter(vendor => {
    const term = search.toLowerCase()
    return (
      vendor.transporterName.toLowerCase().includes(term) ||
      vendor.companyName.toLowerCase().includes(term) ||
      vendor.contactEmail.toLowerCase().includes(term)
    )
  }) || []

  // Business value share calculation for pie chart
  const businessShareData = filteredVendors
    .map(v => ({
      name: v.transporterName,
      value: v.totalBusinessValue
    }))
    .filter(v => v.value > 0)
    .slice(0, 5) // Top 5 vendors

  const handleExport = async () => {
    if (!data || filteredVendors.length === 0) return
    try {
      const columns = [
        { header: 'Transporter Name', key: 'transporterName', width: 25 },
        { header: 'Company Name', key: 'companyName', width: 25 },
        { header: 'GST Number', key: 'gstNumber', width: 20 },
        { header: 'Contact Email', key: 'contactEmail', width: 25 },
        { header: 'Contact Phone', key: 'contactPhone', width: 18 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'State', key: 'state', width: 15 },
        { header: 'Verified', key: 'isVerified', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Contact Person Name', key: 'contactPersonName', width: 22 },
        { header: 'Contact Person Phone', key: 'contactPersonPhone', width: 18 },
        { header: 'Bids Submitted', key: 'totalBids', width: 15 },
        { header: 'Bids Won', key: 'bidsWon', width: 12 },
        { header: 'Win Rate %', key: 'winRate', width: 12 },
        { header: 'Allocated Vehicles', key: 'allocatedVehicles', width: 18 },
        { header: 'Avg Bid Rate (INR)', key: 'avgBidAmount', width: 18 },
        { header: 'Highest Bid Rate (INR)', key: 'highestBidAmount', width: 18 },
        { header: 'Lowest Bid Rate (INR)', key: 'lowestBidAmount', width: 18 },
        { header: 'Total Business Value (INR)', key: 'totalBusinessValue', width: 25 }
      ]

      const formattedData = filteredVendors.map(vendor => ({
        transporterName: vendor.transporterName,
        companyName: vendor.companyName,
        gstNumber: vendor.gstNumber,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        city: vendor.city,
        state: vendor.state,
        isVerified: vendor.isVerified,
        status: vendor.status.toUpperCase(),
        contactPersonName: vendor.contactPersonName,
        contactPersonPhone: vendor.contactPersonPhone,
        totalBids: vendor.totalBids,
        bidsWon: vendor.bidsWon,
        winRate: `${vendor.winRate}%`,
        allocatedVehicles: vendor.allocatedVehicles,
        avgBidAmount: vendor.avgBidAmount,
        highestBidAmount: vendor.highestBidAmount,
        lowestBidAmount: vendor.lowestBidAmount,
        totalBusinessValue: vendor.totalBusinessValue
      }))

      await exportToExcel('Vendor_Performance_Report', [
        {
          name: 'Vendors Scorecard',
          columns,
          data: formattedData
        }
      ])
      toast({ title: 'Vendor scorecard exported successfully' })
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
          <div className="rounded-[1.75rem] border bg-gradient-to-br from-blue-500/10 via-background to-muted/30 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
                  <IconUsers className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Vendor Scorecard & Performance</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Analyze vendor bidding activity, win rates, business share allocation, and total business value.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExport} disabled={loading || filteredVendors.length === 0}>
                  <IconDownload className="mr-2 h-4 w-4" /> Export Max Data
                </Button>
                <Button variant="outline" onClick={loadReport} disabled={loading}>
                  <IconRefresh className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total Participating Vendors</CardDescription>
                <CardTitle className="text-2xl font-bold">{data?.summary.totalVendors || 0}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total Allotted Business Value</CardDescription>
                <CardTitle className="text-2xl font-bold">
                  ₹{(data?.summary.overallBusinessValue || 0).toLocaleString('en-IN')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Overall Avg Win Rate</CardDescription>
                <CardTitle className="text-2xl font-bold text-blue-600">
                  {data?.summary.overallAvgWinRate || 0}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Charts */}
          {filteredVendors.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Bidding Funnel (Bids Submitted vs Won)</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px] pb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredVendors.slice(0, 7)}>
                      <XAxis dataKey="transporterName" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="totalBids" name="Submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bidsWon" name="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Business Allocation Share (Top 5 Vendors)</CardTitle>
                </CardHeader>
                <CardContent className="flex h-[260px] flex-col justify-center pb-6 sm:flex-row">
                  {businessShareData.length > 0 ? (
                    <>
                      <div className="h-full w-full sm:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={businessShareData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              nameKey="name"
                            >
                              {businessShareData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-col justify-center gap-2 pl-4">
                        {businessShareData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="truncate max-w-[120px] font-medium">{item.name}:</span>
                            <span className="font-semibold">₹{item.value.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No business values allocated yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter Panel */}
          <Card className="rounded-3xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Filter Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Date From</label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Date To</label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
                </div>
                <div className="relative flex flex-col justify-end">
                  <IconSearch className="absolute left-3 bottom-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendor name, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scorecard Table */}
          <Card className="rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>Vendor Scorecard (Max Columns View)</CardTitle>
              <CardDescription>Metrics aggregated by transporter</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <th className="p-3">Vendor Name</th>
                      <th className="p-3">Company Name</th>
                      <th className="p-3">GST Number</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Contact Phone</th>
                      <th className="p-3">City</th>
                      <th className="p-3">State</th>
                      <th className="p-3">Verified</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Contact Person Name</th>
                      <th className="p-3">Contact Person Phone</th>
                      <th className="p-3 text-right">Bids Submitted</th>
                      <th className="p-3 text-right">Bids Won</th>
                      <th className="p-3 text-right font-semibold text-emerald-600">Win Rate</th>
                      <th className="p-3 text-right">Allocated Vehicles</th>
                      <th className="p-3 text-right">Avg Bid</th>
                      <th className="p-3 text-right">Highest Bid</th>
                      <th className="p-3 text-right">Lowest Bid</th>
                      <th className="p-3 text-right font-semibold text-foreground">Total Business Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading ? (
                      <tr>
                        <td colSpan={19} className="p-8 text-center text-muted-foreground text-xs">
                          Loading vendor scorecards...
                        </td>
                      </tr>
                    ) : filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan={19} className="p-8 text-center text-muted-foreground text-xs">
                          No vendor scorecards found.
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((vendor, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold text-foreground">{vendor.transporterName}</td>
                          <td className="p-3 font-medium">{vendor.companyName}</td>
                          <td className="p-3 font-mono">{vendor.gstNumber}</td>
                          <td className="p-3 text-muted-foreground">{vendor.contactEmail}</td>
                          <td className="p-3">{vendor.contactPhone}</td>
                          <td className="p-3">{vendor.city}</td>
                          <td className="p-3">{vendor.state}</td>
                          <td className="p-3">{vendor.isVerified}</td>
                          <td className="p-3 uppercase text-[10px] font-medium">{vendor.status}</td>
                          <td className="p-3">{vendor.contactPersonName}</td>
                          <td className="p-3">{vendor.contactPersonPhone}</td>
                          <td className="p-3 text-right">{vendor.totalBids}</td>
                          <td className="p-3 text-right text-emerald-600 font-medium">{vendor.bidsWon}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {vendor.winRate}%
                          </td>
                          <td className="p-3 text-right">{vendor.allocatedVehicles}</td>
                          <td className="p-3 text-right">₹{vendor.avgBidAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{vendor.highestBidAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{vendor.lowestBidAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-semibold text-foreground">
                            ₹{vendor.totalBusinessValue.toLocaleString('en-IN')}
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
