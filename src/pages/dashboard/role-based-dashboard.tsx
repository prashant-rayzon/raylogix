import { useEffect, useState, useCallback, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import { Layout } from '@/components/custom/layout'
import { PageLoader } from '@/components/loader'
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
  IconReceipt2,
  IconCategory,
  IconDashboard,
} from '@tabler/icons-react'
import { dashboardService, type DashboardData } from '@/api/services/dashboard'
import { cn } from '@/lib/utils'
import ThemeSwitch from '@/components/theme-switch'
import { toast } from '@/components/ui/use-toast'
import { AdvancedCharts } from '@/components/dashboard/AdvancedCharts'
import { useNotifications } from '@/contexts/NotificationContext'

// Type definitions
type DashboardRole = 'super_admin' | 'company_admin' | 'company_user' | 'transporter' | 'finance'
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
  ({
    open: 'Open',
    assigned: 'Pending',
    in_transit: 'Pending',
    delivered: 'Delivered',
    canceled: 'Cancelled',
    cancelled: 'Cancelled',
  }[status] || status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()))

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
    green: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-indigo-600 dark:text-indigo-400',
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:border-primary/20">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-xl" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
        <div className="rounded-xl bg-primary/10 p-2 text-primary dark:bg-primary/20">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className={`text-2xl font-extrabold tracking-tight ${colorClasses[valueColor]}`}>{value}</div>
        <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
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
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2">
    <div>
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    <div className="flex items-center gap-2">
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="h-8 rounded-lg text-xs"
          title="Refresh data"
        >
          <IconRefresh className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      )}
      {actionLabel && actionHref && (
        <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
          <a href={actionHref}>
            <IconChartLine className="h-3.5 w-3.5 mr-1.5" />
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Premium Header Banner */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-2 bg-primary/20 text-primary hover:bg-primary/25 border-none font-semibold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
              Super Admin Control Panel
            </Badge>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">Platform Operations</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Monitor active tenants, manage system permissions, and track platform-wide resources.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={onRefresh}>
              <IconRefresh className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={() => navigate('/settings')}>
              Settings
            </Button>
            <Button size="sm" className="h-8 rounded-xl text-xs shadow-md shadow-primary/20" onClick={() => navigate('/companies/create')}>
              Add Company
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Companies"
          value={totalCompanies}
          icon={<IconBuilding className="h-4 w-4" />}
          subtitle={`${activeCompanies} active · ${disabledCompanies} disabled`}
          valueColor="blue"
        />

        <StatCard
          title="Tenant Users"
          value={totalTenantUsers}
          icon={<IconUsers className="h-4 w-4" />}
          subtitle="Active user accounts"
          valueColor="green"
        />

        <StatCard
          title="Platform Health"
          value={`${activeRate}%`}
          icon={<IconCheck className="h-4 w-4" />}
          subtitle="Active tenant percentage"
          valueColor="green"
        />

        <StatCard
          title="Super Admins"
          value={totalSuperAdmins}
          icon={<IconUsers className="h-4 w-4" />}
          subtitle="Platform managers"
          valueColor="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Recent Companies</CardTitle>
              <CardDescription className="text-xs">Latest tenants registered on the platform</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={() => navigate('/companies')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {companies.length > 0 ? (
              <div className="space-y-3">
                {companies.slice(0, 4).map((company) => (
                  <div
                    key={company.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:scale-[1.01] hover:border-primary/20 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {company.subdomain}.localhost
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="capitalize text-[10px] px-2 rounded-full">{company.plan}</Badge>
                      <Badge variant={company.isActive ? 'default' : 'secondary'} className="text-[10px] px-2 rounded-full">
                        {company.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-10 text-center">
                <IconBuilding className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">No companies yet</p>
                <p className="text-xs text-muted-foreground">Create a company to start tenant operations.</p>
                <Button className="mt-4 h-8 text-xs rounded-lg" size="sm" onClick={() => navigate('/companies/create')}>
                  Add Company
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/40 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Plan Distribution</CardTitle>
              <CardDescription className="text-xs">Companies by subscription tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {(platform?.planDistribution || []).length > 0 ? (
                platform!.planDistribution.map((plan) => {
                  const percentage = getCompletionPercentage(plan.count, totalCompanies)
                  return (
                    <div key={plan.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium text-foreground">{plan.plan || 'free'}</span>
                        <span className="font-bold text-muted-foreground">{plan.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground">No plan data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-xs">Common platform admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 pt-2">
              <Button className="justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/companies/create')}>
                <IconBuilding className="mr-2 h-3.5 w-3.5" />
                Add new company
              </Button>
              <Button className="justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/companies')}>
                <IconBox className="mr-2 h-3.5 w-3.5" />
                Manage companies
              </Button>
              <Button className="justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/settings')}>
                <IconUsers className="mr-2 h-3.5 w-3.5" />
                Review permissions
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Platform Access Summary</CardTitle>
          <CardDescription className="text-xs">High-level account health stats</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-2.5">
            {data.usersByRole?.map((role) => (
              <div key={role.role} className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/10 px-4 py-2">
                <span className="text-xs font-semibold capitalize text-foreground">{role.role.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-4">
                  <div className="w-24 bg-secondary rounded-full h-1.5 hidden sm:block">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{
                        width: `${role.totalCount > 0 ? (role.activeCount / role.totalCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">{role.activeCount} / {role.totalCount} active</span>
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


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Loads"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4" />}
          subtitle={`${openLoads} open · ${assignedLoads + inTransitLoads} moving`}
          valueColor="blue"
        />

        <StatCard
          title="Pending Bids"
          value={data.stats.pendingBids}
          icon={<IconTrendingUp className="h-4 w-4" />}
          subtitle="Awaiting winner assignment"
          valueColor="purple"
        />

        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<IconCheck className="h-4 w-4" />}
          subtitle={`${data.stats.completedLoads} of ${data.stats.totalLoads} delivered`}
          valueColor="green"
        />

        <StatCard
          title="Revenue"
          value={formatMoney(data.stats.totalRevenue)}
          icon={<IconTrendingUp className="h-4 w-4" />}
          subtitle={`Avg ${formatMoney(data.stats.averageLoadValue)} / load`}
          valueColor="green"
        />
      </div>


      
      <Card className="border-border/40 rounded-2xl shadow-sm pt-2">
        <CardContent>
          <AdvancedCharts
            metrics={data.metrics}
            recentUnreadMessages={data.recentUnreadMessages}
            statusDistribution={data.statusDistribution}
          />
        </CardContent>
      </Card>
            <Card className="border-border/40 rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold">Recent Load Activity</CardTitle>
            <CardDescription className="text-xs">Latest cargo movements and listings</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs" onClick={() => navigate('/load')}>
            View all
          </Button>
        </CardHeader>
        <CardContent className="pt-2">
          {data.recentLoads && data.recentLoads.length > 0 ? (
            <div className="space-y-2">
              {data.recentLoads.slice(0, 5).map((load: any) => (
                <div
                  key={getLoadId(load)}
                  onClick={() => navigate(`/load/${getLoadId(load)}`)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-3.5 transition-all hover:scale-[1.01] hover:border-primary/20 hover:shadow-sm cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <IconBox className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{load.loadNumber}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{getLoadRoute(load)} • {load.material}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant="outline" className={cn('text-[9px] font-semibold px-2 py-0 rounded-full border-none capitalize', getStatusBadgeClass(load.status))}>
                      {getStatusLabel(load.status)}
                    </Badge>
                    <span className="text-[10px] font-bold text-foreground">
                      {load.bidWinningPrice ? formatMoney(load.bidWinningPrice) : 'Awaiting Bid'}
                    </span>
                  </div>
                </div>
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
    </div>
  )
}

// CompanyUserDashboard
const CompanyUserDashboard = ({ data }: DashboardComponentProps) => {
  const navigate = useNavigate()
  const activeLoads = data.stats.totalLoads - data.stats.completedLoads - data.stats.canceledLoads

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader
        title="My Tasks"
        subtitle="Your assigned load list and quick shortcuts"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Active Loads"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4" />}
          subtitle="Current load listings"
          valueColor="blue"
        />

        <StatCard
          title="Completed"
          value={data.stats.completedLoads}
          icon={<IconCheck className="h-4 w-4" />}
          subtitle="Delivered successfully"
          valueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">TMS operation short links</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 pt-2">
            <Button className="w-full justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/load')}>
              <IconBox className="h-3.5 w-3.5 mr-2" />
              View Loads Board
            </Button>
            <Button className="w-full justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/chats')}>
              <IconMessages className="h-3.5 w-3.5 mr-2" />
              View Messages
            </Button>
            <Button className="w-full justify-start h-8 text-xs rounded-xl" variant="outline" onClick={() => navigate('/settings')}>
              <IconUsers className="h-3.5 w-3.5 mr-2" />
              My Profile
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Recent Operations</CardTitle>
            <CardDescription className="text-xs">Latest assigned loads activity</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {data.recentLoads && data.recentLoads.length > 0 ? (
              <div className="space-y-2">
                {data.recentLoads.slice(0, 3).map((load: any) => (
                  <div 
                    key={getLoadId(load)} 
                    onClick={() => navigate(`/load/${getLoadId(load)}`)}
                    className="flex items-center justify-between p-3 border border-border/50 rounded-xl hover:bg-muted/40 transition-all cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">{load.loadNumber}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{getLoadRoute(load)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] border-none px-2 rounded-full capitalize font-semibold', getStatusBadgeClass(load.status))}
                    >
                      {getStatusLabel(load.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">No recent operational activity</p>
            )}
          </CardContent>
        </Card>
      </div>
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Available Loads"
          value={openLoads || data.stats.totalLoads}
          icon={<IconTruck className="h-4 w-4" />}
          subtitle="Open for transporter bids"
          valueColor="green"
        />

        <StatCard
          title="Active Trips"
          value={activeLoads}
          icon={<IconBox className="h-4 w-4" />}
          subtitle={`${assignedLoads} allocated · ${inTransitLoads} on road`}
          valueColor="blue"
        />

        <StatCard
          title="Completed"
          value={data.stats.completedLoads}
          icon={<IconCheck className="h-4 w-4" />}
          subtitle={`${completionRate}% delivery rate`}
          valueColor="green"
        />

        <StatCard
          title="Earnings"
          value={formatMoney(data.stats.totalRevenue)}
          icon={<IconTrendingUp className="h-4 w-4" />}
          subtitle={`Avg ${formatMoney(data.stats.averageLoadValue)} / trip`}
          valueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="self-start xl:col-span-2 border-border/40 rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Load Opportunities</CardTitle>
              <CardDescription className="text-xs">Cargo requirements open for bidding</CardDescription>
            </div>
            <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={() => navigate('/load')}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="pt-2">
            {data.recentLoads && data.recentLoads.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.recentLoads.slice(0, 4).map((load: any) => (
                  <div
                    key={getLoadId(load)}
                    onClick={() => navigate(`/load/${getLoadId(load)}`)}
                    className="rounded-xl border border-border/50 p-4 transition-all hover:scale-[1.01] hover:border-primary/20 hover:shadow-sm cursor-pointer flex flex-col justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-bold text-foreground">{load.loadNumber}</p>
                        <Badge variant="outline" className={cn('text-[9px] px-2 py-0 border-none capitalize font-semibold rounded-full', getStatusBadgeClass(load.status))}>
                          {getStatusLabel(load.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{getLoadRoute(load)}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{load.material || 'General Cargo'}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-dashed border-border/40 pt-2.5">
                      <Badge variant="outline" className={cn('text-[9px] rounded-md px-1.5 py-0 border-none capitalize font-bold', getPriorityBadgeClass(load.priority))}>
                        {load.priority || 'Normal'}
                      </Badge>
                      <span className="text-[10px] font-semibold text-primary">Place Bid →</span>
                    </div>
                  </div>
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
          <Card className="border-border/40 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Trip Distribution</CardTitle>
              <CardDescription className="text-xs">Current workload statuses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between rounded-xl bg-blue-500/10 border border-blue-500/10 p-3 text-blue-900 dark:text-blue-200">
                <div>
                  <p className="text-xs font-semibold">Allocated Trips</p>
                  <p className="text-[10px] opacity-80">Ready for dispatch</p>
                </div>
                <span className="text-lg font-bold">{assignedLoads}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/10 p-3 text-emerald-900 dark:text-emerald-200">
                <div>
                  <p className="text-xs font-semibold">In Transit</p>
                  <p className="text-[10px] opacity-80">Trips currently moving</p>
                </div>
                <span className="text-lg font-bold">{inTransitLoads}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                <div>
                  <p className="text-xs font-semibold">Submitted Bids</p>
                  <p className="text-[10px] opacity-80">Awaiting winner award</p>
                </div>
                <span className="text-lg font-bold">{pendingBidCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Unread Messages</CardTitle>
              <CardDescription className="text-xs">Recent customer chats</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div 
                onClick={() => navigate('/chats')}
                className="flex items-center justify-between rounded-xl border border-border/50 p-3 bg-card hover:bg-muted/40 transition-all cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-foreground">Open Chats</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Click to view conversations</p>
                </div>
                <Badge variant={data.stats.unreadMessages ? 'default' : 'secondary'} className="text-[10px] font-bold">
                  {data.stats.unreadMessages}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// FinanceDashboard
const FinanceDashboard = ({ data }: DashboardComponentProps) => {
  const navigate = useNavigate()
  
  const verifiedLoads = data.statusDistribution?.find((item) => item.status === 'delivered')?.count || 0
  const pendingAudits = data.stats.completedLoads || 0
  const totalRevenue = data.stats.totalRevenue || 0
  const deviationCount = data.stats.pendingBids || 0

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pending Audits"
          value={pendingAudits}
          icon={<IconBox className="h-4 w-4 text-amber-500" />}
          subtitle="Delivered loads to verify"
          valueColor="default"
        />

        <StatCard
          title="Verified Loads"
          value={verifiedLoads}
          icon={<IconCheck className="h-4 w-4 text-blue-500" />}
          subtitle="Reconciled successfully"
          valueColor="blue"
        />

        <StatCard
          title="Payouts Reconciled"
          value={formatMoney(totalRevenue)}
          icon={<IconReceipt2 className="h-4 w-4 text-emerald-600" />}
          subtitle="Reconciled billing volume"
          valueColor="green"
        />

        <StatCard
          title="Ceiling Deviations"
          value={deviationCount}
          icon={<IconTrendingUp className="h-4 w-4 text-red-500" />}
          subtitle="Bids exceeding ceilings"
          valueColor="default"
        />
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-border/40 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Billing Verification</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Match invoice rates and weighbridge reports</p>
            </div>
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <IconReceipt2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full text-xs font-semibold h-8 rounded-xl shadow-sm shadow-primary/10"
            >
              Open Audit Verification Panel
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/40 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold">Freight Contract Rates</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Manage transporter route ceilings & contracts</p>
            </div>
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <IconCategory className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Button 
              onClick={() => navigate('/freight-rates')}
              variant="outline"
              className="w-full text-xs font-semibold h-8 rounded-xl"
            >
              Manage Negotiated Rates
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info panel */}
      <Card className="border-border/40 rounded-2xl p-5 bg-card/40 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary shrink-0">
            <IconDashboard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">Welcome to the Finance Dashboard</h4>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Use the shortcut buttons above or the sidebar menu links to audits and rates to manage contract ceilings, verify gate bridge scale weight recordings, audit transporter invoices, and reconcile payouts.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Dashboard factory pattern
const dashboardComponents: Record<DashboardRole, React.ComponentType<DashboardComponentProps>> = {
  super_admin: SuperAdminDashboard,
  company_admin: CompanyAdminDashboard,
  company_user: CompanyUserDashboard,
  transporter: TransporterDashboard,
  finance: FinanceDashboard,
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
        <Layout.Header sticky className="border-b bg-background/50 backdrop-blur-md">
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <UserNav />
          </div>
        </Layout.Header>
        <Layout.Body className="bg-gradient-to-br from-background via-background to-muted/20">
          <PageLoader label="Loading real-time TMS metrics..." />
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
