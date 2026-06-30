import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadMetrics, LoadStatusDistribution, PriorityDistribution, VehicleTypeDistribution } from '@/api/services/dashboard'
import { useNavigate } from 'react-router-dom'

// Color palettes
const COLORS_PRIMARY = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
const COLORS_SECONDARY = ['#06b6d4', '#f97316', '#84cc16', '#d946ef', '#14b8a6']
const CHART_COLORS = {
  revenue: '#3b82f6',
  completed: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
}

const formatMoney = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

interface AdvancedChartsProps {
  metrics: LoadMetrics[]
  recentUnreadMessages?: any[]
  statusDistribution: LoadStatusDistribution[]
  priorityDistribution: PriorityDistribution[]
  vehicleTypeDistribution: VehicleTypeDistribution[]
  totalRevenue: number
  totalLoads: number
  completedLoads: number
}

export function AdvancedCharts({
  metrics,
  statusDistribution,
  priorityDistribution,
  recentUnreadMessages = [],
}: AdvancedChartsProps) {
  const navigate = useNavigate()

  // Transform data for charts
  const metricsChartData = useMemo(() => {
    return (metrics || []).map((m) => ({
      date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: m.revenue,
      count: m.count,
      completed: m.completed,
      pending: m.pending,
      fullDate: m.date,
    }))
  }, [metrics])

  const statusData = useMemo(() => {
    return (statusDistribution || []).map((s) => ({
      name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      value: s.count,
      percentage: s.percentage,
    }))
  }, [statusDistribution])

  const priorityData = useMemo(() => {
    return (priorityDistribution || []).map((p) => ({
      name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
      value: p.count,
      percentage: p.percentage,
    }))
  }, [priorityDistribution])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name?.toLowerCase().includes('revenue') ? formatMoney(entry.value) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>7 Day Load Flow</CardTitle>
            <CardDescription>Completed and pending loads by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={235}>
              <BarChart data={metricsChartData.slice(-7)} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill={CHART_COLORS.completed} name="Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" stackId="a" fill={CHART_COLORS.pending} name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest transporter communication</CardDescription>
            </CardHeader>
            <CardContent>
              {recentUnreadMessages?.length ? (
                <div className="space-y-2">
                  {recentUnreadMessages.slice(0, 3).map((message:any, index:any) => (
                    <button
                      key={`${message.senderId}-${message.timestamp}-${index}`}
                      type="button"
                      className="w-full rounded-xl border p-3 text-left transition-colors hover:bg-muted/60"
                      onClick={() => navigate(`/chats?userId=${message.senderId}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{message.senderName}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{message.content}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="mt-2 text-sm font-medium">No unread messages</p>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current load status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((_entry: any, index: any) => (
                    <Cell key={`status-cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS_PRIMARY[idx % COLORS_PRIMARY.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Where admin attention is needed</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {priorityData.map((_entry, index) => (
                    <Cell key={`priority-cell-${index}`} fill={COLORS_SECONDARY[index % COLORS_SECONDARY.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {priorityData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS_SECONDARY[idx % COLORS_SECONDARY.length] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
