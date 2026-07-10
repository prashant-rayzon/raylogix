// Simple address selector component
import { Plus } from 'lucide-react'
import { Button } from '@/components/custom/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type SimpleAddress = {
  id: string
  label: string
  address: string
  city: string
  state: string
  zipCode: string
}

interface SimpleAddressSelectProps {
  label: string
  addresses: SimpleAddress[]
  value?: string
  onChange: (value: string) => void
  onAddNew: () => void
  disabled?: boolean
  required?: boolean
}

export function SimpleAddressSelect({
  label,
  addresses,
  value,
  onChange,
  onAddNew,
  disabled,
  required,
}: SimpleAddressSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder="Select address" />
          </SelectTrigger>
          <SelectContent>
            {addresses.length === 0 ? (
              <div className="p-2 text-center text-xs text-slate-500">
                No addresses. Click + to add.
              </div>
            ) : (
              addresses.map((addr) => (
                <SelectItem key={addr.id} value={addr.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{addr.label}</span>
                    <span className="text-xs text-slate-500">
                      {addr.city}, {addr.state}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddNew}
          disabled={disabled}
          className="h-9 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
