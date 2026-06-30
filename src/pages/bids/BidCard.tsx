// src/components/bids/BidCard.tsx
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/custom/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Mail, Phone, Clock, DollarSign } from 'lucide-react'
import { format } from 'date-fns'

interface BidCardProps {
  bid: any
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  showActions?: boolean
}

export function BidCard({ bid, onAccept, onReject, showActions = true }: BidCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'withdrawn': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`/api/avatars/${bid.transporterId._id}`} />
            <AvatarFallback>
              {bid.transporterId.transporterName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold text-lg">{bid.transporterId.transporterName}</h4>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="ml-1">{bid.transporterId.rating || 'N/A'}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{bid.transporterId.totalTrips || 0} trips</span>
            </div>
          </div>
        </div>
        <Badge className={getStatusColor(bid.status)}>
          {bid.status.toUpperCase()}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Bid Amount
            </div>
            <p className="text-xl font-bold text-primary">
              ₹{bid.bidAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Est. Delivery
            </div>
            <p className="font-medium">
              {format(new Date(bid.estimatedDeliveryDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        {bid.comments && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground mb-1">Note:</p>
            <p>{bid.comments}</p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>{bid.transporterId.email}</span>
          </div>
          {bid.transporterId.mobile && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{bid.transporterId.mobile}</span>
            </div>
          )}
        </div>
      </CardContent>

      {showActions && bid.status === 'pending' && (
        <CardFooter className="flex items-center justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject?.(bid._id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => onAccept?.(bid._id)}
          >
            Accept Bid
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}