import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/custom/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { getApiErrorMessage } from '@/lib/api-error'

interface AssignBidSectionProps {
  loadId: string
  pendingBids: any[]
  acceptedBid?: any
  onAssign: (bidId: string, vehicleCount: number, finalRate: number) => Promise<void>
  onReassign?: (bidId: string, vehicleCount: number, finalRate: number) => Promise<void>
  remainingVehicles: number
  isAdmin: boolean
}

export function AssignBidSection({
  pendingBids,
  acceptedBid,
  onAssign,
  onReassign,
  remainingVehicles,
  isAdmin,
}: AssignBidSectionProps) {
  const { toast } = useToast()
  
  const [selectedBidId, setSelectedBidId] = useState<string>('')
  const [vehicleCount, setVehicleCount] = useState('1')
  const [finalRate, setFinalRate] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [isReassign, setIsReassign] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const selectedBid = pendingBids.find(b => b._id === selectedBidId)
  const selectedBidRemainingVehicles = Math.max(
    0,
    Number(selectedBid?.vehiclesOffered || 0) - Number(selectedBid?.allocatedVehicles || 0)
  )

  const handleAssign = async () => {
    if (!selectedBidId || !vehicleCount || !finalRate) {
      toast({
        title: 'Error',
        description: 'Please fill all fields',
        variant: 'destructive',
      })
      return
    }

    const vCount = parseInt(vehicleCount)
    const rate = parseFloat(finalRate)

    if (vCount <= 0 || isNaN(rate) || rate <= 0) {
      toast({
        title: 'Error',
        description: 'Invalid vehicle count or rate',
        variant: 'destructive',
      })
      return
    }

    if (vCount > selectedBidRemainingVehicles) {
      toast({
        title: 'Error',
        description: `Only ${selectedBidRemainingVehicles} vehicles available for this bid`,
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      if (isReassign && onReassign) {
        await onReassign(selectedBidId, vCount, rate)
        toast({
          title: 'Success',
          description: `Bid reassigned with ${vCount} vehicle(s) at ₹${rate.toLocaleString('en-IN')}`,
        })
      } else {
        await onAssign(selectedBidId, vCount, rate)
        toast({
          title: 'Success',
          description: `Bid assigned with ${vCount} vehicle(s) at ₹${rate.toLocaleString('en-IN')}`,
        })
      }
      
      // Reset form
      setSelectedBidId('')
      setVehicleCount('1')
      setFinalRate('')
      setShowDialog(false)
      setIsReassign(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Assignment failed'),
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenAssign = () => {
    setIsReassign(false)
    setShowDialog(true)
  }

  const handleOpenReassign = () => {
    if (!acceptedBid) {
      toast({
        title: 'Error',
        description: 'No current bid to reassign',
        variant: 'destructive',
      })
      return
    }
    setIsReassign(true)
    setShowDialog(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4" />
            {acceptedBid ? 'Assigned Bid' : 'Assign Bid'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptedBid ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Current Assignment</p>
                <p className="mt-1 font-semibold text-emerald-900">
                  {acceptedBid?.transporterId?.transporterName || 'Transporter'}
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Rate: ₹{acceptedBid?.bidAmount?.toLocaleString('en-IN')} per vehicle
                </p>
                {acceptedBid?.allocations && (
                  <p className="mt-1 text-sm text-emerald-800">
                    Allocated: {acceptedBid.allocations.length} vehicle(s)
                  </p>
                )}
              </div>
              {isAdmin && remainingVehicles > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenAssign}
                    className="flex-1"
                  >
                    Add More
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenReassign}
                    className="flex-1"
                  >
                    Reassign
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={handleOpenAssign}
              disabled={!isAdmin || pendingBids.length === 0}
              className="w-full"
            >
              {pendingBids.length === 0 ? 'No bids available' : 'Assign Bid'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Assign/Reassign Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReassign ? 'Reassign Bid' : 'Assign Bid'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isReassign
                ? 'Select a new transporter bid and confirm details'
                : 'Select a transporter bid to assign this load'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Bid Selection */}
            <div className="space-y-2">
              <Label htmlFor="bid-select">Transporter Bid</Label>
              <Select value={selectedBidId} onValueChange={setSelectedBidId}>
                <SelectTrigger id="bid-select">
                  <SelectValue placeholder="Select a bid" />
                </SelectTrigger>
                <SelectContent>
                  {pendingBids.map(bid => (
                    <SelectItem key={bid._id} value={bid._id}>
                      {bid.transporterId?.transporterName || 'Unknown'} - ₹{bid.bidAmount.toLocaleString('en-IN')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBid && (
              <>
                {/* Vehicle Count */}
                <div className="space-y-2">
                  <Label htmlFor="vehicles">
                    Number of Vehicles ({selectedBidRemainingVehicles} available)
                  </Label>
                  <Input
                    id="vehicles"
                    type="number"
                    min="1"
                    max={selectedBidRemainingVehicles}
                    value={vehicleCount}
                    onChange={e => setVehicleCount(e.target.value)}
                    placeholder="1"
                  />
                </div>

                {/* Final Rate */}
                <div className="space-y-2">
                  <Label htmlFor="rate">Final Rate per Vehicle (₹)</Label>
                  <Input
                    id="rate"
                    type="number"
                    min="0"
                    value={finalRate}
                    onChange={e => setFinalRate(e.target.value)}
                    placeholder={selectedBid.bidAmount.toString()}
                    className="font-mono"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="mt-1 text-lg font-bold">
                    ₹{(parseInt(vehicleCount || '0') * parseFloat(finalRate || '0')).toLocaleString('en-IN')}
                  </p>
                </div>
              </>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssign}
              disabled={submitting || !selectedBidId || !vehicleCount || !finalRate}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isReassign ? 'Reassigning...' : 'Assigning...'}
                </>
              ) : (
                isReassign ? 'Reassign' : 'Assign'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
