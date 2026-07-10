// components/load/AddressManager.tsx
import { MapPin, Plus, X } from 'lucide-react'
import { Button } from '@/components/custom/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type Address = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  isPrimary?: boolean
}

interface AddressManagerProps {
  title: string
  addresses: Address[]
  onAddAddress: () => void
  onRemoveAddress: (id: string) => void
  onSelectAddress: (id: string) => void
  selectedAddressId?: string
  color: 'emerald' | 'blue'
  disabled?: boolean
}

export function AddressManager({
  title,
  addresses,
  onAddAddress,
  onRemoveAddress,
  onSelectAddress,
  selectedAddressId,
  color,
  disabled = false,
}: AddressManagerProps) {
  const colorClasses = {
    emerald: {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      button: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50',
    },
    blue: {
      dot: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      button: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
    },
  }

  const styles = colorClasses[color]

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', styles.dot)} />
          <h4 className="font-semibold text-sm text-slate-900">{title}</h4>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddAddress}
          disabled={disabled}
          className={cn('h-7 px-2 text-xs font-medium', styles.button)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Address
        </Button>
      </div>

      {/* Address List */}
      <div className="space-y-2">
        {addresses.length === 0 ? (
          <div className="flex items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-lg">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No addresses added</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Address" to get started</p>
            </div>
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => !disabled && onSelectAddress(addr.id)}
              className={cn(
                'group relative p-3 border rounded-lg cursor-pointer transition-all',
                selectedAddressId === addr.id
                  ? cn('border-2', styles.badge, 'shadow-sm')
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Primary Badge */}
              {addr.isPrimary && (
                <Badge
                  variant="secondary"
                  className={cn('absolute top-2 right-2 text-[10px] px-1.5 py-0.5', styles.badge)}
                >
                  Primary
                </Badge>
              )}

              {/* Selected Indicator */}
              {selectedAddressId === addr.id && (
                <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', styles.dot)} />
              )}

              {/* Address Content */}
              <div className="pr-8">
                <div className="flex items-start gap-2">
                  <MapPin className={cn('h-4 w-4 mt-0.5 flex-shrink-0', 
                    selectedAddressId === addr.id ? 'text-current' : 'text-slate-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {addr.address || 'No address'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {[addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ') || 'Incomplete address'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              {!disabled && addresses.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveAddress(addr.id)
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
