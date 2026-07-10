import apiClient from '@/api/client'
import { validateReportDateRange } from '@/lib/report-filters'

// Interfaces for Reports
export interface BillingReportItem {
  loadId: string
  loadNumber: string
  pickupCity: string
  pickupState: string
  deliveryCity: string
  deliveryState: string
  transporterId: string
  transporterName: string
  allocatedVehicles: number
  rate: number
  rateType: 'per_vehicle' | 'total'
  totalCost: number
  currency: string
  status: string
  pickupDate: string
  deliveryDate: string
  assignedAt: string

  // Max data fields
  vehicleType: string
  vehicleNumber: string
  driverName: string
  driverNumber: string
  productName: string
  loadQuantity: number
  loadBasis: string
  loadDistance: number
  ptpk: number
  ceilingPrice: number
  remarks: string
}

export interface BillingReportResponse {
  items: BillingReportItem[]
  summary: {
    totalBilling: number
    activeBilling: number
    completedBilling: number
    avgBillingPerLoad: number
    count: number
  }
  aggregations: {
    byTransporter: { name: string; value: number }[]
    byStatus: { status: string; value: number }[]
  }
}

export interface SavingsReportItem {
  loadId: string
  loadNumber: string
  vehicleType: string
  pickupCity: string
  pickupState: string
  deliveryCity: string
  deliveryState: string
  transporterName: string
  budget: number
  actualCost: number
  savings: number
  savingsPercentage: number
  allocatedVehicles: number
  pickupDate: string

  // Max data fields
  productName: string
  loadQuantity: number
  loadBasis: string
  loadDistance: number
  rateType: string
  budgetRate: number
  actualRate: number
  vehicleNumber: string
  driverName: string
  status: string
}

export interface SavingsReportResponse {
  items: SavingsReportItem[]
  summary: {
    totalBudget: number
    totalActual: number
    totalSavings: number
    avgSavingsPercentage: number
    count: number
  }
  aggregations: {
    byVehicleType: { name: string; value: number }[]
    byTransporter: { name: string; value: number }[]
  }
}

export interface VendorReportItem {
  transporterId: string
  transporterName: string
  companyName: string
  contactPhone: string
  contactEmail: string
  totalBids: number
  bidsWon: number
  winRate: number
  totalBusinessValue: number
  allocatedVehicles: number
  avgBidAmount: number

  // Max data fields
  gstNumber: string
  city: string
  state: string
  status: string
  isVerified: string
  contactPersonName: string
  contactPersonPhone: string
  highestBidAmount: number
  lowestBidAmount: number
}

export interface VendorReportResponse {
  vendors: VendorReportItem[]
  summary: {
    totalVendors: number
    overallBusinessValue: number
    overallAvgWinRate: number
  }
}

export interface AllotmentReportItem {
  loadId: string
  loadNumber: string
  loadStage: string
  loadType: string
  originCity: string
  originState: string
  originParty: string
  destinationCity: string
  destinationState: string
  partyName: string
  vehicleMode: string
  productName: string
  loadQuantity: number
  loadBasis: string
  qtyPerVehicle: number
  loadDistance: number
  vehicleType: string
  averageRate: number
  bidDateTime: string
  ceilingPrice: number
  lastRate: number
  lastRateCarrierName: string
  l1Name: string
  l1Rate: number
  l2Name: string
  l2Rate: number
  l3Name: string
  l3Rate: number
  l4Name: string
  l4Rate: number
  allottedRate: number
  allottedCarrier: string
  loadAllottedOn: string
  offlineAllotment: string
  avgFreightHistory: number
  vehicleNumber: string
  driverName: string
  driverNumber: string
  ptpk: number
  remarks: string
  totalAmount: number
  rateType: string
  postDateTime: string
  auctionEndDateTime: string
  lastRateCarrierBranchName: string
  allottedCarrierBranchName: string
}

export interface AllotmentReportResponse {
  allotments: AllotmentReportItem[]
  summary: {
    totalAllotments: number
    totalAllocatedVehicles: number
    totalAcceptedVehicles: number
    avgRate: number
  }
  aggregations: {
    byTransporter: { name: string; count: number }[]
    byStatus: { status: string; count: number }[]
  }
}

export interface ReportFilterParams {
  dateFrom?: string
  dateTo?: string
  transporterId?: string
  branchId?: string
  status?: string
  vehicleType?: string
}

function validateReportFilters(params?: ReportFilterParams) {
  const error = validateReportDateRange({
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  })

  if (error) {
    throw new Error(error)
  }
}

export const reportsService = {
  async getBillingReport(params?: ReportFilterParams): Promise<BillingReportResponse> {
    validateReportFilters(params)
    const response = await apiClient.get('/api/reports/billing', { params })
    return response.data.data
  },

  async getSavingsReport(params?: ReportFilterParams): Promise<SavingsReportResponse> {
    validateReportFilters(params)
    const response = await apiClient.get('/api/reports/savings', { params })
    return response.data.data
  },

  async getVendorReport(params?: ReportFilterParams): Promise<VendorReportResponse> {
    validateReportFilters(params)
    const response = await apiClient.get('/api/reports/vendors', { params })
    return response.data.data
  },

  async getAllotmentReport(params?: ReportFilterParams): Promise<AllotmentReportResponse> {
    validateReportFilters(params)
    const response = await apiClient.get('/api/reports/allotments', { params })
    return response.data.data
  },
}
