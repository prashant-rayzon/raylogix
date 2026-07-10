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
import { LoadMetrics, LoadStatusDistribution } from '@/api/services/dashboard'
import { useNavigate } from 'react-router-dom'

// Color palettes
const COLORS_PRIMARY = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
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
}

export function AdvancedCharts({
  metrics,
  statusDistribution,
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
        {/* 7 Day Load Flow */}
        <Card className="xl:col-span-2 border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">7 Day Load Flow</CardTitle>
            <CardDescription className="text-xs">Completed and pending loads by day</CardDescription>
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

        {/* Status Distribution */}
        <Card className="xl:col-span-1 border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Status Distribution</CardTitle>
            <CardDescription className="text-xs">Current load status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-between h-[235px] pt-0">
            <div className="flex justify-center items-center h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={52}
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
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-[100px] overflow-y-auto pr-1">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted/40 px-2 py-1 text-[11px]">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS_PRIMARY[idx % COLORS_PRIMARY.length] }}
                    />
                    <span className="truncate font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Recent Messages</CardTitle>
          <CardDescription className="text-xs">Latest transporter communication feed</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {recentUnreadMessages?.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {recentUnreadMessages.slice(0, 3).map((message: any, index: number) => (
                <div
                  key={`${message.senderId}-${message.timestamp}-${index}`}
                  onClick={() => navigate(`/chats?userId=${message.senderId}`)}
                  className="rounded-xl border border-border/50 p-4 transition-all hover:scale-[1.01] hover:border-primary/20 hover:shadow-sm cursor-pointer bg-card flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/30 pb-2">
                    <p className="truncate text-xs font-bold text-foreground">{message.senderName}</p>
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <p className="text-xs text-muted-foreground">No recent messages</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
