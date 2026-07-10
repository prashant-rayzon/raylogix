import client from '@/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface FastagTollCrossing {
  plazaName: string;
  highway: string;
  city: string;
  state: string;
  crossingTime: string;
  transactionId: string;
  feeCharged: string;
  direction: 'Entry' | 'Exit';
  laneNumber: string;
  vehicleClass: string;
}

export interface FastagNormalized {
  vehicleNumber: string;
  tagId: string;
  tagStatus: 'Active' | 'Low Balance' | 'Blacklisted' | 'Unknown' | string;
  issuerBank: string;
  walletBalance: string;
  vehicleClass: string;
  lastPlaza: string;
  lastCrossingTime: string | null;
  lastState: string;
  totalTransactions: number;
  tollCrossings: FastagTollCrossing[];
  source: 'LIVE' | 'DEMO_DATA' | 'FALLBACK_DEMO' | string;
  lastUpdated: string;
}

export interface FastagTrackingResponse {
  success: boolean;
  message: string;
  vehicleNumber: string;
  isDemoData: boolean;
  data: {
    raw_response: any;
    normalized: FastagNormalized;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const fastagService = {
  /**
   * Fetch FASTag toll movement data for a vehicle number.
   * Calls POST /api/tracking/fastag on the backend.
   */
  async getVehicleTracking(vehicleNumber: string): Promise<FastagTrackingResponse> {
    const response = await client.post('/api/tracking/fastag', { vehicleNumber });
    return response.data as FastagTrackingResponse;
  },
};
