// components/load/CreateLoadModal.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import {
  Loader2, Save, X, Plus, Calendar, Paperclip, AlertCircle, MapPin
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/custom/button'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { useToast } from '@/components/ui/use-toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { LocationAutocompleteSelect } from '@/components/ui/location-autocomplete-select'
import { AddLocationModal, type LocationData } from '@/components/load/AddLocationModal'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CreateLoadPayload } from '@/api/services/load/loads.crud.service'
import { getApiErrorMessage } from '@/lib/api-error'
import { hasPermission } from '@/lib/permissions'
import { useLoadStore } from '@/lib/hooks/useLoadStore'
import { listAdminTransporters } from '@/api/services/load/loadAccess.service'
import { branchesService, type Branch } from '@/api/services/branches/branches.service'
import { mastersService } from '@/api/services/masters/masters.service'
import { Checkbox } from '../ui/checkbox'
import { CreateTransporterGroupModal } from './CreateTransporterGroupModal'

/* ============================================================================
 * TYPES
 * ============================================================================ */

interface CreateLoadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  initialData?: Partial<LoadFormData> & {
    existingAttachments?: ExistingAttachment[]
    routeData?: {
      distanceKm?: number
      durationHours?: number
      routeSummary?: string
    }
  }
  loadId?: string
  onSuccess?: () => void
}

type LoadFormData = {
  loadNumber: string
  loadDirection: 'outbound' | 'inbound'
  isPublic: boolean
  allowedTransporters: string[]

  // Load Details
  material: string
  vehicleType: string
  numberOfVehicles: number
  estimatedWeight?: number

  // Pickup Details
  pickupLocationId: string
  pickupDate: string
  pickupAddressText?: string
  pickupLocationDetails?: any

  // Delivery Details
  deliveryLocationId: string
  deliveryDate: string
  deliveryAddressText?: string
  deliveryLocationDetails?: any

  // Additional Details
  tat?: string
  dpNum?: string
  notes?: string
  attachments?: File[]

  // Google Maps Integration
  routeOptimization?: boolean
  preferredRoute?: 'fastest' | 'shortest' | 'economical'
  avoidTolls?: boolean
  avoidHighways?: boolean
  avoidFerries?: boolean
  maxRouteAlternatives?: number
}

type ExistingAttachment = {
  url?: string
  name?: string
  mimeType?: string
  size?: number
  uploadedAt?: string
}

type LocationOption = {
  id: string
  label: string
  address: string
  city: string
  state: string
  zipCode: string
  contactPerson?: string
  phone?: string
  email?: string
  latitude?: number
  longitude?: number
  placeId?: string
}

type LoadDirection = 'outbound' | 'inbound'

interface RouteInfo {
  distance: {
    text: string
    value: number
  }
  duration: {
    text: string
    value: number
  }
  durationInTraffic?: {
    text: string
    value: number
  }
  polyline: string
  summary: string
  waypointOrder?: number[]
  legs: {
    distance: { text: string; value: number }
    duration: { text: string; value: number }
    startAddress: string
    endAddress: string
    steps: {
      distance: { text: string; value: number }
      duration: { text: string; value: number }
      instructions: string
      travelMode: string
    }[]
  }[]
}

interface LocationDetails {
  formattedAddress: string
  latitude: number
  longitude: number
  placeId: string
  city: string
  state: string
  zipCode: string
  country: string
  addressComponents: {
    street?: string
    streetNumber?: string
    route?: string
    locality?: string
    administrativeAreaLevel1?: string
    administrativeAreaLevel2?: string
    postalCode?: string
    country?: string
  }
  timezone?: string
  utcOffset?: number
}

/* ============================================================================
 * GOOGLE MAPS SERVICE
 * ============================================================================ */

class GoogleMapsService {
  private static instance: GoogleMapsService
  private mapsLoaded = false
  private loadingPromise: Promise<void> | null = null
  private directionsService: google.maps.DirectionsService | null = null
  private distanceMatrixService: google.maps.DistanceMatrixService | null = null
  private geocoder: google.maps.Geocoder | null = null
  private placesService: google.maps.places.PlacesService | null = null
  private mapContainer: HTMLDivElement | null = null
  private geocodeCache = new Map<string, LocationDetails>()

