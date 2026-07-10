import { useEffect, useState } from 'react'
import { Loader2, Clock, ArrowRight, User, IndianRupee, FileText, BadgeCheck, AlertCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/custom/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getBidPriceHistory, type PriceHistoryEntry } from '@/api/services/pricing/pricingAdvanced.service'
import { cn } from '@/lib/utils'

interface PriceHistoryModalProps {
  isOpen: boolean
  bidId: string
  transporterName?: string
  onClose: () => void
}

const formatMoney = (amount?: number) =>
  typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : 'N/A'

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return format(date, 'dd MMM yyyy, h:mm a')
}

const eventLabels: Record<string, { label: string; colorClass: string }> = {
  initial_bid: { label: 'Initial Bid', colorClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  offer_rate_updated: { label: 'Offer Updated', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  offline_rate_set: { label: 'Offline Rate Set', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  special_offer_set: { label: 'Special Offer Set', colorClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  final_confirmed: { label: 'Final Confirmed', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rate_rejected: { label: 'Rate Rejected', colorClass: 'bg-red-50 text-red-700 border-red-200' },
  bid_accepted: { label: 'Bid Accepted', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  bid_rejected: { label: 'Bid Rejected', colorClass: 'bg-red-100 text-red-800 border-red-300' },
  negotiation_note: { label: 'Negotiation Note', colorClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  bulk_adjustment: { label: 'Bulk Adjustment', colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
}

const roleLabels: Record<string, string> = {
  company_admin: 'Admin',
  company_user: 'Staff',
  transporter: 'Transporter',
  super_admin: 'Super Admin',
  finance: 'Finance',
}

export function PriceHistoryModal({
  isOpen,
  bidId,
  transporterName = 'Transporter',
  onClose,
}: PriceHistoryModalProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && bidId) {
      const fetchHistory = async () => {
        setLoading(true)
        try {
          const data = await getBidPriceHistory(bidId)
          setHistory(data)
        } catch (err) {
          console.error('Failed to load price history:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchHistory()
    } else {
      setHistory([])
    }
  }, [isOpen, bidId])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Clock className="h-5 w-5 text-primary" />
            Price Negotiation History
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Bid history for <span className="font-semibold text-slate-700">{transporterName}</span>
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-slate-50/50">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No negotiation events yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Changes to bid amount, offline rates, or confirmations will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px] pr-2">
            <div className="relative border-l border-slate-200 ml-3 pl-5 space-y-6 py-2">
              {history.map((entry) => {
                const eventMeta = eventLabels[entry.event] || {
                  label: entry.event.replace(/_/g, ' '),
                  colorClass: 'bg-slate-50 text-slate-700 border-slate-200',
                }

                const prevVal = entry.rateChange?.previousValue
                const newVal = entry.rateChange?.newValue
                const isPriceChange = typeof newVal === 'number'
                const hasDecreased = typeof prevVal === 'number' && typeof newVal === 'number' && newVal < prevVal
                const hasIncreased = typeof prevVal === 'number' && typeof newVal === 'number' && newVal > prevVal

                return (
                  <div key={entry._id} className="relative group">
                    {/* Event Node circle */}
                    <div
                      className={cn(
                        'absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background ring-4 ring-background transition-colors duration-150',
                        entry.event === 'final_confirmed' && 'border-emerald-500 bg-emerald-50 text-emerald-500',
                        entry.event === 'rate_rejected' && 'border-red-500 bg-red-50 text-red-500',
                        entry.event === 'initial_bid' && 'border-blue-500 bg-blue-50 text-blue-500'
                      )}
                    >
                      <div
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          entry.event === 'final_confirmed' && 'bg-emerald-500',
                          entry.event === 'rate_rejected' && 'bg-red-500',
                          entry.event === 'initial_bid' && 'bg-blue-500',
                          !(
                            entry.event === 'final_confirmed' ||
                            entry.event === 'rate_rejected' ||
                            entry.event === 'initial_bid'
                          ) && 'bg-slate-400'
                        )}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('px-2 py-0 text-[10px] uppercase font-semibold tracking-wider', eventMeta.colorClass)}>
                            {eventMeta.label}
                          </Badge>
                          {entry.approvalStatus && entry.approvalStatus !== 'approved' && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'px-1.5 py-0 text-[9px] capitalize',
                                entry.approvalStatus === 'pending' && 'bg-amber-50 text-amber-600 border-amber-200',
                                entry.approvalStatus === 'rejected' && 'bg-red-50 text-red-600 border-red-200'
                              )}
                            >
                              {entry.approvalStatus}
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </div>

                      {/* Price changes */}
                      {isPriceChange && (
                        <div className="flex items-center gap-1.5 text-sm font-semibold">
                          <IndianRupee className="h-3.5 w-3.5 text-slate-500" />
                          {typeof prevVal === 'number' ? (
                            <>
                              <span className="text-slate-400 line-through font-normal">
                                {formatMoney(prevVal)}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-400" />
                              <span
                                className={cn(
                                  hasDecreased && 'text-emerald-600',
                                  hasIncreased && 'text-amber-600',
                                  !hasDecreased && !hasIncreased && 'text-slate-700'
                               )}
                              >
                                {formatMoney(newVal)}
                              </span>
                              {prevVal > 0 && (
                                <span className={cn('text-[10px] font-medium px-1 rounded', hasDecreased ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                                  {hasDecreased ? '↓' : '↑'}{' '}
                                  {Math.abs(((newVal - prevVal) / prevVal) * 100).toFixed(1)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-900">{formatMoney(newVal)}</span>
                          )}
                        </div>
                      )}

                      {/* Who did it */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {entry.changedByName || entry.changedBy?.email || 'System'}
                        </span>
                        <span className="text-slate-400">
                          ({roleLabels[entry.changedByRole || ''] || entry.changedByRole || 'System'})
                        </span>
                      </div>

                      {/* Reason or notes */}
                      {(entry.reason || entry.negotiationNotes || entry.businessJustification) && (
                        <div className="bg-slate-50 border rounded-md p-2 mt-1 text-xs text-slate-700 max-w-full break-words space-y-1">
                          {entry.reason && (
                            <p>
                              <span className="font-semibold text-slate-500">Reason:</span> {entry.reason}
                            </p>
                          )}
                          {entry.negotiationNotes && (
                            <p>
                              <span className="font-semibold text-slate-500">Note:</span> {entry.negotiationNotes}
                            </p>
                          )}
                          {entry.businessJustification && (
                            <p>
                              <span className="font-semibold text-slate-500">Justification:</span>{' '}
                              {entry.businessJustification}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Source details for market rates */}
                      {entry.sourceDocumentation?.source && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                          <FileText className="h-3 w-3 text-slate-400" />
                          <span>Source: {entry.sourceDocumentation.source.replace(/_/g, ' ')}</span>
                          {entry.sourceDocumentation.confidence && (
                            <span className="capitalize">
                              ({entry.sourceDocumentation.confidence} confidence)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
