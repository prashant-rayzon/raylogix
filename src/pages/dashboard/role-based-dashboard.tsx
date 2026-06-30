import { useEffect, useState, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import { Layout } from '@/components/custom/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/custom/button'
import { UserNav } from '@/components/user-nav'
import {
  IconBox,
  IconBuilding,
  IconTruck,
  IconUsers,
  IconMessages,
  IconTrendingUp,
  IconCheck,
  IconChartLine,
  IconRefresh,
} from '@tabler/icons-react'
import { dashboardService, type DashboardData } from '@/api/services/dashboard'
import { cn } from '@/lib/utils'
import ThemeSwitch from '@/components/theme-switch'
import { toast } from '@/components/ui/use-toast'
import { AdvancedCharts } from '@/components/dashboard/AdvancedCharts'
import { useNotifications } from '@/contexts/NotificationContext'

// Type definitions
type DashboardRole = 'super_admin' | 'company_admin' | 'company_user' | 'transporter'
type DashboardComponentProps = {
  data: DashboardData
  onRefresh?: () => void
}

const getLoadRoute = (load: any) =>
  `${load.pickupLocation?.city || 'Pickup'} → ${load.deliveryLocation?.city || 'Delivery'}`

const getLoadId = (load: any) => load._id || load.id

const getStatusBadgeClass = (status: string) =>
  cn(
    status === 'delivered' && 'bg-green-100 text-green-800 border-green-300',
    status === 'open' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
    status === 'assigned' && 'bg-yellow-100 text-yellow-800 border-yellow-300',
    status === 'in_transit' && 'bg-blue-100 text-blue-800 border-blue-300',
    status === 'canceled' && 'bg-red-100 text-red-800 border-red-300'
  )

const getStatusLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const getPriorityBadgeClass = (priority?: string) =>
  cn(
    'border',
    priority === 'urgent' && 'border-red-300 bg-red-100 text-red-800',
    priority === 'high' && 'border-orange-300 bg-orange-100 text-orange-800',
    priority === 'medium' && 'border-yellow-300 bg-yellow-100 text-yellow-800',
    priority === 'low' && 'border-slate-300 bg-slate-100 text-slate-700'
  )

const formatMoney = (value?: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// Reusable stat card component
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle: string
  valueColor?: 'default' | 'green' | 'blue' | 'purple'
}

const StatCard = ({ title, value, icon, subtitle, valueColor = 'default' }: StatCardProps) => {
  const colorClasses = {
    default: 'text-foreground',
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClasses[valueColor]}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

// Reusable section header
interface SectionHeaderProps {
  title: string
  subtitle: string
  actionLabel?: string
  actionHref?: string
  onRefresh?: () => void
}

const SectionHeader = ({ title, subtitle, actionLabel, actionHref, onRefresh }: SectionHeaderProps) => (
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex gap-2">
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          title="Refresh data"
        >
          <IconRefresh className="h-4 w-4" />
        </Button>
      )}
      {actionLabel && actionHref && (
        <Button asChild variant="outline" size="sm">
          <a href={actionHref}>
            <IconChartLine className="h-4 w-4 mr-2" />
            {actionLabel}
          </a>
        </Button>
      )}
    </div>
  </div>
)

// Calculate completion percentage helper
const getCompletionPercentage = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

