import apiClient from '@/api/client'

export interface DashboardStats {
  totalCompanies?: number
  activeCompanies?: number
  disabledCompanies?: number
  totalTenantUsers?: number
  totalSuperAdmins?: number
  totalLoads: number
  activeLoads: number
  completedLoads: number
  canceledLoads: number
  totalRevenue: number
  averageLoadValue: number
  totalUsers: number
  activeUsers: number
  unreadMessages: number
  pendingBids: number
}

export interface LoadMetrics {
  date: string
  count: number
  revenue: number
  completed: number
  pending: number
}

export interface LoadStatusDistribution {
  status: string
  count: number
  percentage: number
}

export interface UsersByRole {
  role: string
  totalCount: number
  activeCount: number
  inactiveCount?: number
}

export interface BidStatusDistribution {
  status: string
  count: number
}

export interface PriorityDistribution {
  priority: string
  count: number
  percentage: number
}

export interface VehicleTypeDistribution {
  vehicleType: string
  count: number
}

export interface UnreadMessage {
  senderId: string
  senderName: string
  content: string
  timestamp: string
}

export interface RecentLoad {
  _id: string
  loadNumber: string
  material: string
  status: 'open' | 'assigned' | 'in_transit' | 'delivered' | 'canceled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  pickupLocation: {
    city: string
    state: string
  }
  deliveryLocation: {
    city: string
    state: string
  }
  bidWinningPrice?: number
  createdAt: string
}

export interface DashboardData {
  stats: DashboardStats
  platform?: {
    companies: Array<{
      id: string
      name: string
      subdomain: string
      plan: 'free' | 'pro' | 'enterprise'
      databaseName: string
      isActive: boolean
      userCount: number
      maxUsers: number
      maxTransporters: number
      createdAt: string
    }>
    planDistribution: Array<{
      plan: string
      count: number
    }>
    totals: {
      totalCompanies: number
      activeCompanies: number
      disabledCompanies: number
      totalTenantUsers: number
      totalSuperAdmins: number
    }
  }
  metrics: LoadMetrics[]
  statusDistribution: LoadStatusDistribution[]
  bidStatusDistribution: BidStatusDistribution[]
  priorityDistribution: PriorityDistribution[]
  vehicleTypeDistribution: VehicleTypeDistribution[]
  recentLoads: RecentLoad[]
  recentUnreadMessages: UnreadMessage[]
  usersByRole: UsersByRole[]
  topTransporters: Array<{
    _id: string
    name: string
    completedLoads: number
    revenue: number
  }>
}

class DashboardService {
  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(params?: {
    dateRange?: 'week' | 'month' | 'year'
    limit?: number
  }): Promise<DashboardData> {
    try {
      const response = await apiClient.get('/dashboard', { params })
      return response.data.data
    } catch (error) {
      throw error
    }
  }

}

export const dashboardService = new DashboardService()
