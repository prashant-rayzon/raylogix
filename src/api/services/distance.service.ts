export interface DistanceMatrixResult {
  distance: string
  duration: string
  distanceValue: number
  durationValue: number
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_ROUTE_LENGTH_EXCEEDED'
  originAddress?: string
  destinationAddress?: string
  originLatLng?: { lat: number; lng: number }
  destinationLatLng?: { lat: number; lng: number }
}

export interface LocationSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types?: string[]
}

interface LocationDetails {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  lat: number
  lng: number
  formattedAddress: string
}

class DistanceService {
  async getDistanceAndDuration(): Promise<DistanceMatrixResult | null> {
    return null
  }

  clearCache(): void {}

  getCacheStats(): { size: number; placeCacheSize: number } {
    return { size: 0, placeCacheSize: 0 }
  }

  async getLocationSuggestions(): Promise<LocationSuggestion[]> {
    return []
  }

  async getPlaceDetails(): Promise<LocationDetails | null> {
    return null
  }

  clearAllCaches(): void {}

  resetSessionToken(): void {}
}

export const distanceService = new DistanceService()