// SuperAdminDashboard
const SuperAdminDashboard = ({ data, onRefresh }: DashboardComponentProps) => {
  const navigate = useNavigate()
  const platform = data.platform
  const totals = platform?.totals
  const companies = platform?.companies || []
  const totalCompanies = totals?.totalCompanies ?? data.stats.totalCompanies ?? data.stats.totalLoads
  const activeCompanies = totals?.activeCompanies ?? data.stats.activeCompanies ?? data.stats.activeLoads
  const disabledCompanies = totals?.disabledCompanies ?? data.stats.disabledCompanies ?? data.stats.canceledLoads
  const totalTenantUsers = totals?.totalTenantUsers ?? data.stats.totalTenantUsers ?? 0
  const totalSuperAdmins = totals?.totalSuperAdmins ?? data.stats.totalSuperAdmins ?? data.stats.totalUsers
  const activeRate = getCompletionPercentage(activeCompanies, totalCompanies)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Super Admin</Badge>
            <h1 className="text-2xl font-bold tracking-tight">Platform Command Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage companies, watch tenant health, and jump into platform operations from one dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              Settings
            </Button>
            <Button size="sm" onClick={() => navigate('/companies/create')}>
              Add Company
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Companies"
          value={totalCompanies}
          icon={<IconBuilding className="h-4 w-4 text-blue-500" />}
          subtitle={`${activeCompanies} active · ${disabledCompanies} disabled`}
          valueColor="blue"
        />

        <StatCard
          title="Tenant Users"
          value={totalTenantUsers}
          icon={<IconUsers className="h-4 w-4 text-green-500" />}
          subtitle="Active users across companies"
          valueColor="green"
        />

        <StatCard
          title="Platform Health"
          value={`${activeRate}%`}
          icon={<IconCheck className="h-4 w-4 text-green-500" />}
          subtitle="Companies currently active"
          valueColor="green"
        />

        <StatCard
          title="Super Admins"
          value={totalSuperAdmins}
          icon={<IconUsers className="h-4 w-4 text-purple-500" />}
          subtitle="Platform administrators"
          valueColor="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent Companies</CardTitle>
              <CardDescription>Latest tenants created on the platform</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/companies')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {companies.length > 0 ? (
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-12 border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                  <span className="col-span-4">Company</span>
                  <span className="col-span-2">Plan</span>
                  <span className="col-span-2">Users</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 text-right">Created</span>
                </div>
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="grid w-full grid-cols-12 items-center border-b px-4 py-3 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/50"
                    onClick={() => navigate('/companies')}
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="truncate font-medium">{company.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {company.subdomain}.localhost
                      </p>
                    </div>
                    <span className="col-span-2">
                      <Badge variant="outline" className="capitalize">{company.plan}</Badge>
                    </span>
                    <span className="col-span-2">
                      {company.userCount}
                      {company.maxUsers ? (
                        <span className="text-muted-foreground"> / {company.maxUsers}</span>
                      ) : null}
                    </span>
                    <span className="col-span-2">
                      <Badge variant={company.isActive ? 'default' : 'secondary'}>
                        {company.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </span>
                    <span className="col-span-2 text-right text-xs text-muted-foreground">
                      {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <IconBuilding className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">No companies yet</p>
                <p className="text-xs text-muted-foreground">Create a company to start tenant operations.</p>
                <Button className="mt-4" size="sm" onClick={() => navigate('/companies/create')}>
                  Add Company
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Companies by subscription tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(platform?.planDistribution || []).length > 0 ? (
                platform!.planDistribution.map((plan) => {
                  const percentage = getCompletionPercentage(plan.count, totalCompanies)
                  return (
                    <div key={plan.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{plan.plan || 'free'}</span>
                        <span className="font-medium">{plan.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">No plan data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common platform admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button className="justify-start" variant="outline" onClick={() => navigate('/companies/create')}>
                <IconBuilding className="mr-2 h-4 w-4" />
                Add new company
              </Button>
              <Button className="justify-start" variant="outline" onClick={() => navigate('/companies')}>
                <IconBox className="mr-2 h-4 w-4" />
                Manage companies
              </Button>
              <Button className="justify-start" variant="outline" onClick={() => navigate('/settings')}>
                <IconUsers className="mr-2 h-4 w-4" />
                Review permissions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Access Summary</CardTitle>
          <CardDescription>High-level platform and tenant account health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.usersByRole?.map((role) => (
              <div key={role.role} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm capitalize">{role.role.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${role.totalCount > 0 ? (role.activeCount / role.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium">{role.activeCount}/{role.totalCount}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// CompanyAdminDashboard
const CompanyAdminDashboard = ({ data }: DashboardComponentProps) => {
  const navigate = useNavigate()
  const activeLoads =
    data.stats.activeLoads ??
    data.stats.totalLoads - data.stats.completedLoads - data.stats.canceledLoads
  const completionRate = getCompletionPercentage(data.stats.completedLoads, data.stats.totalLoads)
  const openLoads = data.statusDistribution?.find((item) => item.status === 'open')?.count || 0
  const assignedLoads = data.statusDistribution?.find((item) => item.status === 'assigned')?.count || 0
  const inTransitLoads = data.statusDistribution?.find((item) => item.status === 'in_transit')?.count || 0
  const urgentLoads = data.priorityDistribution?.find((item) => item.priority === 'urgent')?.count || 0
  const highPriorityLoads = data.priorityDistribution?.find((item) => item.priority === 'high')?.count || 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Loads"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4 text-blue-500" />}
          subtitle={`${openLoads} open · ${assignedLoads + inTransitLoads} moving`}
          valueColor="blue"
        />

        <StatCard
          title="Pending Bids"
          value={data.stats.pendingBids}
          icon={<IconTrendingUp className="h-4 w-4 text-amber-500" />}
          subtitle="Need review / assignment"
          valueColor="purple"
        />

        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<IconCheck className="h-4 w-4 text-green-500" />}
          subtitle={`${data.stats.completedLoads} of ${data.stats.totalLoads} delivered`}
          valueColor="green"
        />

        <StatCard
          title="Revenue"
          value={formatMoney(data.stats.totalRevenue)}
          icon={<IconTrendingUp className="h-4 w-4 text-green-600" />}
          subtitle={`Avg ${formatMoney(data.stats.averageLoadValue)} / load`}
          valueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="self-start lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent Load Activity</CardTitle>
              <CardDescription>Latest requirements and delivery movement</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/load')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentLoads && data.recentLoads.length > 0 ? (
              <div className="divide-y rounded-xl border">
                {data.recentLoads.slice(0, 6).map((load: any) => (
                  <button
                    key={getLoadId(load)}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/60"
                    onClick={() => navigate(`/load/${getLoadId(load)}`)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <IconBox className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{load.loadNumber}</p>
                          <Badge variant="outline" className={getPriorityBadgeClass(load.priority)}>
                            {load.priority || 'normal'}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{getLoadRoute(load)}</p>
                        <p className="truncate text-xs text-muted-foreground">{load.material}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant="outline" className={getStatusBadgeClass(load.status)}>
                        {getStatusLabel(load.status)}
                      </Badge>
                      {load.bidWinningPrice ? (
                        <span className="text-xs font-medium">{formatMoney(load.bidWinningPrice)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Awaiting bid</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <IconBox className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">No recent loads</p>
                <p className="text-xs text-muted-foreground">Create a load to start collecting bids.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attention Needed</CardTitle>
              <CardDescription>Things admin should act on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div>
                  <p className="text-sm font-medium">Pending bids</p>
                  <p className="text-xs opacity-80">Review and assign winners</p>
                </div>
                <span className="text-xl font-bold">{data.stats.pendingBids}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-red-900 dark:bg-red-950/30 dark:text-red-200">
                <div>
                  <p className="text-sm font-medium">Urgent / high priority</p>
                  <p className="text-xs opacity-80">Loads needing faster action</p>
                </div>
                <span className="text-xl font-bold">{urgentLoads + highPriorityLoads}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                <div>
                  <p className="text-sm font-medium">Unread messages</p>
                  <p className="text-xs opacity-80">Transporter conversations</p>
                </div>
                <span className="text-xl font-bold">{data.stats.unreadMessages}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="space-y-4">

        <AdvancedCharts
          metrics={data.metrics}
          recentUnreadMessages={data.recentUnreadMessages}
          statusDistribution={data.statusDistribution}
          priorityDistribution={data.priorityDistribution}
          vehicleTypeDistribution={data.vehicleTypeDistribution}
          totalRevenue={data.stats.totalRevenue}
          totalLoads={data.stats.totalLoads}
          completedLoads={data.stats.completedLoads}
        />
      </div>
    </div>
  )
}

// CompanyUserDashboard
const CompanyUserDashboard = ({ data }: DashboardComponentProps) => {
  const activeLoads = data.stats.totalLoads - data.stats.completedLoads - data.stats.canceledLoads

  return (
    <div className="space-y-6">
      <SectionHeader
        title="My Tasks"
        subtitle="Your personal load assignments and activity"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Active Loads"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4 text-blue-500" />}
          subtitle="Awaiting assignment"
          valueColor="blue"
        />

        <StatCard
          title="Completed"
          value={data.stats.completedLoads}
          icon={<IconCheck className="h-4 w-4 text-green-500" />}
          subtitle="Successfully completed"
          valueColor="green"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key sections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button className="w-full justify-start" variant="outline">
            <IconBox className="h-4 w-4 mr-2" />
            View Available Loads
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <IconMessages className="h-4 w-4 mr-2" />
            View Messages
          </Button>
          <Button className="w-full justify-start" variant="outline">
            <IconUsers className="h-4 w-4 mr-2" />
            Team Directory
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest loads</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentLoads && data.recentLoads.length > 0 ? (
            <div className="space-y-2">
              {data.recentLoads.slice(0, 3).map((load: any) => (
                <div key={getLoadId(load)} className="flex items-center justify-between p-2 hover:bg-secondary rounded transition-colors">
                  <div>
                    <p className="text-sm font-medium">{load.loadNumber}</p>
                    <p className="text-xs text-muted-foreground">{getLoadRoute(load)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClass(load.status)}
                  >
                    {load.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// TransporterDashboard
const TransporterDashboard = ({ data }: DashboardComponentProps) => {
  const navigate = useNavigate()
  const completionRate = getCompletionPercentage(data.stats.completedLoads, data.stats.totalLoads)
  const activeLoads =
    data.stats.activeLoads ??
    data.stats.totalLoads - data.stats.completedLoads - data.stats.canceledLoads
  const assignedLoads = data.statusDistribution?.find((item) => item.status === 'assigned')?.count || 0
  const inTransitLoads = data.statusDistribution?.find((item) => item.status === 'in_transit')?.count || 0
  const openLoads = data.statusDistribution?.find((item) => item.status === 'open')?.count || 0
  const pendingBidCount =
    data.bidStatusDistribution?.find((item) => item.status === 'pending')?.count ||
    data.stats.pendingBids ||
    0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Available Loads"
          value={openLoads || data.stats.totalLoads}
          icon={<IconTruck className="h-4 w-4 text-green-500" />}
          subtitle="Open for bidding"
          valueColor="green"
        />

        <StatCard
          title="Active Trips"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4 text-blue-500" />}
          subtitle={`${assignedLoads} assigned · ${inTransitLoads} in transit`}
          valueColor="blue"
        />

        <StatCard
          title="Completed"
          value={data.stats.completedLoads}
          icon={<IconCheck className="h-4 w-4 text-green-500" />}
          subtitle={`${completionRate}% success rate`}
          valueColor="green"
        />

        <StatCard
          title="Earnings"
          value={formatMoney(data.stats.totalRevenue)}
          icon={<IconTrendingUp className="h-4 w-4 text-emerald-600" />}
          subtitle={`Avg ${formatMoney(data.stats.averageLoadValue)} / load`}
          valueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="self-start xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Load Opportunities</CardTitle>
              <CardDescription>Available and recently assigned loads</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/load')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentLoads && data.recentLoads.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.recentLoads.slice(0, 6).map((load: any) => (
                  <button
                    key={getLoadId(load)}
                    type="button"
                    className="rounded-xl border p-3 text-left transition-colors hover:bg-muted/60"
                    onClick={() => navigate(`/load/${getLoadId(load)}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{load.loadNumber}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{getLoadRoute(load)}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{load.material || 'Material not specified'}</p>
                      </div>
                      <Badge variant="outline" className={getStatusBadgeClass(load.status)}>
                        {getStatusLabel(load.status)}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Badge variant="outline" className={getPriorityBadgeClass(load.priority)}>
                        {load.priority || 'normal'}
                      </Badge>
                      <span className="text-xs font-semibold">
                        {load.bidWinningPrice ? formatMoney(load.bidWinningPrice) : 'Bid now'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <IconTruck className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">No available loads</p>
                <p className="text-xs text-muted-foreground">New load opportunities will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Delivery Health</CardTitle>
              <CardDescription>Your current workload</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                <div>
                  <p className="text-sm font-medium">Assigned</p>
                  <p className="text-xs opacity-80">Ready to pickup</p>
                </div>
                <span className="text-xl font-bold">{assignedLoads}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div>
                  <p className="text-sm font-medium">In transit</p>
                  <p className="text-xs opacity-80">Currently moving</p>
                </div>
                <span className="text-xl font-bold">{inTransitLoads}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <div>
                  <p className="text-sm font-medium">Pending bids</p>
                  <p className="text-xs opacity-80">Waiting for response</p>
                </div>
                <span className="text-xl font-bold">{pendingBidCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Bid Status</CardTitle>
              <CardDescription>Latest bid pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {data.bidStatusDistribution?.length ? (
                <div className="space-y-3">
                  {data.bidStatusDistribution.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                      <span className="text-sm capitalize">{item.status.replace(/_/g, ' ')}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bid activity yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Messages</CardTitle>
              <CardDescription>Unread customer/company chats</CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/60"
                onClick={() => navigate('/chats')}
              >
                <div>
                  <p className="text-sm font-medium">Unread messages</p>
                  <p className="text-xs text-muted-foreground">Open conversations</p>
                </div>
                <Badge variant={data.stats.unreadMessages ? 'default' : 'secondary'}>
                  {data.stats.unreadMessages}
                </Badge>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Dashboard factory pattern
const dashboardComponents: Record<DashboardRole, React.ComponentType<DashboardComponentProps>> = {
  super_admin: SuperAdminDashboard,
  company_admin: CompanyAdminDashboard,
  company_user: CompanyUserDashboard,
  transporter: TransporterDashboard,
}

// Main component
export default function RoleBasedDashboard() {
  const navigate = useNavigate()
  const { socket } = useNotifications()
  const dashboardRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const user = useSelector((state: RootState) => {
    const authState = state.auth as any
    return authState?.user
  })

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      else setRefreshing(true)

      const dashboardData = await dashboardService.getDashboardData()
      setData(dashboardData)
    } catch (error: any) {
      console.error('Failed to load dashboard:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load dashboard',
        variant: 'destructive',
      })
    } finally {
      if (showLoader) setLoading(false)
      else setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      navigate('/sign-in')
      return
    }
    fetchDashboardData()
  }, [user, navigate, fetchDashboardData])

  useEffect(() => {
    if (!socket) return

    const scheduleDashboardRefresh = () => {
      if (dashboardRefreshTimerRef.current) {
        clearTimeout(dashboardRefreshTimerRef.current)
      }
      dashboardRefreshTimerRef.current = setTimeout(() => {
        fetchDashboardData(false)
      }, 500)
    }

    const upsertRecentLoad = (load: any) => {
      if (!load) return

      setData((prev) => {
        if (!prev) return prev

        const loadId = getLoadId(load)
        const existing = prev.recentLoads.find((item: any) => getLoadId(item) === loadId)
        const previousStatus = existing?.status
        const recentLoads = [
          load,
          ...prev.recentLoads.filter((item: any) => getLoadId(item) !== loadId),
        ].slice(0, 10)

        let next: DashboardData = {
          ...prev,
          recentLoads,
        }

        if (previousStatus && previousStatus !== load.status) {
          let statusDistribution = prev.statusDistribution.map((item) => {
            if (item.status === previousStatus) {
              return { ...item, count: Math.max(0, item.count - 1) }
            }
            if (item.status === load.status) {
              return { ...item, count: item.count + 1 }
            }
            return item
          })

          if (!statusDistribution.some((item) => item.status === load.status)) {
            statusDistribution = [
              ...statusDistribution,
              { status: load.status, count: 1, percentage: 0 },
            ]
          }

          next = {
            ...next,
            statusDistribution,
            stats: {
              ...next.stats,
              completedLoads:
                load.status === 'delivered' && previousStatus !== 'delivered'
                  ? next.stats.completedLoads + 1
                  : next.stats.completedLoads,
            },
          }
        }

        return next
      })
    }

    const handleLoadRealtime = (payload: any) => {
      upsertRecentLoad(payload?.load)
      scheduleDashboardRefresh()
    }
    const handleBidCreated = (payload: any) => {
      setData((prev) =>
        prev
          ? {
            ...prev,
            stats: {
              ...prev.stats,
              pendingBids: prev.stats.pendingBids + 1,
            },
          }
          : prev
      )
      if (payload?.load) upsertRecentLoad(payload.load)
      scheduleDashboardRefresh()
    }
    const handleDashboardRefresh = () => scheduleDashboardRefresh()

    socket.on('load:assigned', handleLoadRealtime)
    socket.on('load:updated', handleLoadRealtime)
    socket.on('load:status-changed', handleLoadRealtime)
    socket.on('bid:created', handleBidCreated)
    socket.on('bid:updated', handleDashboardRefresh)
    socket.on('notification:new', handleDashboardRefresh)
    socket.on('receive-message', handleDashboardRefresh)
    socket.on('message:new', handleDashboardRefresh)
    socket.on('dashboard:updated', handleDashboardRefresh)

    return () => {
      if (dashboardRefreshTimerRef.current) {
        clearTimeout(dashboardRefreshTimerRef.current)
      }
      socket.off('load:assigned', handleLoadRealtime)
      socket.off('load:updated', handleLoadRealtime)
      socket.off('load:status-changed', handleLoadRealtime)
      socket.off('bid:created', handleBidCreated)
      socket.off('bid:updated', handleDashboardRefresh)
      socket.off('notification:new', handleDashboardRefresh)
      socket.off('receive-message', handleDashboardRefresh)
      socket.off('message:new', handleDashboardRefresh)
      socket.off('dashboard:updated', handleDashboardRefresh)
    }
  }, [socket, fetchDashboardData])

  // Determine which dashboard component to render
  const DashboardComponent = dashboardComponents[user?.role as DashboardRole]

  if (loading) {
    return (
      <Layout >
        <Layout.Header sticky>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <UserNav />
          </div>
        </Layout.Header>
        <Layout.Body>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="animate-spin">
              <IconBox className="h-8 w-8" />
            </div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout >
        <Layout.Body>
          <div className="flex items-center justify-center h-full">
            <Card className="w-96">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Please log in to access the dashboard
                </p>
              </CardContent>
            </Card>
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  if (!DashboardComponent) {
    return (
      <Layout >
        <Layout.Body>
          <div className="flex items-center justify-center h-full">
            <Card className="w-96">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Unknown user role: {user?.role}
                </p>
              </CardContent>
            </Card>
          </div>
        </Layout.Body>
      </Layout>
    )
  }

  return (
    <Layout >
      <Layout.Header sticky className="border-b">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Welcome, {user?.fullName} • {user?.role.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="capitalize">
              {user?.role.replace(/_/g, ' ')}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDashboardData(false)}
              disabled={refreshing}
            >
              <IconRefresh className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
            <ThemeSwitch />
            <UserNav />
          </div>
        </div>
      </Layout.Header>

      <Layout.Body>
        {!data ? (
          <div className="flex items-center justify-center py-20">
            <Card className="w-96">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No dashboard data available
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <DashboardComponent
            data={data}
            onRefresh={() => fetchDashboardData(false)}
          />
        )}
      </Layout.Body>
    </Layout>
  )
}
