// components/load/AddLocationModal.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import {
  Loader2,
  MapPin,
  Building2,
  Phone,
  Mail,
  User,
  X,
  AlertCircle,
  Search,
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
import { useToast } from '@/components/ui/use-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type LocationData = {
  id: string
  name: string
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

interface AddLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (location: LocationData) => void
  locationType: 'pickup' | 'delivery'
  initialData?: LocationData
  mode?: 'create' | 'edit'
}

type LocationFormData = {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  // Not required by validation, but always initialized to '' in
  // defaultValues/form.reset — keeping these non-optional keeps the
  // RHF `field.value` type as `string` (not `string | undefined`),
  // which matches controlled <Input value={...}> typing.
  contactPerson: string
  phone: string
  email: string
}

// ---------------------------------------------------------------------------
// Google Maps loader (loads the script once, reused across mounts)
// ---------------------------------------------------------------------------
let googleMapsLoaderPromise: Promise<void> | null = null
const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script'
const GOOGLE_MAPS_LIBRARIES = 'places,geometry'

function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  // Already loaded
  if (window.google?.maps?.places) return Promise.resolve()

  if (googleMapsLoaderPromise) return googleMapsLoaderPromise

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
      return
    }

    const expectedSrc = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_LIBRARIES}&v=weekly`
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      if (window.google?.maps?.places) {
        resolve()
        return
      } else {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')))
        return
      }
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = expectedSrc
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

// ---------------------------------------------------------------------------
// Address component parsing (India-focused)
// ---------------------------------------------------------------------------
type ParsedAddress = {
  formattedAddress: string
  city: string
  state: string
  zipCode: string
  latitude?: number
  longitude?: number
  placeId?: string
}

function parsePlaceDetails(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || []

  const getComponent = (types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || ''

  // Indian addresses often use locality / sublocality for city, and
  // administrative_area_level_1 for state (e.g. Gujarat, Maharashtra)
  const city =
    getComponent(['locality']) ||
    getComponent(['administrative_area_level_2']) ||
    getComponent(['sublocality', 'sublocality_level_1']) ||
    ''

  const state = getComponent(['administrative_area_level_1'])
  const zipCode = getComponent(['postal_code'])

  return {
    formattedAddress: place.formatted_address || place.name || '',
    city,
    state,
    zipCode,
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
    placeId: place.place_id,
  }
}

export function AddLocationModal({
  open,
  onOpenChange,
  onSuccess,
  locationType,
  initialData,
  mode = 'create',
}: AddLocationModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const addressInputRef = useRef<HTMLInputElement>(null)
  const suggestionsBoxRef = useRef<HTMLDivElement>(null)

  // Google Places state
  const [mapsReady, setMapsReady] = useState(false)
  const [autocompleteUnavailable, setAutocompleteUnavailable] = useState(false)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [selectedPlaceMeta, setSelectedPlaceMeta] = useState<{
    latitude?: number
    longitude?: number
    placeId?: string
  }>({})

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm<LocationFormData>({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || '',
      contactPerson: initialData?.contactPerson || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
    },
  })

  // Load Google Maps script once the modal is opened
  useEffect(() => {
    if (!open) return
    let cancelled = false

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled) return
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
        // PlacesService needs a DOM node (it doesn't render anything visible)
        placesServiceRef.current = new google.maps.places.PlacesService(document.createElement('div'))
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
        setMapsReady(true)
        setAutocompleteUnavailable(false)
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err)
        setMapsReady(false)
        setAutocompleteUnavailable(true)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Reset form when initialData changes or modal opens
  useEffect(() => {
    if (open) {
      if (initialData && mode === 'edit') {
        form.reset({
          name: initialData.name || '',
          address: initialData.address || '',
          city: initialData.city || '',
          state: initialData.state || '',
          zipCode: initialData.zipCode || '',
          contactPerson: initialData.contactPerson || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
        })
        setAddressQuery(initialData.address || '')
        setSelectedPlaceMeta({
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          placeId: initialData.placeId,
        })
      } else {
        form.reset({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          contactPerson: '',
          phone: '',
          email: '',
        })
        setAddressQuery('')
        setSelectedPlaceMeta({})
      }
      setSuggestions([])
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      setAutocompleteUnavailable(false)
      // Reset dirty state when modal opens
      form.reset(form.getValues())
    }
  }, [open, initialData, mode, form])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        addressInputRef.current &&
        !addressInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback((query: string) => {
    if (!autocompleteServiceRef.current || query.trim().length < 3) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: 'in' }, // Restrict to India
        sessionToken: sessionTokenRef.current || undefined,
        types: ['geocode', 'establishment'],
      },
      (predictions, status) => {
        setIsSearching(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions)
          setShowSuggestions(true)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
          if (status && status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setAutocompleteUnavailable(true)
          }
        }
      }
    )
  }, [])

  // Handle manual address input change (debounced autocomplete)
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value
    setAddressQuery(nextValue)
    form.setValue('address', nextValue, { shouldDirty: true })
    setHighlightedIndex(-1)

    // Clear any previously selected place metadata once user edits manually
    setSelectedPlaceMeta({})

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!mapsReady || nextValue.trim().length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(nextValue)
    }, 300)
  }

  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return

    setIsFetchingDetails(true)
    setShowSuggestions(false)

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
        sessionToken: sessionTokenRef.current || undefined,
      },
      (place, status) => {
        setIsFetchingDetails(false)

        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          if (status) {
            setAutocompleteUnavailable(true)
          }
          toast({
            title: 'Could not fetch address details',
            description: 'Please try selecting the address again, or enter it manually.',
            variant: 'destructive',
          })
          return
        }

        const parsed = parsePlaceDetails(place)

        setAddressQuery(parsed.formattedAddress)
        form.setValue('address', parsed.formattedAddress, { shouldDirty: true })
        form.setValue('city', parsed.city, { shouldDirty: true })
        form.setValue('state', parsed.state, { shouldDirty: true })
        form.setValue('zipCode', parsed.zipCode, { shouldDirty: true })

        // Auto-fill the Location Name from the selected place, but only
        // if the user hasn't already typed something into that field.
        const currentName = form.getValues('name')
        if (!currentName || !currentName.trim()) {
          const autoName =
            place.name ||
            prediction.structured_formatting?.main_text ||
            ''
          if (autoName) {
            form.setValue('name', autoName, { shouldDirty: true })
          }
        }

        setSelectedPlaceMeta({
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          placeId: parsed.placeId,
        })

        // Start a fresh session token for the next search (billing best practice)
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      }
    )
  }

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const onSubmit = async (data: LocationFormData) => {
    try {
      setIsSubmitting(true)

      const locationData: LocationData = {
        id: initialData?.id || `loc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: data.name.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state: data.state.trim(),
        zipCode: data.zipCode.trim(),
        contactPerson: data.contactPerson.trim(),
        phone: data.phone.trim(),
        email: data.email.trim(),
        latitude: selectedPlaceMeta.latitude,
        longitude: selectedPlaceMeta.longitude,
        placeId: selectedPlaceMeta.placeId,
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))

      toast({
        title: mode === 'create' ? 'Address Added' : 'Address Updated',
        description: `${locationData.name} has been ${mode === 'create' ? 'added' : 'updated'} successfully.`,
        variant: 'default',
      })

      onSuccess(locationData)
      form.reset()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Save location error:', error)
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Failed to save address. Please try again.'),
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (form.formState.isDirty) {
      setShowUnsavedWarning(true)
      return
    }
    form.reset()
    setAddressQuery('')
    onOpenChange(false)
  }

  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    form.reset()
    setAddressQuery('')
    onOpenChange(false)
  }

  const title = mode === 'create'
    ? `Add ${locationType === 'pickup' ? 'Pickup' : 'Delivery'} Location`
    : `Edit ${locationType === 'pickup' ? 'Pickup' : 'Delivery'} Location`

  const subtitle = mode === 'create'
    ? `Enter the ${locationType === 'pickup' ? 'pickup' : 'delivery'} address details below`
    : `Update the ${locationType === 'pickup' ? 'pickup' : 'delivery'} address details below`

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && form.formState.isDirty) {
            handleClose()
          } else {
            onOpenChange(next)
          }
        }}
      >
        <DialogContent
          className="max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl shadow-2xl"
          style={{ zIndex: 100 }}
          onPointerDownOutside={(e) => {
            if (form.formState.isDirty) {
              e.preventDefault()
            }
          }}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-green-50/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold text-gray-900">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-500 mt-0.5">
                    {subtitle}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Required Fields Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-10 bg-green-900 rounded-full" />
                    <h3 className="text-sm font-medium text-gray-700">Location Details</h3>
                    <span className="text-xs text-gray-400 ml-auto">* Required</span>
                  </div>

                  {/* Location Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: 'Location name is required',
                      minLength: {
                        value: 2,
                        message: 'Location name must be at least 2 characters'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Location Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Main Warehouse, Customer Office"
                            {...field}
                            disabled={isSubmitting}
                            className="h-10 px-3 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Address with Google Places Autocomplete (India) */}
                  <FormField
                    control={form.control}
                    name="address"
                    rules={{
                      required: 'Street address is required',
                      minLength: {
                        value: 5,
                        message: 'Please enter a complete address'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Street Address <span className="text-red-500">*</span>
                        </FormLabel>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Input
                                ref={addressInputRef}
                                placeholder="Start typing to search for an address in India..."
                                value={addressQuery}
                                onChange={(e) => {
                                  handleAddressInputChange(e)
                                  field.onChange(e.target.value)
                                }}
                                onFocus={() => {
                                  if (suggestions.length > 0) setShowSuggestions(true)
                                }}
                                onKeyDown={handleAddressKeyDown}
                                disabled={isSubmitting}
                                autoComplete="off"
                                className="h-10 pl-9 pr-16 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                              />
                              {/* Right-side status icons */}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                {(isSearching || isFetchingDetails) && (
                                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                                )}
                                {addressQuery && !isSearching && !isFetchingDetails && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddressQuery('')
                                      form.setValue('address', '', { shouldDirty: true })
                                      setSuggestions([])
                                      setShowSuggestions(false)
                                      setSelectedPlaceMeta({})
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>

                              {/* Suggestions dropdown */}
                              {showSuggestions && suggestions.length > 0 && (
                                <div
                                  ref={suggestionsBoxRef}
                                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                                >
                                  {suggestions.map((prediction, idx) => (
                                    <button
                                      type="button"
                                      key={prediction.place_id}
                                      onClick={() => handleSelectSuggestion(prediction)}
                                      onMouseEnter={() => setHighlightedIndex(idx)}
                                      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-b border-gray-50 last:border-b-0 transition-colors ${
                                        highlightedIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-sm text-gray-900 truncate">
                                          {prediction.structured_formatting?.main_text || prediction.description}
                                        </p>
                                        {prediction.structured_formatting?.secondary_text && (
                                          <p className="text-xs text-gray-500 truncate">
                                            {prediction.structured_formatting.secondary_text}
                                          </p>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* No results state */}
                              {showSuggestions &&
                                suggestions.length === 0 &&
                                !isSearching &&
                                addressQuery.trim().length >= 3 && (
                                  <div
                                    ref={suggestionsBoxRef}
                                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-3"
                                  >
                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                      <Search className="h-3.5 w-3.5" />
                                      No matching addresses found. You can enter details manually below.
                                    </p>
                                  </div>
                                )}
                            </div>
                          </FormControl>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {mapsReady && !autocompleteUnavailable
                              ? 'Powered by Google — showing addresses in India'
                              : 'Enter address manually'}
                          </span>
                        </div>
                        {autocompleteUnavailable && (
                          <p className="mt-1 text-xs text-amber-600">
                            Address autocomplete is unavailable right now. Manual address entry will still work.
                          </p>
                        )}
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* City, State, ZIP Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      rules={{ required: 'City is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            City <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City"
                              {...field}
                              disabled={isSubmitting}
                              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      rules={{ required: 'State is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            State <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="State"
                              {...field}
                              disabled={isSubmitting}
                              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      rules={{
                        required: 'ZIP code is required',
                        pattern: {
                          value: /^[0-9]{5,6}$/,
                          message: 'Please enter a valid ZIP / PIN code'
                        }
                      }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            PIN Code <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 395007"
                              {...field}
                              disabled={isSubmitting}
                              className="h-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                </div>

                {/* Optional Contact Information */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-1 w-8 bg-gray-300 rounded-full" />
                    <h4 className="text-sm font-medium text-gray-600">Contact Information</h4>
                    <span className="text-xs text-gray-400">(Optional)</span>
                  </div>

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Contact Person
                          </FormLabel>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <FormControl>
                              <Input
                                placeholder="Full name"
                                {...field}
                                disabled={isSubmitting}
                                className="h-10 pl-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Phone Number
                            </FormLabel>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <FormControl>
                                <Input
                                  placeholder="+91 98765 43210"
                                  {...field}
                                  disabled={isSubmitting}
                                  className="h-10 pl-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Email Address
                            </FormLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="contact@example.com"
                                  {...field}
                                  disabled={isSubmitting}
                                  className="h-10 pl-9 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                />
                              </FormControl>
                            </div>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 bg-white sticky bottom-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="h-10 px-6 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 text-white transition-colors shadow-sm hover:shadow"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === 'create' ? 'Adding...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        {mode === 'create' ? 'Add Location' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-[90vw] p-6 animate-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You have unsaved changes. Are you sure you want to close this form?
                </p>
                <div className="flex justify-end gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowUnsavedWarning(false)}
                    className="h-9 px-4"
                  >
                    Stay
                  </Button>
                  <Button
                    onClick={handleConfirmClose}
                    className="h-9 px-4"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
