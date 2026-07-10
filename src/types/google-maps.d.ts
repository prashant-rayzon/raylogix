declare namespace google.maps {
  // Geocoder types
  interface GeocoderResult {
    address_components: GeocoderAddressComponent[]
    formatted_address: string
    geometry: GeocoderGeometry
    place_id: string
    types: string[]
  }

  interface GeocoderAddressComponent {
    long_name: string
    short_name: string
    types: string[]
  }

  interface GeocoderGeometry {
    location: LatLng
    location_type: string
    bounds?: LatLngBounds
    viewport?: LatLngBounds
  }

  type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR'

  interface Geocoder {
    geocode(request: GeocoderRequest, callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void): void
  }

  interface GeocoderRequest {
    address?: string
    location?: LatLng | LatLngLiteral
    placeId?: string
    region?: string
    bounds?: LatLngBounds | LatLngBoundsLiteral
    componentRestrictions?: GeocoderComponentRestrictions
  }

  interface GeocoderComponentRestrictions {
    administrativeArea?: string
    country?: string | string[]
    locality?: string
    postalCode?: string
    route?: string
  }

  interface LatLng {
    lat(): number
    lng(): number
    equals(other: LatLng | LatLngLiteral | null): boolean
    toJSON(): LatLngLiteral
    toString(): string
    toUrlValue(precision?: number): string
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  interface LatLngBounds {
    contains(latLng: LatLng | LatLngLiteral): boolean
    equals(other: LatLngBounds | LatLngBoundsLiteral | null): boolean
    extend(point: LatLng | LatLngLiteral): LatLngBounds
    getCenter(): LatLng
    getNorthEast(): LatLng
    getSouthWest(): LatLng
    intersects(other: LatLngBounds | LatLngBoundsLiteral): boolean
    isEmpty(): boolean
    toJSON(): LatLngBoundsLiteral
    toString(): string
    toUrlValue(precision?: number): string
  }

  interface LatLngBoundsLiteral {
    east: number
    north: number
    south: number
    west: number
  }

  // Directions types
  interface DirectionsService {
    route(request: DirectionsRequest, callback: (result: DirectionsResult | null, status: DirectionsStatus) => void): void
  }

  type DirectionsStatus = 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | 'MAX_WAYPOINTS_EXCEEDED' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'OVER_QUERY_LIMIT' | 'UNKNOWN_ERROR'

  interface DirectionsRequest {
    origin: string | LatLng | LatLngLiteral | Place
    destination: string | LatLng | LatLngLiteral | Place
    travelMode: TravelMode
    transitOptions?: TransitOptions
    drivingOptions?: DrivingOptions
    unitSystem?: UnitSystem
    waypoints?: DirectionsWaypoint[]
    optimizeWaypoints?: boolean
    provideRouteAlternatives?: boolean
    avoidFerries?: boolean
    avoidHighways?: boolean
    avoidTolls?: boolean
    region?: string
    language?: string
  }

  interface DirectionsWaypoint {
    location: string | LatLng | LatLngLiteral | Place
    stopover?: boolean
  }

  type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
  type UnitSystem = 'METRIC' | 'IMPERIAL'

  interface DrivingOptions {
    departureTime: Date | number
    trafficModel: 'best_guess' | 'pessimistic' | 'optimistic'
  }

  interface TransitOptions {
    arrivalTime?: Date
    departureTime?: Date
    modes?: TransitMode[]
    routePreference?: TransitRoutePreference
  }

  type TransitMode = 'BUS' | 'RAIL' | 'SUBWAY' | 'TRAIN' | 'TRAM'
  type TransitRoutePreference = 'FEWER_TRANSFERS' | 'LESS_WALKING'

  interface DirectionsResult {
    routes: DirectionsRoute[]
    geocoded_waypoints: DirectionsGeocodedWaypoint[]
  }

  interface DirectionsRoute {
    bounds: LatLngBounds
    copyrights: string
    legs: DirectionsLeg[]
    overview_polyline: string | { points: string }
    summary: string
    warnings: string[]
    waypoint_order: number[]
    fare?: TransitFare
  }

  interface DirectionsLeg {
    distance: Distance
    duration: Duration
    duration_in_traffic?: Duration
    end_address: string
    end_location: LatLng
    start_address: string
    start_location: LatLng
    steps: DirectionsStep[]
    via_waypoints: LatLng[]
  }

  interface DirectionsStep {
    distance: Distance
    duration: Duration
    end_location: LatLng
    instructions: string
    path: LatLng[]
    start_location: LatLng
    steps?: DirectionsStep[]
    transit?: TransitDetails
    travel_mode: TravelMode
  }

  interface TransitDetails {
    arrival_stop: TransitStop
    arrival_time: Time
    departure_stop: TransitStop
    departure_time: Time
    headsign: string
    headway: number
    line: TransitLine
    num_stops: number
  }

  interface TransitStop {
    location: LatLng
    name: string
  }

  interface TransitLine {
    agencies: TransitAgency[]
    color: string
    icon: string
    name: string
    short_name: string
    text_color: string
    url: string
    vehicle: TransitVehicle
  }

  interface TransitAgency {
    name: string
    phone: string
    url: string
  }

  interface TransitVehicle {
    icon: string
    local_icon: string
    name: string
    type: string
  }

  interface TransitFare {
    currency: string
    value: number
  }

  interface Distance {
    text: string
    value: number
  }

  interface Duration {
    text: string
    value: number
  }

  interface Time {
    text: string
    time_zone: string
    value: Date
  }

  interface DirectionsGeocodedWaypoint {
    partial_match: boolean
    place_id: string
    types: string[]
  }

  // Distance Matrix types
  interface DistanceMatrixService {
    getDistanceMatrix(request: DistanceMatrixRequest, callback: (response: DistanceMatrixResponse | null, status: DistanceMatrixStatus) => void): void
  }

  type DistanceMatrixStatus = 'OK' | 'INVALID_REQUEST' | 'MAX_DIMENSIONS_EXCEEDED' | 'MAX_ELEMENTS_EXCEEDED' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR'

  interface DistanceMatrixRequest {
    origins: (string | LatLng | LatLngLiteral)[]
    destinations: (string | LatLng | LatLngLiteral)[]
    travelMode?: TravelMode
    avoidFerries?: boolean
    avoidHighways?: boolean
    avoidTolls?: boolean
    drivingOptions?: DrivingOptions
    transitOptions?: TransitOptions
    unitSystem?: UnitSystem
    region?: string
    language?: string
    departureTime?: Date | number
  }

  interface DistanceMatrixResponse {
    originAddresses: string[]
    destinationAddresses: string[]
    rows: DistanceMatrixResponseRow[]
  }

  interface DistanceMatrixResponseRow {
    elements: DistanceMatrixResponseElement[]
  }

  interface DistanceMatrixResponseElement {
    distance: Distance
    duration: Duration
    duration_in_traffic?: Duration
    fare?: TransitFare
    status: string
  }

  // Places types
  namespace places {
    interface PlacesService {
      getDetails(request: PlaceDetailsRequest, callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void): void
      nearbySearch(request: PlaceSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void
    }

    type PlacesServiceStatus = 'OK' | 'ZERO_RESULTS' | 'INVALID_REQUEST' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'UNKNOWN_ERROR'

    interface PlaceDetailsRequest {
      placeId: string
      fields?: string[]
      sessionToken?: AutocompleteSessionToken
    }

    interface PlaceSearchRequest {
      location?: LatLng | LatLngLiteral
      radius?: number
      rankBy?: 'prominence' | 'distance'
      type?: string | string[]
      keyword?: string
      language?: string
      minPrice?: number
      maxPrice?: number
      name?: string | string[]
      openNow?: boolean
      pageToken?: string
    }

    interface PlaceResult {
      address_component?: GeocoderAddressComponent[]
      adr_address?: string
      business_status?: string
      formatted_address?: string
      formatted_phone_number?: string
      geometry?: {
        location?: LatLng
        viewport?: LatLngBounds
      }
      icon?: string
      international_phone_number?: string
      name?: string
      opening_hours?: OpeningHours
      photos?: PlacePhoto[]
      place_id?: string
      plus_code?: PlusCode
      types?: string[]
      url?: string
      utc_offset?: number
      vicinity?: string
      website?: string
      price_level?: number
      rating?: number
      reviews?: PlaceReview[]
      user_ratings_total?: number
      timezone?: string
    }

    interface PlacePhoto {
      getUrl(opts: PhotoOptions): string
      height: number
      width: number
      html_attributions: string[]
    }

    interface PhotoOptions {
      maxHeight?: number
      maxWidth?: number
    }

    interface OpeningHours {
      open_now?: boolean
      periods?: OpeningHoursPeriod[]
      weekday_text?: string[]
    }

    interface OpeningHoursPeriod {
      close?: OpeningHoursTime
      open?: OpeningHoursTime
    }

    interface OpeningHoursTime {
      day: number
      time: string
    }

    interface PlusCode {
      compound_code?: string
      global_code?: string
    }

    interface PlaceReview {
      aspects?: PlaceReviewAspect[]
      author_name: string
      author_url?: string
      language?: string
      profile_photo_url?: string
      rating: number
      relative_time_description?: string
      text: string
      time?: number
    }

    interface PlaceReviewAspect {
      rating: number
      type: string
    }

    interface AutocompletePrediction {
      description: string
      distance_meters?: number
      main_text: string
      matched_substrings: PredictionSubstring[]
      place_id: string
      plus_code?: PlusCode
      secondary_text?: string
      terms: PredictionTerm[]
      types: string[]
    }

    interface PredictionSubstring {
      length: number
      offset: number
    }

    interface PredictionTerm {
      offset: number
      value: string
    }

    interface AutocompleteSessionToken {}

    class AutocompleteService {
      getPlacePredictions(
        request: AutocompletionRequest,
        callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
      ): void
    }

    interface AutocompletionRequest {
      componentRestrictions?: ComponentRestrictions
      input: string
      language?: string
      offset?: number
      location?: LatLng
      radius?: number
      sessionToken?: AutocompleteSessionToken
      types?: string[]
    }

    interface ComponentRestrictions {
      country: string | string[]
    }
  }
}

declare global {
  interface Window {
    google: {
      maps: typeof google.maps
    }
  }
}

export {}
