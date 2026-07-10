import { useEffect, useRef, useState, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { MapPin, X, Loader2 } from 'lucide-react'

interface LocationDetails {
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  lat: number
  lng: number
  formattedAddress: string
  placeId?: string
}

interface LocationAutocompleteSelectProps {
  value?: string
  onChange: (value: string) => void
  onLocationSelect?: (details: LocationDetails) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  countryRestriction?: string | string[]
  rows?: number
  maxRows?: number
}

// Helper function to safely get address components
const getAddressComponent = (
  components: google.maps.GeocoderAddressComponent[],
  types: string[]
): string => {
  const component = components.find((c) => 
    types.some((type) => c.types.includes(type))
  )
  return component?.long_name || ''
}

export function LocationAutocompleteSelect({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Enter location...',
  disabled = false,
  className,
  countryRestriction = 'in',
  rows = 2,
  maxRows = 4,
}: LocationAutocompleteSelectProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google?.maps?.places) {
        setIsGoogleMapsLoaded(true)
        return true
      }
      return false
    }

    if (!checkGoogleMaps()) {
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (checkGoogleMaps() || attempts > 10) {
          clearInterval(interval)
        }
      }, 500)

      return () => clearInterval(interval)
    }
  }, [])

  // Initialize Autocomplete with textarea
  useEffect(() => {
    if (!isGoogleMapsLoaded || !textareaRef.current) return

    // Clean up previous instance
    if (autocompleteRef.current) {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current)
        listenerRef.current = null
      }
      autocompleteRef.current = null
    }

    try {
      const options: google.maps.places.AutocompleteOptions = {
        fields: [
          'address_components',
          'geometry',
          'formatted_address',
          'name',
          'place_id',
          'types',
          'url',
          'utc_offset_minutes',
          'vicinity',
        ],
        types: ['geocode', 'establishment'],
        componentRestrictions: { 
          country: countryRestriction 
        },
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(
        textareaRef.current as unknown as HTMLInputElement,
        options
      )

      // Add listener for place selection
      listenerRef.current = autocompleteRef.current.addListener(
        'place_changed',
        handlePlaceSelect
      )

      // Prevent default Enter key behavior in textarea
      const textareaElement = textareaRef.current
      const handleKeyDown = (e: KeyboardEvent) => {
        // Allow Shift+Enter for new line, prevent plain Enter from submitting
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          // Trigger place selection if available
          const place = autocompleteRef.current?.getPlace()
          if (place?.geometry?.location) {
            handlePlaceSelect()
          }
        }
      }
      textareaElement.addEventListener('keydown', handleKeyDown)

      return () => {
        textareaElement.removeEventListener('keydown', handleKeyDown)
        if (listenerRef.current) {
          google.maps.event.removeListener(listenerRef.current)
          listenerRef.current = null
        }
      }
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error)
    }
  }, [isGoogleMapsLoaded, countryRestriction])

  // Handle place selection
  const handlePlaceSelect = useCallback(() => {
    const place = autocompleteRef.current?.getPlace()
    
    if (!place?.geometry?.location) {
      console.warn('No geometry location found for selected place')
      return
    }

    setIsLoading(true)

    try {
      const components = place.address_components || []
      
      const details: LocationDetails = {
        address: place.formatted_address || place.name || '',
        city: getAddressComponent(components, ['locality', 'administrative_area_level_2']),
        state: getAddressComponent(components, ['administrative_area_level_1']),
        zipCode: getAddressComponent(components, ['postal_code']),
        country: getAddressComponent(components, ['country']),
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address || '',
        placeId: place.place_id || '',
      }

      // Update with formatted address
      onChange(details.formattedAddress)
      onLocationSelect?.(details)
      
      // Auto-resize textarea after setting value
      autoResizeTextarea()
    } catch (error) {
      console.error('Error processing place details:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onChange, onLocationSelect])

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
    const padding = parseInt(getComputedStyle(textarea).paddingTop) * 2 || 16
    const maxHeight = (maxRows || 4) * lineHeight + padding
    
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    
    // Add scroll if content exceeds max rows
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [maxRows])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    autoResizeTextarea()
  }, [onChange, autoResizeTextarea])

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('')
    onLocationSelect?.({
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      lat: 0,
      lng: 0,
      formattedAddress: '',
    })
    
    if (autocompleteRef.current) {
      autocompleteRef.current = null
    }
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [onChange, onLocationSelect])

  // Auto-resize on value change from parent
  useEffect(() => {
    autoResizeTextarea()
  }, [value, autoResizeTextarea])

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cn(
        "absolute left-3 top-3 text-muted-foreground pointer-events-none transition-colors z-10",
        isFocused ? "text-blue-500" : "text-slate-400"
      )}>
        <MapPin className="h-4 w-4" />
      </div>
      
      <Textarea
        ref={textareaRef}
        value={value || ''}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        className={cn(
          "w-full pl-9 pr-8 border-slate-200 focus-visible:ring-blue-500 resize-none transition-all",
          "min-h-[2.5rem] max-h-[8rem] overflow-y-auto",
          "py-2 leading-relaxed",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="false"
        style={{ 
          height: 'auto',
          minHeight: `${rows * 24 + 16}px`,
        }}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-3">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      )}
      
      {value && !disabled && !isLoading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Clear location"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      
      {/* Optional: Show character count or hint */}
      {value && !disabled && (
        <div className="absolute bottom-1 right-3 text-xs text-slate-400 pointer-events-none">
          {value.length} characters
        </div>
      )}
    </div>
  )
}

export default LocationAutocompleteSelect