import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { bid as bidService } from '@/api/services'

interface PriceHistoryProps {
  bidId: string
}

interface HistoryEntry {
  _id: string
  event: string
  rateChange?: {
    rateType: string
    previousValue?: number
    newValue: number
    currency: string
  }
  reason?: string
  changedByName?: string
  createdAt: string
}

export function PriceHistory({ bidId }: PriceHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [bidId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      // Get bid and extract price history
      await bidService.getBid(bidId)
      // For now, we'll show bid history from rateDetails updates
      // In future, fetch from price_history collection
      setHistory([])
    } catch (error) {
      console.error('Failed to load price history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" />
          Price History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No price changes recorded yet
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry._id} className="rounded-lg border bg-slate-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{entry.event}</span>
                      {entry.rateChange?.rateType && (
                        <Badge variant="outline" className="text-xs">
                          {entry.rateChange.rateType}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.changedByName} · {format(new Date(entry.createdAt), 'dd MMM yyyy, h:mm a')}
                    </p>
                    {entry.reason && (
                      <p className="mt-1 text-xs text-slate-700">{entry.reason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.rateChange?.previousValue && (
                      <p className="text-xs line-through text-muted-foreground">
                        ₹{entry.rateChange.previousValue.toLocaleString('en-IN')}
                      </p>
                    )}
                    <p className="font-mono font-semibold">
                      ₹{entry.rateChange?.newValue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
