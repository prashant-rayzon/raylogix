import { useEffect, useState } from 'react';
import { transportersService } from '@/api/services/transporters/transporters.service';
import { X, MapPin, Calendar, IndianRupee, Truck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';

interface Load {
  _id: string;
  loadNumber: string;
  material: string;
  numberOfVehicles?: number;
  pickupLocation?: { address?: string; city?: string };
  deliveryLocation?: { address?: string; city?: string };
  status: 'open' | 'assigned' | 'in_transit' | 'delivered' | 'canceled';
  pickupDate: string;
  deliveryDate: string;
  bidWinningPrice?: number;
  priority?: string;
}

interface ViewLoadsModalProps {
  isOpen: boolean;
  transporterId: string | null;
  transporterName?: string;
  onClose: () => void;
}

const statusColors = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
  assigned: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
  in_transit: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  canceled: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/50',
};

export function ViewLoadsModal({ isOpen, transporterId, transporterName = 'Transporter', onClose }: ViewLoadsModalProps) {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { socket } = useNotifications();

  useEffect(() => {
    if (isOpen && transporterId) {
      fetchLoads();
    }
  }, [isOpen, transporterId]);

  const fetchLoads = async (page = 1) => {
    if (!transporterId) return;

    try {
      setLoading(true);
      const response: any = await transportersService.getTransporterLoads(transporterId, {
        page,
        limit: 10,
        status: undefined,
      });

      let loadsData: Load[] = [];
      let paginationData = { page, limit: 10, total: 0, pages: 0 };

      if (response.data?.loads) {
        loadsData = response.data.loads;
        paginationData = response.data.pagination || paginationData;
      } else if (response.loads) {
        loadsData = response.loads;
        paginationData = response.pagination || paginationData;
      } else if (Array.isArray(response)) {
        loadsData = response;
      }

      if (response.total) {
        paginationData.total = response.total;
        paginationData.pages = Math.ceil(response.total / paginationData.limit);
      }

      setLoads(loadsData);
      setPagination(paginationData);
    } catch (error: any) {
      console.error('Failed to fetch loads:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch loads. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !transporterId || !socket) return;

    const isForTransporter = (payload: any) => {
      const assignedTransporter =
        payload?.load?.assignedTransporter?._id ||
        payload?.load?.assignedTransporter ||
        payload?.assignedTransporterId ||
        payload?.transporterId;

      return String(assignedTransporter || '') === String(transporterId);
    };

    const refreshAssignedLoads = (payload: any) => {
      if (isForTransporter(payload)) {
        fetchLoads(pagination.page);
      }
    };

    socket.on('load:assigned', refreshAssignedLoads);
    socket.on('load:updated', refreshAssignedLoads);
    socket.on('load:status-changed', refreshAssignedLoads);

    return () => {
      socket.off('load:assigned', refreshAssignedLoads);
      socket.off('load:updated', refreshAssignedLoads);
      socket.off('load:status-changed', refreshAssignedLoads);
    };
  }, [isOpen, pagination.page, socket, transporterId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-background rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Assigned Loads</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {transporterName} · assigned, in transit and delivered only
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">Loading loads...</span>
              </div>
            ) : loads.length > 0 ? (
              <div className="space-y-3">
                {loads.map((load) => (
                  <div
                    key={load._id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-foreground">{load.loadNumber}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{load.material}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          statusColors[load.status] || statusColors.open
                        }`}
                      >
                        {load.status.replace('_', ' ').charAt(0).toUpperCase() + load.status.replace('_', ' ').slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      {/* Pickup */}
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {load.pickupLocation?.city || load.pickupLocation?.address || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(load.pickupDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="flex items-start gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivery</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {load.deliveryLocation?.city || load.deliveryLocation?.address || 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(load.deliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {load.numberOfVehicles || 1} vehicle{(load.numberOfVehicles || 1) === 1 ? '' : 's'}
                          </span>
                        </div>
                        {load.priority && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                            {load.priority}
                          </span>
                        )}
                      </div>
                      {load.bidWinningPrice && (
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-foreground">
                            {typeof load.bidWinningPrice === 'number'
                              ? load.bidWinningPrice.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : load.bidWinningPrice}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Truck className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No assigned loads yet</p>
              </div>
            )}
          </div>

          {/* Footer with Pagination */}
          {loads.length > 0 && pagination.pages > 1 && (
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page <span className="font-medium">{pagination.page}</span> of{' '}
                <span className="font-medium">{pagination.pages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => fetchLoads(pagination.page - 1)}
                  className="px-3 py-1.5 border border-input rounded text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={pagination.page === pagination.pages}
                  onClick={() => fetchLoads(pagination.page + 1)}
                  className="px-3 py-1.5 border border-input rounded text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
