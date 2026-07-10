import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/custom/button'
import { UserNav } from '@/components/user-nav'
import { IconChartLine, IconDownload, IconRefresh } from '@tabler/icons-react'
import { dashboardService, type DashboardData } from '@/api/services/dashboard'
import ThemeSwitch from '@/components/theme-switch'
import { toast } from '@/components/ui/use-toast'
import { AdvancedCharts } from '@/components/dashboard/AdvancedCharts'

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month')

  useEffect(() => {
    if (!user) {
      navigate('/sign-in')
      return
    }
    fetchAnalyticsData()
  }, [user, navigate, dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const analyticsData = await dashboardService.getDashboardData({
        dateRange,
        limit: 100,
      })
      setData(analyticsData)
    } catch (error: any) {
      console.error('Failed to load analytics:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load analytics',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = () => {
    if (!data) return

    const exportData = {
      exportDate: new Date().toISOString(),
      dateRange,
      stats: data.stats,
      metrics: data.metrics,
      statusDistribution: data.statusDistribution,
      priorityDistribution: data.priorityDistribution,
      vehicleTypeDistribution: data.vehicleTypeDistribution,
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${dateRange}-${new Date().getTime()}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Analytics data exported successfully',
    })
  }

  if (loading) {
    return (
      <Layout fixed>
        <Layout.Header sticky>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <UserNav />
          </div>
        </Layout.Header>
        <Layout.Body>
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout fixed>
        <Layout.Header sticky>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <UserNav />
          </div>
        </Layout.Header>
        <Layout.Body>
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">No analytics data available</p>
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  return (
    <Layout >
      <Layout.Header sticky className="border-b">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <IconChartLine className="h-5 w-5" />
            <div>
              <h1 className="text-xl font-bold">Analytics Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Advanced analytics and insights for {user?.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAnalyticsData}
              title="Refresh data"
            >
              <IconRefresh className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportData}
              title="Export analytics"
            >
              <IconDownload className="h-4 w-4" />
            </Button>
            <ThemeSwitch />
            <UserNav />
          </div>
        </div>
      </Layout.Header>

      <Layout.Body>
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.stats.totalLoads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.stats.completedLoads} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.stats.totalLoads > 0
                    ? Math.round((data.stats.completedLoads / data.stats.totalLoads) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground mt-1">On-time delivery</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${data.stats.totalRevenue.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: ${data.stats.averageLoadValue.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {data.stats.totalUsers} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Advanced Charts */}
          <AdvancedCharts
            metrics={data.metrics}
            statusDistribution={data.statusDistribution}
          />

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Bids */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Bids</CardTitle>
                <CardDescription>Awaiting transporter response</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{data.stats.pendingBids}</p>
                    <p className="text-sm text-muted-foreground mt-1">Active bidding sessions</p>
                  </div>
                  <Badge variant="secondary">{Math.round((data.stats.pendingBids / Math.max(data.stats.totalLoads, 1)) * 100)}% of loads</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Unread Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Unread Messages</CardTitle>
                <CardDescription>Chat notifications pending</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">{data.stats.unreadMessages}</p>
                    <p className="text-sm text-muted-foreground mt-1">Waiting for your attention</p>
                  </div>
                  <Badge variant="secondary">
                    {data.recentUnreadMessages?.length || 0} recent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Unread Messages */}
          {data.recentUnreadMessages && data.recentUnreadMessages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Unread Messages</CardTitle>
                <CardDescription>Latest messages requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.recentUnreadMessages.slice(0, 5).map((msg, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 rounded-lg border hover:bg-secondary">
                      <div>
                        <p className="text-sm font-medium">{msg.senderName}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">New</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Performers */}
          {data.topTransporters && data.topTransporters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Transporters</CardTitle>
                <CardDescription>Based on completed loads and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topTransporters.map((transporter: any, idx: number) => (
                    <div key={transporter._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge>{idx + 1}</Badge>
                        <div>
                          <p className="text-sm font-medium">{transporter.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {transporter.completedLoads} completed
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">${transporter.revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout.Body>
    </Layout>
  )
}
