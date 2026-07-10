import { useState, useEffect } from 'react'
import { Loader2, IndianRupee, Info, Clock, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/custom/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { bid as bidService } from '@/api/services'
import { getBidPriceHistory, type PriceHistoryEntry } from '@/api/services/pricing/pricingAdvanced.service'
import { cn } from '@/lib/utils'

interface NegotiatePriceModalProps {
  isOpen: boolean
  bidId: string
  currentPrice?: number
  isAdmin?: boolean
  onClose: () => void
  onSuccess?: () => void
  constraints?: {
    minPrice?: number
    maxPrice?: number
  }
}

const formatMoney = (amount?: number) =>
  typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : 'N/A'

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return format(date, 'dd MMM yyyy, h:mm a')
}

export function NegotiatePriceModal({
  isOpen,
  bidId,
  currentPrice,
  isAdmin = false,
  onClose,
  onSuccess,
  constraints = {},
}: NegotiatePriceModalProps) {
  const { toast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [price, setPrice] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Price history state
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    if (isOpen && bidId) {
      const fetchHistory = async () => {
        setLoadingHistory(true)
        try {
          const data = await getBidPriceHistory(bidId)
          setHistory(data)
        } catch (err) {
          console.error('Failed to load price history:', err)
        } finally {
          setLoadingHistory(false)
        }
      }
      fetchHistory()
    } else {
      setHistory([])
    }
  }, [isOpen, bidId])

  const priceNum = price ? parseFloat(price) : 0
  const priceDiff = currentPrice ? priceNum - currentPrice : 0
  const priceDiffPercent = currentPrice ? ((priceDiff / currentPrice) * 100).toFixed(1) : 0

  const validatePrice = (value: string): string => {
    if (!value) return 'Price is required'
    
    const num = Number(value)
    if (isNaN(num)) return 'Must be a valid number'
    if (num <= 0) return 'Price must be greater than 0'
    
    if (constraints.minPrice && num < constraints.minPrice) {
      return `Minimum: ${formatMoney(constraints.minPrice)}`
    }
    if (constraints.maxPrice && num > constraints.maxPrice) {
      return `Maximum: ${formatMoney(constraints.maxPrice)}`
    }
    
    return ''
  }

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {}
    
    const priceErr = validatePrice(price)
    if (priceErr) newErrors.price = priceErr

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const result = await bidService.updateNegotiatedAmount(bidId, {
        finalConfirmedRate: Number(price),
        offlineRateNotes: reason || undefined,
      })

      if (result?.success) {
        toast({
          title: '✓ Price Updated',
          description: `Final rate set to ${formatMoney(Number(price))}`,
        })
        setPrice('')
        setReason('')
        onSuccess?.()
        onClose()
      } else {
        toast({
          title: 'Error',
          description: result?.message || 'Failed to update price',
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update price',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Final Price</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <Info className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Only administrators can negotiate prices
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-emerald-600" />
            Set Final Price
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Price Display */}
          {currentPrice && (
            <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Current Bid Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatMoney(currentPrice)}
              </p>
            </div>
          )}

          {/* Price Input */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-semibold">
              Final Price (₹ per vehicle)
            </Label>
            <div className="relative">
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  setErrors((prev) => ({ ...prev, price: '' }))
                }}
                className={cn(
                  'pl-8 text-lg font-semibold font-mono',
                  errors.price && 'border-red-500 focus:ring-red-500'
                )}
              />
              <IndianRupee className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            </div>

            {/* Price Comparison */}
            {price && currentPrice && (
              <div className={cn(
                'text-sm font-medium rounded px-2 py-1',
                priceDiff < 0
                  ? 'bg-green-50 text-green-700'
                  : priceDiff > 0
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-50 text-slate-700'
              )}>
                {priceDiff === 0
                  ? 'Same as bid'
                  : priceDiff < 0
                    ? `↓ ${formatMoney(Math.abs(priceDiff))} lower (${priceDiffPercent}%)`
                    : `↑ ${formatMoney(priceDiff)} higher (${priceDiffPercent}%)`}
              </div>
            )}

            {errors.price && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.price}
              </p>
            )}
          </div>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold">
              Reason for Change (Optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Market rate update, special discount, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-16 resize-none text-sm"
            />
          </div>

          {/* Price History Section */}
          <div className="border-t pt-4 mt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3 text-slate-500" />
              Price Negotiation History
            </h4>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading history...
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1 text-center bg-slate-50 border border-dashed rounded">
                No negotiation history recorded yet
              </p>
            ) : (
              <ScrollArea className="h-[120px] border rounded bg-slate-50 p-2.5">
                <div className="space-y-2">
                  {history.map((entry) => {
                    const dateStr = formatDateTime(entry.createdAt)
                    const prevVal = entry.rateChange?.previousValue
                    const newVal = entry.rateChange?.newValue
                    return (
                      <div key={entry._id} className="text-[11px] leading-normal border-b border-slate-100 last:border-0 pb-1.5 last:pb-0">
                        <div className="flex items-center justify-between text-slate-500 mb-0.5">
                          <span className="font-semibold text-slate-600 capitalize">
                            {entry.event.replace(/_/g, ' ')}
                          </span>
                          <span>{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          {typeof prevVal === 'number' ? (
                            <>
                              <span className="line-through text-slate-400 font-normal">₹{prevVal.toLocaleString('en-IN')}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                              <span className="text-emerald-700">₹{newVal.toLocaleString('en-IN')}</span>
                            </>
                          ) : (
                            <span>₹{newVal.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 font-normal">
                            Reason: {entry.reason}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !price || parseFloat(price) <= 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : (
              <>
                <IndianRupee className="h-4 w-4" />
                Confirm Price
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