  static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService()
    }
    return GoogleMapsService.instance
  }

  async loadMaps(): Promise<void> {
    if (this.mapsLoaded) return
    if (this.loadingPromise) return this.loadingPromise

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is undefined'))
        return
      }

      if (window.google?.maps) {
        this.mapsLoaded = true
        this.initializeServices()
        resolve()
        return
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
        return
      }

      const expectedSrc = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&v=weekly`
      const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null
      
      if (existingScript) {
        if (window.google?.maps) {
          this.mapsLoaded = true
          this.initializeServices()
          resolve()
          return
        }
        const onLoad = () => {
          this.mapsLoaded = true
          this.initializeServices()
          resolve()
        }
        const onError = () => {
          reject(new Error('Failed to load Google Maps script'))
        }
        existingScript.addEventListener('load', onLoad)
        existingScript.addEventListener('error', onError)
        return
      }

      const script = document.createElement('script')
      script.id = 'google-maps-script'
      script.src = expectedSrc
      script.async = true
      script.defer = true
      script.onload = () => {
        this.mapsLoaded = true
        this.initializeServices()
        resolve()
      }
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'))
      }
      document.head.appendChild(script)
    })

    return this.loadingPromise
  }

  private initializeServices(): void {
    if (!window.google?.maps) return
    try {
      this.directionsService = new google.maps.DirectionsService()
      this.distanceMatrixService = new google.maps.DistanceMatrixService()
      this.geocoder = new google.maps.Geocoder()
      this.mapContainer = document.createElement('div')
      this.placesService = new google.maps.places.PlacesService(this.mapContainer)
    } catch (error) {
      console.error('Failed to initialize Google Maps services:', error)
    }
  }

  async geocodeAddress(address: string): Promise<LocationDetails> {
    const cacheKey = address.trim().toLowerCase()
    const cached = this.geocodeCache.get(cacheKey)
    if (cached) return cached

    await this.loadMaps()
    if (!this.geocoder) throw new Error('Geocoder not initialized')

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        { address, region: 'in' },
        (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0]
            const details = this.parseGeocodeResult(result)
            this.geocodeCache.set(cacheKey, details)
            resolve(details)
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        }
      )
    })
  }

  async reverseGeocode(lat: number, lng: number): Promise<LocationDetails> {
    await this.loadMaps()
    if (!this.geocoder) throw new Error('Geocoder not initialized')

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode(
        { location: { lat, lng } },
        (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0]
            const details = this.parseGeocodeResult(result)
            resolve(details)
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`))
          }
        }
      )
    })
  }

  private parseGeocodeResult(result: google.maps.GeocoderResult): LocationDetails {
    const components = result.address_components || []

    const getComponent = (types: string[]): string =>
      components.find((c: google.maps.GeocoderAddressComponent) => types.some(t => c.types.includes(t)))?.long_name || ''

    return {
      formattedAddress: result.formatted_address || '',
      latitude: result.geometry?.location?.lat() || 0,
      longitude: result.geometry?.location?.lng() || 0,
      placeId: result.place_id || '',
      city: getComponent(['locality', 'administrative_area_level_2']),
      state: getComponent(['administrative_area_level_1']),
      zipCode: getComponent(['postal_code']),
      country: getComponent(['country']),
      addressComponents: {
        street: getComponent(['route']),
        streetNumber: getComponent(['street_number']),
        route: getComponent(['route']),
        locality: getComponent(['locality']),
        administrativeAreaLevel1: getComponent(['administrative_area_level_1']),
        administrativeAreaLevel2: getComponent(['administrative_area_level_2']),
        postalCode: getComponent(['postal_code']),
        country: getComponent(['country']),
      }
    }
  }

  async getRoute(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string,
    options: {
      waypoints?: { lat: number; lng: number }[]
      travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
      avoidTolls?: boolean
      avoidHighways?: boolean
      avoidFerries?: boolean
      provideRouteAlternatives?: boolean
      drivingOptions?: {
        departureTime: Date
        trafficModel: 'bestguess' | 'pessimistic' | 'optimistic'
      }
    } = {}
  ): Promise<{
    routes: RouteInfo[]
    alternatives: any[]
    geocodedWaypoints: any[]
  }> {
    await this.loadMaps()
    if (!this.directionsService) throw new Error('Directions service not initialized')

    const request: google.maps.DirectionsRequest = {
      origin: this.createLocation(origin),
      destination: this.createLocation(destination),
      travelMode: (options.travelMode || 'DRIVING') as google.maps.TravelMode,
      avoidTolls: options.avoidTolls || false,
      avoidHighways: options.avoidHighways || false,
      avoidFerries: options.avoidFerries || false,
      provideRouteAlternatives: options.provideRouteAlternatives || false,
    }

    if (options.waypoints && options.waypoints.length > 0) {
      request.waypoints = options.waypoints.map(wp => ({
        location: this.createLocation(wp),
        stopover: true,
      }))
    }

    if (options.drivingOptions) {
      request.drivingOptions = {
        departureTime: options.drivingOptions.departureTime,
        trafficModel: options.drivingOptions.trafficModel,
      }
    }

    return new Promise((resolve, reject) => {
      this.directionsService!.route(request, (result: any, status: any) => {
        if (status === 'OK' && result) {
          const routes = result.routes.map((route: google.maps.DirectionsRoute) => this.parseRoute(route))
          resolve({
            routes,
            alternatives: [],
            geocodedWaypoints: result.geocoded_waypoints || [],
          })
        } else {
          reject(new Error(`Route calculation failed: ${status}`))
        }
      })
    })
  }

  private createLocation(location: { lat: number; lng: number } | string): google.maps.LatLng | string {
    if (typeof location === 'string') return location
    return new google.maps.LatLng(location.lat, location.lng)
  }

  private parseRoute(route: google.maps.DirectionsRoute): RouteInfo {
    const leg = route.legs[0]
    return {
      distance: {
        text: leg.distance?.text || '',
        value: leg.distance?.value || 0,
      },
      duration: {
        text: leg.duration?.text || '',
        value: leg.duration?.value || 0,
      },
      durationInTraffic: leg.duration_in_traffic ? {
        text: leg.duration_in_traffic.text || '',
        value: leg.duration_in_traffic.value || 0,
      } : undefined,
      polyline: (() => {
        const overviewPolyline = (route as any).overview_polyline
        return typeof overviewPolyline === 'string'
          ? overviewPolyline
          : overviewPolyline?.points || ''
      })(),
      summary: route.summary || '',
      waypointOrder: route.waypoint_order || [],
      legs: route.legs.map((leg: google.maps.DirectionsLeg) => ({
        distance: {
          text: leg.distance?.text || '',
          value: leg.distance?.value || 0,
        },
        duration: {
          text: leg.duration?.text || '',
          value: leg.duration?.value || 0,
        },
        startAddress: leg.start_address || '',
        endAddress: leg.end_address || '',
        steps: (leg.steps || []).map((step: google.maps.DirectionsStep) => ({
          distance: {
            text: step.distance?.text || '',
            value: step.distance?.value || 0,
          },
          duration: {
            text: step.duration?.text || '',
            value: step.duration?.value || 0,
          },
          instructions: step.instructions || '',
          travelMode: step.travel_mode || '',
        })),
      })),
    }
  }

  async getDistanceMatrix(
    origins: (string | { lat: number; lng: number })[],
    destinations: (string | { lat: number; lng: number })[],
    options: {
      travelMode?: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT'
      avoidTolls?: boolean
      avoidHighways?: boolean
      avoidFerries?: boolean
      departureTime?: Date
    } = {}
  ): Promise<{
    originAddresses: string[]
    destinationAddresses: string[]
    rows: {
      elements: {
        status: string
        distance: { text: string; value: number }
        duration: { text: string; value: number }
        durationInTraffic?: { text: string; value: number }
      }[]
    }[]
  }> {
    await this.loadMaps()
    if (!this.distanceMatrixService) throw new Error('Distance matrix service not initialized')

    const request: google.maps.DistanceMatrixRequest & { departureTime?: Date | number } = {
      origins: origins.map(o => this.createLocation(o)),
      destinations: destinations.map(d => this.createLocation(d)),
      travelMode: (options.travelMode || 'DRIVING') as google.maps.TravelMode,
      avoidTolls: options.avoidTolls || false,
      avoidHighways: options.avoidHighways || false,
      avoidFerries: options.avoidFerries || false,
      unitSystem: google.maps.UnitSystem.METRIC,
    }

    if (options.departureTime) {
      request.departureTime = options.departureTime
    }

    return new Promise((resolve, reject) => {
      this.distanceMatrixService!.getDistanceMatrix(request, (response: any, status: any) => {
        if (status === 'OK' && response) {
          resolve({
            originAddresses: response.originAddresses || [],
            destinationAddresses: response.destinationAddresses || [],
            rows: response.rows.map((row: google.maps.DistanceMatrixResponseRow) => ({
              elements: row.elements.map((element: google.maps.DistanceMatrixResponseElement) => ({
                status: element.status || '',
                distance: {
                  text: element.distance?.text || '',
                  value: element.distance?.value || 0,
                },
                duration: {
                  text: element.duration?.text || '',
                  value: element.duration?.value || 0,
                },
                durationInTraffic: element.duration_in_traffic ? {
                  text: element.duration_in_traffic.text || '',
                  value: element.duration_in_traffic.value || 0,
                } : undefined,
              })),
            })),
          })
        } else {
          reject(new Error(`Distance matrix failed: ${status}`))
        }
      })
    })
  }

  async getPlaceDetails(placeId: string): Promise<LocationDetails> {
    await this.loadMaps()
    if (!this.placesService) throw new Error('Places service not initialized')

    return new Promise((resolve, reject) => {
      this.placesService!.getDetails(
        {
          placeId,
          fields: [
            'address_components',
            'formatted_address',
            'geometry',
            'place_id',
            'name',
            'utc_offset',
            'timezone',
          ],
        },
        (place: any, status: any) => {
          if (status === 'OK' && place) {
            const details = this.parsePlaceDetails(place)
            resolve(details)
          } else {
            reject(new Error(`Place details failed: ${status}`))
          }
        }
      )
    })
  }

  private parsePlaceDetails(place: google.maps.places.PlaceResult): LocationDetails {
    const components = place.address_components || []

    const getComponent = (types: string[]): string =>
      components.find((c: google.maps.GeocoderAddressComponent) => types.some(t => c.types.includes(t)))?.long_name || ''

    return {
      formattedAddress: place.formatted_address || '',
      latitude: place.geometry?.location?.lat() || 0,
      longitude: place.geometry?.location?.lng() || 0,
      placeId: place.place_id || '',
      city: getComponent(['locality', 'administrative_area_level_2']),
      state: getComponent(['administrative_area_level_1']),
      zipCode: getComponent(['postal_code']),
      country: getComponent(['country']),
      addressComponents: {
        street: getComponent(['route']),
        streetNumber: getComponent(['street_number']),
        route: getComponent(['route']),
        locality: getComponent(['locality']),
        administrativeAreaLevel1: getComponent(['administrative_area_level_1']),
        administrativeAreaLevel2: getComponent(['administrative_area_level_2']),
        postalCode: getComponent(['postal_code']),
        country: getComponent(['country']),
      },
      timezone: place.utc_offset !== undefined ? `UTC${place.utc_offset >= 0 ? '+' : ''}${place.utc_offset}` : undefined,
      utcOffset: place.utc_offset,
    }
  }

  async getAddressSuggestions(input: string): Promise<{
    predictions: google.maps.places.AutocompletePrediction[]
    sessionToken: google.maps.places.AutocompleteSessionToken
  }> {
    await this.loadMaps()
    if (!window.google?.maps?.places) throw new Error('Places service not initialized')

    const autocompleteService = new google.maps.places.AutocompleteService()
    const sessionToken = new google.maps.places.AutocompleteSessionToken()

    return new Promise((resolve, reject) => {
      autocompleteService.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: 'in' },
          sessionToken,
          types: ['geocode', 'establishment'],
        },
        (predictions: any, status: any) => {
          if (status === 'OK' && predictions) {
            resolve({ predictions, sessionToken })
          } else {
            reject(new Error(`Autocomplete failed: ${status}`))
          }
        }
      )
    })
  }
}

/* ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================ */

const generateLoadNumber = () => {
  const prefix = 'LDN'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

const datetimeLocalToISO = (datetimeLocal: string): string => {
  if (!datetimeLocal) return ''
  return new Date(datetimeLocal).toISOString()
}

const isoToDatetimeLocal = (isoString: string): string => {
  if (!isoString) return ''
  return new Date(isoString).toISOString().slice(0, 16)
}

const getCurrentDatetimeLocal = () => {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

const parseTatDays = (tatValue?: string): number | null => {
  const normalizedTat = tatValue?.trim()
  if (!normalizedTat) return null

  const tatDays = Number(normalizedTat)
  if (!Number.isFinite(tatDays) || tatDays <= 0) return null

  return tatDays
}

const calculateDeliveryDatetimeLocal = (pickupDate: string, tatValue?: string): string => {
  if (!pickupDate) return ''

  const tatDays = parseTatDays(tatValue)
  if (!tatDays) return ''

  const pickup = new Date(pickupDate)
  if (Number.isNaN(pickup.getTime())) return ''

  return new Date(pickup.getTime() + tatDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDuration = (hours: number): string => {
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} min${minutes > 1 ? 's' : ''}`
  }
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h} hour${h > 1 ? 's' : ''}`
  return `${h}h ${m}m`
}

const MAX_ATTACHMENT_SIZE_MB = 10
const MAX_ATTACHMENTS = 5
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'

/* ============================================================================
 * CUSTOM HOOKS
 * ============================================================================ */

function useMasterOptions(open: boolean) {
  const [materials, setMaterials] = useState<any>([])
  const [vehicleTypes, setVehicleTypes] = useState<any>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const fetchOptions = async () => {
      setIsLoading(true)
      try {
        const [materialData, vehicleData] = await Promise.all([
          mastersService.listByGroupCode('PRODUCTS'),
          mastersService.listByGroupCode('VEHICLES'),
        ])

        setMaterials(
          materialData.length > 0
            ? materialData.map((item) => ({
              value: item.value?.trim() || item.name,
              label: item.name,
            }))
            : [{ value: 'General Cargo', label: 'General Cargo' }]
        )

        setVehicleTypes(
          vehicleData.length > 0
            ? vehicleData.map((item) => ({
              value: item.value?.trim() || item.name,
              label: item.name,
            }))
            : [{ value: 'Truck', label: 'Truck' }]
        )
      } catch (error) {
        console.error('Failed to load master options', error)
        setMaterials([{ value: 'General Cargo', label: 'General Cargo' }])
        setVehicleTypes([{ value: 'Truck', label: 'Truck' }])
      } finally {
        setIsLoading(false)
      }
    }

    fetchOptions()
  }, [open])

  return { materials, vehicleTypes, isLoading }
}

// FIXED: Correct location logic for outbound/inbound
function useBranches(open: boolean, loadDirection: 'outbound' | 'inbound') {
  const [companyBranches, setCompanyBranches] = useState<Branch[]>([])
  const [customerLocations, setCustomerLocations] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchBranches = useCallback(async () => {
    setIsLoading(true)
    try {
      const [companyResult, customerResult] = await Promise.all([
        branchesService.list({ limit: 100, status: 'active', branchType: 'company' }),
        branchesService.list({ limit: 100, status: 'active', branchType: 'customer' }),
      ])

      setCompanyBranches(companyResult.branches || [])
      setCustomerLocations(customerResult.branches || [])
    } catch (error) {
      console.error('Failed to load branches', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchBranches()
    }
  }, [open, fetchBranches])

  const companyLocationOptions = React.useMemo(
    () => companyBranches.map(branchToLocation),
    [companyBranches]
  )
  const customerLocationOptions = React.useMemo(
    () => customerLocations.map(branchToLocation),
    [customerLocations]
  )

  // CORRECTED LOGIC:
  // For OUTBOUND: Pickup = Company, Delivery = Customer
  // For INBOUND: Pickup = Customer, Delivery = Company
  const pickupLocations: LocationOption[] = loadDirection === 'outbound'
    ? companyLocationOptions  // Outbound: pickup from company
    : customerLocationOptions  // Inbound: pickup from customer

  const deliveryLocations: LocationOption[] = loadDirection === 'outbound'
    ? customerLocationOptions  // Outbound: delivery to customer
    : companyLocationOptions   // Inbound: delivery to company

  return { pickupLocations, deliveryLocations, isLoading, refetchBranches: fetchBranches }
}

function branchToLocation(branch: Branch): LocationOption {
  return {
    id: branch._id,
    label: branch.name,
    address: branch.address?.line1 || '',
    city: branch.address?.city || '',
    state: branch.address?.state || '',
    zipCode: branch.address?.pincode || '',
    contactPerson: branch.contactPerson?.name || branch.managerName,
    phone: branch.contactPerson?.phone || branch.phone,
    email: branch.contactPerson?.email || branch.email,
    latitude: branch.address?.latitude,
    longitude: branch.address?.longitude,
    placeId: branch.address?.placeId,
  }
}

const getFlowContent = (loadDirection: LoadDirection) => {
  const isOutbound = loadDirection === 'outbound'

  return {
    directionLabel: isOutbound ? 'Outbound' : 'Inbound',
    directionHint: isOutbound
      ? 'Pickup from your branch/plant → Delivery to customer location'
      : 'Pickup from customer/supplier → Delivery to your branch/plant',
    pickupTitle: isOutbound ? 'Pickup Branch / Plant' : 'Pickup Customer / Supplier',
    pickupPlaceholder: isOutbound ? 'Select owner branch or plant' : 'Select customer or supplier pickup',
    pickupAddLabel: isOutbound ? 'Add company branch / plant' : 'Add customer / supplier address',
    pickupAddSuccess: isOutbound ? 'company branch' : 'customer location',
    deliveryTitle: isOutbound ? 'Delivery Customer Location' : 'Delivery Branch / Plant',
    deliveryPlaceholder: isOutbound ? 'Select customer delivery address' : 'Select owner branch or plant',
    deliveryAddLabel: isOutbound ? 'Add customer delivery address' : 'Add company branch / plant',
    deliveryAddSuccess: isOutbound ? 'customer location' : 'company branch',
    // Direction-based: company branches use dropdowns, customer addresses use autocompleting textboxes
    pickupUsesDropdown: isOutbound,
    deliveryUsesDropdown: !isOutbound,
  }
}

function useTransporters(open: boolean, userRole: string | undefined) {
  const [transporters, setTransporters] = useState<Array<{ _id: string; name: string; companyName?: string; groupId?: string }>>([])
  const [transporterGroups, setTransporterGroups] = useState<Array<{ value: string; label: string; transporterIds: string[] }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchTransporters = useCallback(async () => {
    const canSeeTransporters = ['company_admin', 'super_admin'].includes(userRole || '')
    if (!canSeeTransporters) return

    setIsLoading(true)
    try {
      const [transporterData, groupData] = await Promise.all([
        listAdminTransporters(),
        mastersService.listByGroupCode('TRANSPORTER_GROUP'),
      ])

      setTransporters(transporterData)

      const groups = groupData.map((group) => ({
        value: `group_${group._id}`,
        label: `📦 ${group.name} (Group)`,
        transporterIds: group.description ? group.description.split(',') : [],
      }))

      setTransporterGroups(groups)
    } catch (error) {
      console.error('Failed to load transporters', error)
    } finally {
      setIsLoading(false)
    }
  }, [userRole])

  useEffect(() => {
    if (!open) return
    fetchTransporters()
  }, [open, fetchTransporters])

  return { transporters, transporterGroups, isLoading, refetchTransporters: fetchTransporters }
}

function useGoogleMaps(open: boolean) {
  const [isMapsReady, setIsMapsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleMapsService = GoogleMapsService.getInstance()

  useEffect(() => {
    if (!open) return

    const loadMaps = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await googleMapsService.loadMaps()
        setIsMapsReady(true)
      } catch (err: any) {
        setError(err.message || 'Failed to load Google Maps')
        console.error('Google Maps loading error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadMaps()
  }, [open, googleMapsService])

  return {
    isMapsReady,
    isLoading,
    error,
    googleMapsService,
  }
}

// Attachments field component
function AttachmentsField({
  files,
  existingFiles = [],
  onFilesChange,
  onExistingFilesChange,
  disabled,
}: {
  files: File[]
  existingFiles?: ExistingAttachment[]
  onFilesChange: (files: File[]) => void
  onExistingFilesChange?: (files: ExistingAttachment[]) => void
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const addFiles = React.useCallback(
    (incoming: FileList | File[]) => {
      setError(null)
      const incomingArray = Array.from(incoming)
      const tooBig = incomingArray.find((file) => file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024)
      if (tooBig) {
        setError(`"${tooBig.name}" exceeds the ${MAX_ATTACHMENT_SIZE_MB}MB limit`)
        return
      }
      const combined = [...files, ...incomingArray]
      if (combined.length > MAX_ATTACHMENTS) {
        setError(`You can attach up to ${MAX_ATTACHMENTS} files`)
        return
      }
      onFilesChange(combined)
    },
    [files, onFilesChange]
  )

  const handleRemove = React.useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index))
    },
    [files, onFilesChange]
  )

  const handleExistingRemove = React.useCallback(
    (index: number) => {
      onExistingFilesChange?.(existingFiles.filter((_, i) => i !== index))
    },
    [existingFiles, onExistingFilesChange]
  )

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (disabled) return
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-1.5 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <Paperclip className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[10px] text-slate-600">
          <span className="font-medium text-primary">Click to upload</span> or drag files <br />
          PDF, JPG, PNG, DOC, XLS • Max {MAX_ATTACHMENT_SIZE_MB}MB • Up to {MAX_ATTACHMENTS} files
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {(existingFiles.length > 0 || files.length > 0) && (
        <ul className="space-y-1">
          {existingFiles.map((file, index) => (
            <li
              key={`${file.url || file.name || index}-existing-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Paperclip className="h-3 w-3 flex-shrink-0 text-slate-400" />
                <span className="truncate text-[10px] text-slate-700">{file.name || `Attachment ${index + 1}`}</span>
                <span className="flex-shrink-0 text-[9px] text-slate-400">
                  {file.size ? formatFileSize(file.size) : 'Uploaded'}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleExistingRemove(index)
                }}
                disabled={disabled}
                className="flex-shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                title="Remove uploaded document"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Paperclip className="h-3 w-3 flex-shrink-0 text-slate-400" />
                <span className="truncate text-[10px] text-slate-700">{file.name}</span>
                <span className="flex-shrink-0 text-[9px] text-slate-400">{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                disabled={disabled}
                className="flex-shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Route Calculator Component
function RouteCalculator({
  pickupLocation,
  deliveryLocation,
  onRouteCalculated,
  open,
  storedRouteData,
}: {
  pickupLocation: LocationOption | null
  deliveryLocation: LocationOption | null
  onRouteCalculated: (routeData: any) => void
  open: boolean
  storedRouteData?: {
    distanceKm?: number
    durationHours?: number
    routeSummary?: string
  } | null
}) {
  const { toast } = useToast()
  const [isCalculating, setIsCalculating] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number
    durationHours: number
    routeSummary?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const googleMapsService = GoogleMapsService.getInstance()
  const lastRequestKeyRef = useRef<string | null>(null)
  const calculationTimeoutRef = useRef<any | null>(null)

  const getCoordinates = useCallback(async (location: LocationOption): Promise<{ lat: number; lng: number } | null> => {
    try {
      if (location.latitude && location.longitude) {
        return { lat: location.latitude, lng: location.longitude }
      }

      const addressString = location.address || `${location.label}`
      if (!addressString.trim()) {
        return null
      }

      const geocoded = await googleMapsService.geocodeAddress(addressString)
      return { lat: geocoded.latitude, lng: geocoded.longitude }
    } catch (error) {
      return null
    }
  }, [googleMapsService])

  const calculateRoute = useCallback(async () => {
    if (!pickupLocation || !deliveryLocation) {
      setRouteInfo(null)
      setError(null)
      onRouteCalculated(null)
      return
    }

    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current)
    }

    setIsCalculating(true)
    setError(null)

    try {
      const pickupCoords = await getCoordinates(pickupLocation)
      const deliveryCoords = await getCoordinates(deliveryLocation)

      if (!pickupCoords || !deliveryCoords) {
        throw new Error('Could not get coordinates for one or both locations')
      }

      const routeResult = await googleMapsService.getRoute(pickupCoords, deliveryCoords, {
        travelMode: 'DRIVING',
        provideRouteAlternatives: false,
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      })

      if (!routeResult.routes || routeResult.routes.length === 0) {
        throw new Error('No routes found')
      }

      const primaryRoute = routeResult.routes[0]
      const distanceKm = primaryRoute.distance.value / 1000
      const durationHours = primaryRoute.duration.value / 3600

      const routeData = {
        distanceKm,
        durationHours,
        routeSummary: primaryRoute.summary || '',
      }

      setRouteInfo(routeData)
      setError(null)
      onRouteCalculated(routeData)

      toast({
        title: 'Route Calculated',
        description: `Distance: ${distanceKm.toFixed(1)} km, Duration: ${formatDuration(durationHours)}`,
      })
    } catch (error: any) {
      console.error('Route calculation error:', error)
      const errorMessage = error.message || 'Could not calculate route'
      setError(errorMessage)
      setRouteInfo(null)
      onRouteCalculated(null)

      calculationTimeoutRef.current = setTimeout(() => {
        toast({
          title: 'Route Calculation Failed',
          description: errorMessage,
          variant: 'destructive',
        })
      }, 100)
    } finally {
      setIsCalculating(false)
    }
  }, [pickupLocation, deliveryLocation, googleMapsService, toast, onRouteCalculated, getCoordinates])

  useEffect(() => {
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (storedRouteData?.distanceKm !== undefined && storedRouteData?.durationHours !== undefined) {
      const savedRouteData = {
        distanceKm: storedRouteData.distanceKm,
        durationHours: storedRouteData.durationHours,
        routeSummary: storedRouteData.routeSummary || '',
      }
      setRouteInfo(savedRouteData)
      setError(null)
      onRouteCalculated(savedRouteData)
      lastRequestKeyRef.current = 'stored-route-data'
      return
    }

    if (!open || !pickupLocation || !deliveryLocation) {
      if (!pickupLocation || !deliveryLocation) {
        setRouteInfo(null)
        setError(null)
        onRouteCalculated(null)
      }
      return
    }

    const requestKey = JSON.stringify({
      pickupId: pickupLocation.id,
      pickupAddress: pickupLocation.address || pickupLocation.label,
      deliveryId: deliveryLocation.id,
      deliveryAddress: deliveryLocation.address || deliveryLocation.label,
    })

    if (lastRequestKeyRef.current === requestKey) {
      return
    }

    lastRequestKeyRef.current = requestKey

    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current)
    }

    calculationTimeoutRef.current = setTimeout(() => {
      calculateRoute()
    }, 500)

    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current)
      }
    }
  }, [open, pickupLocation, deliveryLocation, calculateRoute, onRouteCalculated, storedRouteData])

  useEffect(() => {
    if (!open) {
      lastRequestKeyRef.current = null
      setRouteInfo(null)
      setError(null)
      onRouteCalculated(null)
    }
  }, [open, onRouteCalculated])

  if (!open) return null

  return (
    <div className="mt-2">
      {isCalculating ? (
        <div className="flex items-center justify-center py-3 bg-blue-50 rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-blue-600">Calculating route...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-3 bg-red-50 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      ) : routeInfo ? (
        <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 rounded-md">
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-500">Distance</span>
            <span className="text-base font-semibold text-slate-900">
              {routeInfo.distanceKm.toFixed(1)} km
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-slate-500">Duration</span>
            <span className="text-base font-semibold text-slate-900">
              {formatDuration(routeInfo.durationHours)}
            </span>
          </div>
          {routeInfo.routeSummary && (
            <div className="flex flex-col items-center col-span-1">
              <span className="text-xs text-slate-500">Route</span>
              <span className="text-xs font-medium text-slate-700 truncate max-w-full">
                {routeInfo.routeSummary}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 bg-slate-50 rounded-md">
          <MapPin className="h-4 w-4 text-slate-400 mr-2" />
          <span className="text-xs text-slate-500">
            {pickupLocation && deliveryLocation
              ? 'Click "Create Load" to calculate route'
              : 'Select both pickup and delivery locations'}
          </span>
        </div>
      )}
    </div>
  )
}

/* ============================================================================
 * MAIN COMPONENT
 * ============================================================================ */

export function CreateLoadModal({
  open,
  onOpenChange,
  mode = 'create',
  initialData,
  loadId,
  onSuccess,
}: CreateLoadModalProps) {
  // ====== HOOKS & STATE ======
  const { toast } = useToast();
  const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(initialData?.existingAttachments || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState({
    pickup: false,
    delivery: false,
    group: false,
  });
  const [routeData, setRouteData] = useState<any>(null);
  const initialDataKeyRef = useRef<string | null>(null);

  const user = useSelector((state: any) => state.auth.user);
  const hasGeneralCreate = user ? hasPermission(user, 'load.create') : false;
  const hasGeneralUpdate = user ? hasPermission(user, 'load.update') : false;

  const team = user?.team;

  const canCreateOutbound = user
    ? ((!team || team === 'general' || team === 'outbound') && (hasGeneralCreate || hasGeneralUpdate || hasPermission(user, 'outbound.create') || hasPermission(user, 'outbound.update')))
    : false;
  const canCreateInbound = user
    ? ((!team || team === 'general' || team === 'inbound') && (hasGeneralCreate || hasGeneralUpdate || hasPermission(user, 'inbound.create') || hasPermission(user, 'inbound.update')))
    : false;

  const canSubmitLoad = user
    ? (mode === 'edit'
        ? (hasGeneralUpdate || 
           ((!team || team === 'general' || team === 'outbound') && hasPermission(user, 'outbound.update')) || 
           ((!team || team === 'general' || team === 'inbound') && hasPermission(user, 'inbound.update')))
        : (hasGeneralCreate || 
           ((!team || team === 'general' || team === 'outbound') && hasPermission(user, 'outbound.create')) || 
           ((!team || team === 'general' || team === 'inbound') && hasPermission(user, 'inbound.create'))))
    : false;

  const hasBothDirections = !team || team === 'general' ? (canCreateOutbound && canCreateInbound) : false;
  const hasOnlyOutbound = team === 'outbound' ? true : (team === 'inbound' ? false : (canCreateOutbound && !canCreateInbound));
  const hasOnlyInbound = team === 'inbound' ? true : (team === 'outbound' ? false : (!canCreateOutbound && canCreateInbound));

  const defaultLoadDirection = (team && team !== 'general') ? team : (hasOnlyOutbound ? 'outbound' : hasOnlyInbound ? 'inbound' : 'outbound');

  // ====== API & STORE HOOKS ======
  const { createLoad, updateLoad } = useLoadStore();
  const { isMapsReady, isLoading: mapsLoading, error: mapsError, googleMapsService } = useGoogleMaps(open);
  const { materials, vehicleTypes, isLoading: masterLoading } = useMasterOptions(open);
  const {
    transporters,
    transporterGroups,
    isLoading: transportersLoading,
    refetchTransporters
  } = useTransporters(open, user?.role);

  const [pickupLocationDetails, setPickupLocationDetails] = useState<LocationOption | null>(null);
  const [deliveryLocationDetails, setDeliveryLocationDetails] = useState<LocationOption | null>(null);

  // ====== FORM CONFIGURATION ======
  const defaultValues = useMemo(
    () => (d?: typeof initialData): LoadFormData => ({
      loadNumber: d?.loadNumber || generateLoadNumber(),
      loadDirection: d?.loadDirection || defaultLoadDirection,
      isPublic: d?.isPublic ?? true,
      allowedTransporters: d?.allowedTransporters || [],
      material: d?.material || '',
      vehicleType: d?.vehicleType || '',
      numberOfVehicles: d?.numberOfVehicles || 1,
      estimatedWeight: d?.estimatedWeight,
      pickupLocationId: d?.pickupLocationId || '',
      pickupDate: d?.pickupDate ? isoToDatetimeLocal(d.pickupDate) : '',
      pickupAddressText: d?.pickupAddressText || '',
      pickupLocationDetails: d?.pickupLocationDetails || undefined,
      deliveryLocationId: d?.deliveryLocationId || '',
      deliveryDate: d?.deliveryDate ? isoToDatetimeLocal(d.deliveryDate) : '',
      deliveryAddressText: d?.deliveryAddressText || '',
      deliveryLocationDetails: d?.deliveryLocationDetails || undefined,
      tat: d?.tat || '',
      dpNum: d?.dpNum || '',
      notes: d?.notes || '',
      attachments: d?.attachments || [],
      routeOptimization: d?.routeOptimization || false,
      preferredRoute: d?.preferredRoute || 'fastest',
      avoidTolls: d?.avoidTolls || false,
      avoidHighways: d?.avoidHighways || false,
      avoidFerries: d?.avoidFerries || false,
      maxRouteAlternatives: d?.maxRouteAlternatives || 3,
    }),
    [defaultLoadDirection]
  );

  const form = useForm<LoadFormData>({
    defaultValues: defaultValues(initialData),
  });

  // ====== HELPER FUNCTIONS ======
  const parseAddressText = useCallback((text: string): LocationOption => {
    if (!text?.trim()) {
      return {
        id: '',
        label: 'Custom Address',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        contactPerson: '',
        phone: '',
        email: '',
        latitude: 0,
        longitude: 0,
        placeId: '',
      }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    const fullAddress = lines.join(', ')

    // Try to extract city, state, zipCode from comma-separated parts
    const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean)
    let city = ''
    let state = ''
    let zipCode = ''

    const pinRegex = /\b\d{6}\b/
    const zipRegex = /\b\d{5}\b/
    
    let tempParts = [...parts]
    
    for (let i = tempParts.length - 1; i >= 0; i--) {
      const part = tempParts[i]
      const match = part.match(pinRegex) || part.match(zipRegex)
      if (match) {
        zipCode = match[0]
        if (part === zipCode) {
          tempParts.splice(i, 1)
        } else {
          tempParts[i] = part.replace(zipCode, '').trim().replace(/^[,\s-]+|[,\s-]+$/g, '')
        }
        break
      }
    }

    tempParts = tempParts.filter(Boolean)

    if (tempParts.length >= 1) {
      state = tempParts[tempParts.length - 1].replace(/^[,\s-]+|[,\s-]+$/g, '')
    }

    if (tempParts.length >= 2) {
      city = tempParts[tempParts.length - 2].replace(/^[,\s-]+|[,\s-]+$/g, '')
    }

    if (!city && tempParts.length === 1) {
      city = tempParts[0]
    }

    return {
      id: '',
      label: 'Custom Address',
      address: fullAddress,
      city: city || 'Unknown City',
      state: state || 'Unknown State',
      zipCode: zipCode || '',
      contactPerson: '',
      phone: '',
      email: '',
      latitude: 0,
      longitude: 0,
      placeId: '',
    }
  }, [])

  // ====== WATCHED VALUES ======
  const [loadDirection, pickupLocationId, deliveryLocationId, isPublic, pickupDate, tat, pickupAddressText, deliveryAddressText] = form.watch([
    'loadDirection',
    'pickupLocationId',
    'deliveryLocationId',
    'isPublic',
    'pickupDate',
    'tat',
    'pickupAddressText',
    'deliveryAddressText',
  ]);

  const {
    pickupLocations,
    deliveryLocations,
    isLoading: locationsLoading,
    refetchBranches
  } = useBranches(open, loadDirection);

  const flowContent = getFlowContent(loadDirection);

  // ====== DERIVED DATA ======
  // For pickup: If pickupUsesDropdown is true, use dropdown selection; otherwise use text input
  const selectedPickup = useMemo(() => {
    if (flowContent.pickupUsesDropdown) {
      // Outbound: pickup uses dropdown
      return pickupLocations.find((loc) => loc.id === pickupLocationId) || null;
    } else {
      // Inbound: pickup uses text input
      if (pickupLocationDetails) {
        return pickupLocationDetails;
      }
      if (pickupAddressText?.trim()) {
        return parseAddressText(pickupAddressText);
      }
      return null;
    }
  }, [pickupLocations, pickupLocationId, pickupAddressText, pickupLocationDetails, flowContent.pickupUsesDropdown, parseAddressText]);

  // For delivery: If deliveryUsesDropdown is true, use dropdown selection; otherwise use text input
  const selectedDelivery = useMemo(() => {
    if (flowContent.deliveryUsesDropdown) {
      // Inbound: delivery uses dropdown (company)
      if (deliveryLocations.length > 0 && deliveryLocationId) {
        return deliveryLocations.find((loc) => loc.id === deliveryLocationId) || null;
      }
      return null;
    } else {
      // Outbound: delivery uses text input (customer)
      if (deliveryLocationDetails) {
        return deliveryLocationDetails;
      }
      if (deliveryAddressText?.trim()) {
        return parseAddressText(deliveryAddressText);
      }
      return null;
    }
  }, [deliveryAddressText, deliveryLocations, deliveryLocationId, deliveryLocationDetails, flowContent.deliveryUsesDropdown, parseAddressText]);

  const transporterOptions = useMemo(() => {
    const individual = transporters.map((t) => ({
      value: t._id,
      label: t.companyName || t.name,
      type: 'individual' as const,
    }));

    const groups = transporterGroups.map((group) => ({
      value: group.value,
      label: group.label,
      type: 'group' as const,
      transporterIds: group.transporterIds,
    }));

    return [...groups, ...individual];
  }, [transporters, transporterGroups]);

  const isLoading = masterLoading || locationsLoading || transportersLoading || mapsLoading;
  const initialDataKey = useMemo(
    () =>
      JSON.stringify({
        mode,
        loadId: loadId || '',
        loadNumber: initialData?.loadNumber || '',
        loadDirection: initialData?.loadDirection || '',
        pickupLocationId: initialData?.pickupLocationId || '',
        pickupAddressText: initialData?.pickupAddressText || '',
        pickupDate: initialData?.pickupDate || '',
        deliveryLocationId: initialData?.deliveryLocationId || '',
        deliveryAddressText: initialData?.deliveryAddressText || '',
        deliveryDate: initialData?.deliveryDate || '',
        isPublic: initialData?.isPublic ?? true,
        allowedTransporters: initialData?.allowedTransporters || [],
        material: initialData?.material || '',
        vehicleType: initialData?.vehicleType || '',
        numberOfVehicles: initialData?.numberOfVehicles || 1,
        estimatedWeight: initialData?.estimatedWeight ?? null,
        tat: initialData?.tat || '',
        dpNum: initialData?.dpNum || '',
        notes: initialData?.notes || '',
        existingAttachments: initialData?.existingAttachments || [],
        routeData: initialData?.routeData || null,
      }),
    [initialData, loadId, mode]
  );

  // ====== EFFECTS ======
  useEffect(() => {
    if (!open) return;
    if (initialDataKeyRef.current === initialDataKey) return;

    initialDataKeyRef.current = initialDataKey;
    form.reset(defaultValues(initialData));
    setExistingAttachments(initialData?.existingAttachments || []);
    setRouteData(initialData?.routeData || null);
    
    // Initialize React details states from initialData
    setPickupLocationDetails(initialData?.pickupLocationDetails || null);
    setDeliveryLocationDetails(initialData?.deliveryLocationDetails || null);
  }, [open, initialData, initialDataKey, form, defaultValues]);

  useEffect(() => {
    if (open) return;
    initialDataKeyRef.current = null;
  }, [open]);

  useEffect(() => {
    if (materials.length > 0 && !form.getValues('material')) {
      form.setValue('material', materials[0].value);
    }
  }, [materials, form]);

  useEffect(() => {
    if (vehicleTypes.length > 0 && !form.getValues('vehicleType')) {
      form.setValue('vehicleType', vehicleTypes[0].value);
    }
  }, [vehicleTypes, form]);

  useEffect(() => {
    const subscription: any = form.watch((_, { name }: any) => {
      if (name === 'loadDirection') {
        form.setValue('pickupLocationId', '');
        form.setValue('pickupAddressText', '');
        form.setValue('deliveryLocationId', '');
        form.setValue('deliveryAddressText', '');
        setRouteData(null);
        setPickupLocationDetails(null);
        setDeliveryLocationDetails(null);
        setIsModalOpen({ pickup: false, delivery: false, group: false });
      }
    });
    return () => subscription?.unsubscribe();
  }, [form]);

  useEffect(() => {
    const calculatedDeliveryDate = calculateDeliveryDatetimeLocal(pickupDate, tat)
    const currentDeliveryDate = form.getValues('deliveryDate')

    if (calculatedDeliveryDate) {
      if (currentDeliveryDate !== calculatedDeliveryDate) {
        form.setValue('deliveryDate', calculatedDeliveryDate, {
          shouldDirty: false,
          shouldTouch: false,
        })
      }
      return
    }

    if (currentDeliveryDate) {
      form.setValue('deliveryDate', '', {
        shouldDirty: false,
        shouldTouch: false,
      })
    }
  }, [form, pickupDate, tat]);

  const handleTransporterChange = useCallback(
    (selectedValues: string | string[]) => {
      if (!Array.isArray(selectedValues)) return;

      const expandedIds = new Set<string>();
      selectedValues.forEach((value) => {
        if (value.startsWith('group_')) {
          const group = transporterGroups.find((g) => g.value === value);
          group?.transporterIds.forEach((id) => expandedIds.add(id));
        } else {
          expandedIds.add(value);
        }
      });
      form.setValue('allowedTransporters', Array.from(expandedIds));
    },
    [transporterGroups, form]
  );

  const addBranch = useCallback(
    async (location: LocationData, kind: 'pickup' | 'delivery') => {
      const currentDirection = form.getValues('loadDirection');
      // For pickup: if outbound, branchType is company; if inbound, branchType is customer
      // For delivery: if outbound, branchType is customer; if inbound, branchType is company
      let branchType: 'company' | 'customer';
      if (kind === 'pickup') {
        branchType = currentDirection === 'outbound' ? 'company' : 'customer';
      } else {
        branchType = currentDirection === 'outbound' ? 'customer' : 'company';
      }

      const newBranch = await branchesService.create({
        name: location.name,
        code: `BR-${Date.now().toString().slice(-6)}`,
        branchType,
        address: {
          line1: location.address,
          city: location.city,
          state: location.state,
          pincode: location.zipCode,
          latitude: location.latitude,
          longitude: location.longitude,
          placeId: location.placeId,
        },
        contactPerson: {
          name: location.contactPerson,
          phone: location.phone,
          email: location.email,
        },
        status: 'active',
      });

      await refetchBranches();
      return newBranch;
    },
    [form, refetchBranches]
  );

  const handleAddLocation = useCallback(
    async (location: LocationData, type: 'pickup' | 'delivery') => {
      try {
        const newBranch = await addBranch(location, type);

        if (type === 'pickup') {
          form.setValue('pickupLocationId', newBranch._id, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          form.setValue('pickupAddressText', '');
        } else {
          form.setValue('deliveryLocationId', newBranch._id, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
          form.setValue('deliveryAddressText', '');
        }

        const modalKey = type === 'pickup' ? 'pickup' : 'delivery';
        setIsModalOpen((prev) => ({ ...prev, [modalKey]: false }));

        toast({
          title: 'Success',
          description: `${type === 'pickup' ? flowContent.pickupAddSuccess : flowContent.deliveryAddSuccess} added successfully`,
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: getApiErrorMessage(
            error,
            `Failed to add ${type === 'pickup' ? flowContent.pickupAddSuccess : flowContent.deliveryAddSuccess}`
          ),
          variant: 'destructive',
        });
      }
    },
    [addBranch, flowContent.deliveryAddSuccess, flowContent.pickupAddSuccess, form, toast]
  );

  const handleClose = useCallback(() => {
    form.reset();
    setRouteData(null);
    onOpenChange(false);
  }, [form, onOpenChange]);

  // ====== VALIDATION & SUBMISSION ======

  const validateForm = useCallback(
    (data: LoadFormData): string[] => {
      const errors: string[] = [];
      if (!data.material?.trim()) errors.push('Product is required');
      if (!data.vehicleType) errors.push('Vehicle type is required');
      if (!data.numberOfVehicles || data.numberOfVehicles < 1) errors.push('Number of vehicles must be at least 1');

      // Pickup validation based on direction
      if (flowContent.pickupUsesDropdown) {
        // Outbound: pickup uses dropdown
        if (!data.pickupLocationId?.trim()) {
          errors.push('Pickup location is required');
        }
      } else {
        // Inbound: pickup uses text input
        if (!data.pickupAddressText?.trim()) {
          errors.push('Pickup address is required');
        }
      }

      if (!data.pickupDate) errors.push('Loading date is required');
      if (data.pickupDate && new Date(data.pickupDate).getTime() < Date.now()) {
        errors.push('Loading date cannot be in the past');
      }

      // Delivery validation based on direction
      if (flowContent.deliveryUsesDropdown) {
        // Inbound: delivery uses dropdown
        if (!data.deliveryLocationId?.trim()) {
          errors.push('Delivery location is required');
        }
      } else {
        // Outbound: delivery uses text input
        if (!data.deliveryAddressText?.trim()) {
          errors.push('Delivery address is required');
        }
      }

      if (!data.tat?.trim()) errors.push('TAT (Days) is required');
      if (data.tat?.trim() && !parseTatDays(data.tat)) {
        errors.push('TAT (Days) must be greater than 0');
      }

      if (!data.isPublic && data.allowedTransporters.length === 0) {
        errors.push('Select at least one transporter for private loads');
      }

      if (data.loadDirection === 'outbound' && !canCreateOutbound) {
        errors.push('You do not have permission to create Outbound loads');
      }
      if (data.loadDirection === 'inbound' && !canCreateInbound) {
        errors.push('You do not have permission to create Inbound loads');
      }

      return errors;
    },
    [canCreateOutbound, canCreateInbound, flowContent]
  );

  const locationDetailsToOption = useCallback((details: any): LocationOption => ({
    id: '',
    label: details.formattedAddress || 'Custom Address',
    address: details.formattedAddress || details.address || '',
    city: details.city || '',
    state: details.state || '',
    zipCode: details.zipCode || '',
    contactPerson: '',
    phone: '',
    email: '',
    latitude: details.lat || 0,
    longitude: details.lng || 0,
    placeId: details.placeId || '',
  }), []);

  const buildLocationPayload = useCallback(
    (location: any) => ({
      branchId: location.id || '',
      branchName: location.label || 'Custom Address',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
      contactPerson: location.contactPerson || '',
      phone: location.phone || '',
      email: location.email || '',
      latitude: location.latitude || 0,
      longitude: location.longitude || 0,
      placeId: location.placeId || '',
    }),
    []
  );

  const onSubmit = useCallback(
    async (data: LoadFormData) => {
      try {
        setIsSubmitting(true);

        const errors = validateForm(data);
        if (errors.length > 0) {
          toast({
            title: 'Validation Error',
            description: errors.join(', '),
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        if (data.loadDirection === 'outbound' && !canCreateOutbound) {
          toast({
            title: 'Permission Denied',
            description: 'You do not have permission to create Outbound loads',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        if (data.loadDirection === 'inbound' && !canCreateInbound) {
          toast({
            title: 'Permission Denied',
            description: 'You do not have permission to create Inbound loads',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        // Build pickup location based on direction
        let pickupLocation: LocationOption | null = null;
        if (flowContent.pickupUsesDropdown) {
          // Outbound: pickup from dropdown (company)
          if (data.pickupLocationId) {
            pickupLocation = pickupLocations.find((loc) => loc.id === data.pickupLocationId) || null;
          }
        } else {
          // Inbound: pickup from text input (customer)
          const details = pickupLocationDetails;
          const text = data.pickupAddressText || '';
          if (details && details.address?.trim().toLowerCase() === text.trim().toLowerCase()) {
            pickupLocation = details;
          } else if (text.trim()) {
            try {
              const geocoded = await googleMapsService.geocodeAddress(text);
              pickupLocation = locationDetailsToOption(geocoded);
            } catch (err) {
              console.warn('Geocoding pickup address failed, falling back to parsed text:', err);
              pickupLocation = parseAddressText(text);
            }
          }
        }

        // Build delivery location based on direction
        let deliveryLocation: LocationOption | null = null;
        if (flowContent.deliveryUsesDropdown) {
          // Inbound: delivery from dropdown (company)
          if (data.deliveryLocationId) {
            deliveryLocation = deliveryLocations.find((loc) => loc.id === data.deliveryLocationId) || null;
          }
        } else {
          // Outbound: delivery from text input (customer)
          const details = deliveryLocationDetails;
          const text = data.deliveryAddressText || '';
          if (details && details.address?.trim().toLowerCase() === text.trim().toLowerCase()) {
            deliveryLocation = details;
          } else if (text.trim()) {
            try {
              const geocoded = await googleMapsService.geocodeAddress(text);
              deliveryLocation = locationDetailsToOption(geocoded);
            } catch (err) {
              console.warn('Geocoding delivery address failed, falling back to parsed text:', err);
              deliveryLocation = parseAddressText(text);
            }
          }
        }

        if (!pickupLocation || !deliveryLocation) {
          toast({
            title: 'Error',
            description: 'Both pickup and delivery locations are required',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        const payload: CreateLoadPayload = {
          loadNumber: data.loadNumber,
          loadDirection: data.loadDirection,
          isPublic: data.isPublic,
          allowedTransporters: data.isPublic ? [] : data.allowedTransporters,
          material: data.material,
          vehicleType: data.vehicleType,
          numberOfVehicles: data.numberOfVehicles,
          estimatedWeight: data.estimatedWeight,
          pickupLocation: buildLocationPayload(pickupLocation),
          deliveryLocation: buildLocationPayload(deliveryLocation),
          pickupDate: datetimeLocalToISO(data.pickupDate),
          deliveryDate: datetimeLocalToISO(calculateDeliveryDatetimeLocal(data.pickupDate, data.tat)),
          tat: data.tat?.trim(),
          dpNum: data.dpNum,
          notes: data.notes,
          attachments: data.attachments || [],
          existingAttachments,
          routeOptimization: data.routeOptimization,
          preferredRoute: data.preferredRoute,
          avoidTolls: data.avoidTolls,
          avoidHighways: data.avoidHighways,
          avoidFerries: data.avoidFerries,
          maxRouteAlternatives: data.maxRouteAlternatives,
          routeData,
        };

        if (mode === 'edit') {
          if (!loadId) throw new Error('Missing load id for edit');
          const { loadNumber, ...updatePayload } = payload;
          await updateLoad(loadId, updatePayload).unwrap();
        } else {
          await createLoad(payload).unwrap();
        }

        toast({
          title: 'Success',
          description: `Load ${data.loadNumber} ${mode === 'edit' ? 'updated' : 'created'} successfully`,
        });

        form.reset();
        setRouteData(null);
        onOpenChange(false);
        onSuccess?.();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: getApiErrorMessage(error, 'Failed to process load'),
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validateForm,
      pickupLocations,
      deliveryLocations,
      buildLocationPayload,
      routeData,
      mode,
      loadId,
      createLoad,
      updateLoad,
      toast,
      form,
      onOpenChange,
      onSuccess,
      canCreateOutbound,
      canCreateInbound,
      parseAddressText,
      existingAttachments,
      flowContent,
    ]
  );

  // ====== PERMISSION CHECK ======
  if (!canSubmitLoad) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
            <DialogDescription>
              You don't have permission to {mode === 'edit' ? 'edit' : 'create'} loads.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // ====== RENDER ======
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : handleClose())}>
        <DialogContent
          className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0"
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target && (target.closest('.pac-container') || target.classList.contains('pac-item') || target.closest('.pac-item'))) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target && (target.closest('.pac-container') || target.classList.contains('pac-item') || target.closest('.pac-item'))) {
              e.preventDefault();
            }
          }}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Edit Load' : 'Create New Load'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-0.5">
              {flowContent.directionLabel}. {flowContent.directionHint}
              {mapsError && (
                <span className="ml-2 text-amber-600">⚠️ Maps unavailable</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Form */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Row 1: Core Details */}
                <div className={`grid ${(!team || team === 'general') ? 'grid-cols-5' : 'grid-cols-4'} gap-4`}>
                  <FormField
                    control={form.control}
                    name="loadNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Load # <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled
                            className="h-10 text-sm bg-slate-50"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {(!team || team === 'general') ? (
                    <FormField
                      control={form.control}
                      name="loadDirection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-700">
                            Direction <span className="text-red-500">*</span>
                          </FormLabel>
                          {hasBothDirections ? (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="outbound">Outbound</SelectItem>
                                <SelectItem value="inbound">Inbound</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="h-10 flex items-center px-3 bg-slate-50 border border-input rounded-md text-sm text-slate-600">
                              {field.value === 'outbound' ? 'Outbound' : 'Inbound'}
                              <input type="hidden" {...field} />
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  ) : (
                    <input type="hidden" {...form.register('loadDirection')} />
                  )}

                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Product <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={materials}
                            placeholder="Select product"
                            disabled={isLoading || isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Vehicle <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={vehicleTypes}
                            placeholder="Select vehicle"
                            disabled={isLoading || isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="numberOfVehicles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Vehicles <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            disabled={isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 2: Pickup Date & Pickup Location */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Loading Date <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
                          <FormControl>
                            <DateTimePicker
                              value={field.value}
                              onChange={field.onChange}
                              min={getCurrentDatetimeLocal()}
                              disabled={isSubmitting}
                              className="w-full"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pickup Location - Dynamic based on direction */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs font-medium text-slate-700">
                      {flowContent.pickupTitle} <span className="text-red-500">*</span>
                    </FormLabel>
                    
                    {flowContent.pickupUsesDropdown ? (
                      // OUTBOUND: Pickup uses dropdown (company branches)
                      <>
                        <FormField
                          control={form.control}
                          name="pickupLocationId"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex gap-2">
                                <FormControl>
                                  <SearchableSelect
                                    value={field.value}
                                    onChange={(value) => {
                                      field.onChange(value);
                                      if (value) {
                                        form.setValue('pickupAddressText', '');
                                      }
                                    }}
                                    options={pickupLocations.map((loc) => ({
                                      value: loc.id,
                                      label: `${loc.label} - ${loc.city || loc.address}`,
                                    }))}
                                    placeholder={isLoading ? 'Loading...' : flowContent.pickupPlaceholder}
                                    disabled={isLoading || isSubmitting}
                                    className="flex-1 h-10 text-sm"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 border-blue-300 hover:bg-blue-100"
                                  onClick={() =>
                                    setIsModalOpen((prev) => ({ ...prev, pickup: true }))
                                  }
                                  disabled={isSubmitting}
                                  title={flowContent.pickupAddLabel}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      // INBOUND: Pickup uses text input (customer/supplier)
                      <FormField
                        control={form.control}
                        name="pickupAddressText"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {isMapsReady ? (
                                <LocationAutocompleteSelect
                                  value={field.value}
                                  onChange={(val) => {
                                    field.onChange(val);
                                    if (val) {
                                      form.setValue('pickupLocationId', '');
                                    } else {
                                      setPickupLocationDetails(null);
                                    }
                                  }}
                                  onLocationSelect={(details) => {
                                    setPickupLocationDetails(locationDetailsToOption(details));
                                  }}
                                  placeholder="Enter custom pickup address..."
                                  disabled={isSubmitting}
                                  className="w-full"
                                />
                              ) : (
                                <Input
                                  placeholder="Paste or enter custom pickup address..."
                                  disabled={isSubmitting}
                                  className="w-full"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (e.target.value.trim()) {
                                      form.setValue('pickupLocationId', '');
                                    }
                                  }}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Row 3: Delivery Location & Route */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Delivery Location - Dynamic based on direction */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs font-medium text-slate-700">
                      {flowContent.deliveryTitle} <span className="text-red-500">*</span>
                    </FormLabel>
                    
                    {flowContent.deliveryUsesDropdown ? (
                      // INBOUND: Delivery uses dropdown (company branches)
                      <>
                        <FormField
                          control={form.control}
                          name="deliveryLocationId"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex gap-2">
                                <FormControl>
                                  <SearchableSelect
                                    value={field.value}
                                    onChange={(value) => {
                                      field.onChange(value);
                                      if (value) {
                                        form.setValue('deliveryAddressText', '');
                                      }
                                    }}
                                    options={deliveryLocations.map((loc) => ({
                                      value: loc.id,
                                      label: `${loc.label} - ${loc.city || loc.address}`,
                                    }))}
                                    placeholder={isLoading ? 'Loading...' : flowContent.deliveryPlaceholder}
                                    disabled={isLoading || isSubmitting}
                                    className="flex-1 h-10 text-sm"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 border-blue-300 hover:bg-blue-100"
                                  onClick={() =>
                                    setIsModalOpen((prev) => ({ ...prev, delivery: true }))
                                  }
                                  disabled={isSubmitting}
                                  title={flowContent.deliveryAddLabel}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      // OUTBOUND: Delivery uses text input (customer)
                      <FormField
                        control={form.control}
                        name="deliveryAddressText"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              {isMapsReady ? (
                                <LocationAutocompleteSelect
                                  value={field.value}
                                  onChange={(val) => {
                                    field.onChange(val);
                                    if (val) {
                                      form.setValue('deliveryLocationId', '');
                                    } else {
                                      setDeliveryLocationDetails(null);
                                    }
                                  }}
                                  onLocationSelect={(details) => {
                                    setDeliveryLocationDetails(locationDetailsToOption(details));
                                  }}
                                  placeholder="Enter custom delivery address..."
                                  disabled={isSubmitting}
                                  className="w-full"
                                />
                              ) : (
                                <Input
                                  placeholder="Paste or enter custom delivery address..."
                                  disabled={isSubmitting}
                                  className="w-full"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (e.target.value.trim()) {
                                      form.setValue('deliveryLocationId', '');
                                    }
                                  }}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Route Calculator */}
                  <div className="space-y-2">
                    <FormLabel className="text-xs font-medium text-slate-700">
                      Route Information
                    </FormLabel>
                    {isMapsReady ? (
                      <RouteCalculator
                        pickupLocation={selectedPickup}
                        deliveryLocation={selectedDelivery}
                        onRouteCalculated={setRouteData}
                        open={open}
                        storedRouteData={routeData}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-3 bg-slate-50 rounded-md">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mr-2" />
                        <span className="text-xs text-slate-500">Loading maps...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 4: Additional Details */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="estimatedWeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Weight (kg)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="Enter weight"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            disabled={isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          TAT (Days) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.01}
                            step={0.01}
                            placeholder="Enter TAT in days"
                            {...field}
                            disabled={isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dpNum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          DP Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="DP-XXX"
                            {...field}
                            disabled={isSubmitting}
                            className="h-10 text-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Row 5: Attachments & Visibility */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="attachments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-700">
                          Attachments
                        </FormLabel>
                        <FormControl>
                          <AttachmentsField
                            files={field.value || []}
                            existingFiles={existingAttachments}
                            onFilesChange={field.onChange}
                            onExistingFilesChange={setExistingAttachments}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormField
                      control={form.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex items-center">
                          <FormControl>
                            <Checkbox
                              id="isPublic"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormLabel htmlFor="isPublic" className="text-sm font-normal cursor-pointer px-2 m-0">
                            Public load
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {!isPublic && (
                      <FormField
                        control={form.control}
                        name="allowedTransporters"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormLabel className="text-xs font-medium text-slate-700">
                              Transporters <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <SearchableSelect
                                  value={field.value}
                                  onChange={handleTransporterChange}
                                  options={transporterOptions}
                                  placeholder="Select transporters/groups"
                                  disabled={isLoading || isSubmitting}
                                  multiple
                                  className="flex-1 h-10 text-sm"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0"
                                onClick={() =>
                                  setIsModalOpen((prev) => ({ ...prev, group: true }))
                                }
                                disabled={isLoading || isSubmitting}
                                title="Create group"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Row 6: Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-700">
                        Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes..."
                          rows={2}
                          {...field}
                          disabled={isSubmitting}
                          className="min-h-[60px] resize-none text-sm"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50/50 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 px-6 text-sm"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting || isLoading}
              className="h-10 px-8 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'edit' ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {mode === 'edit' ? 'Save Changes' : 'Create Load'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddLocationModal
        open={isModalOpen.pickup}
        onOpenChange={(open) =>
          setIsModalOpen((prev) => ({ ...prev, pickup: open }))
        }
        onSuccess={(location) => handleAddLocation(location, 'pickup')}
        locationType="pickup"
      />

      <AddLocationModal
        open={isModalOpen.delivery}
        onOpenChange={(open) =>
          setIsModalOpen((prev) => ({ ...prev, delivery: open }))
        }
        onSuccess={(location) => handleAddLocation(location, 'delivery')}
        locationType="delivery"
      />

      <CreateTransporterGroupModal
        open={isModalOpen.group}
        onOpenChange={(open) =>
          setIsModalOpen((prev) => ({ ...prev, group: open }))
        }
        transporters={transporters}
        onSuccess={refetchTransporters}
      />
    </>
  );
}