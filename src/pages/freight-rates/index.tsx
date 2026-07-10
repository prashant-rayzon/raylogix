import { useEffect, useState } from 'react';
import { freightRatesService, FreightRate } from '@/api/services/freight-rates/freightRates.service';
import { transportersService } from '@/api/services/transporters/transporters.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  Truck,
  MapPin,
  X,
  Save
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Layout } from '@/components/custom/layout';
import ThemeSwitch from '@/components/theme-switch';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';

interface TransporterOption {
  _id: string;
  name?: string;
  companyName?: string;
}

export default function FreightRatesPage() {
  const [rates, setRates] = useState<FreightRate[]>([]);
  const [transporters, setTransporters] = useState<TransporterOption[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [sourceFilter, setSourceFilter] = useState('');
  const [debouncedSourceFilter, setDebouncedSourceFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');
  const [debouncedDestFilter, setDebouncedDestFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [debouncedVehicleFilter, setDebouncedVehicleFilter] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Debouncing effect hooks
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSourceFilter(sourceFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [sourceFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDestFilter(destFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [destFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedVehicleFilter(vehicleFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [vehicleFilter]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // Form Fields
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [transporterId, setTransporterId] = useState('');
  const [ratePerVehicle, setRatePerVehicle] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchRates = async (page = 1) => {
    try {
      setLoading(true);
      const response = await freightRatesService.list({
        page,
        limit: 10,
        source: debouncedSourceFilter || undefined,
        destination: debouncedDestFilter || undefined,
        vehicleType: debouncedVehicleFilter || undefined,
      });
      setRates(response.rates || []);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch freight rates.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporters = async () => {
    try {
      const response = await transportersService.list({ limit: 100 });
      setTransporters(response.data || []);
    } catch (error) {
      console.error('Failed to load transporters:', error);
    }
  };

  // Fetch static transporters list once on mount
  useEffect(() => {
    fetchTransporters();
  }, []);

  // Fetch rates when filters change
  useEffect(() => {
    fetchRates();
  }, [debouncedSourceFilter, debouncedDestFilter, debouncedVehicleFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedRateId(null);
    setSource('');
    setDestination('');
    setVehicleType('Truck');
    setTransporterId(transporters[0]?._id || '');
    setRatePerVehicle('');
    setEffectiveFrom('');
    setEffectiveTo('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (rate: FreightRate) => {
    setIsEditing(true);
    setSelectedRateId(rate._id);
    setSource(rate.source);
    setDestination(rate.destination);
    setVehicleType(rate.vehicleType);
    setTransporterId(typeof rate.transporterId === 'object' ? rate.transporterId._id : rate.transporterId);
    setRatePerVehicle(String(rate.ratePerVehicle));
    setEffectiveFrom(rate.effectiveFrom.split('T')[0]);
    setEffectiveTo(rate.effectiveTo.split('T')[0]);
    setIsActive(rate.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !destination || !vehicleType || !transporterId || !ratePerVehicle || !effectiveFrom || !effectiveTo) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        source,
        destination,
        vehicleType,
        transporterId,
        ratePerVehicle: Number(ratePerVehicle),
        effectiveFrom,
        effectiveTo,
        isActive,
      };

      if (isEditing && selectedRateId) {
        await freightRatesService.update(selectedRateId, payload);
        toast({ title: 'Success', description: 'Contract rate updated successfully.' });
      } else {
        await freightRatesService.create(payload);
        toast({ title: 'Success', description: 'Contract rate created successfully.' });
      }

      setShowModal(false);
      fetchRates(pagination.page);
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save freight contract rate.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contract rate?')) return;
    try {
      await freightRatesService.delete(id);
      toast({ title: 'Success', description: 'Contract rate deleted successfully.' });
      fetchRates(pagination.page);
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete rate.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <Layout.Header>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <UserNav />
        </div>
      </Layout.Header>

      <Layout.Body className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Freight Rate Master</h1>
            <p className="text-muted-foreground text-sm">
              Manage pre-negotiated transporter contract rates per lane route.
            </p>
          </div>
          <PermissionGate permission="master.write">
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Plus className="h-4 h-4" /> Add Contract Rate
            </button>
          </PermissionGate>
        </div>

        {/* Filter Bar */}
        <Card className="border-border/40">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by Source City"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by Destination City"
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative flex-1">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by Vehicle Type (e.g. 14 Ton)"
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* Rates Table */}
        <Card className="overflow-hidden border-border/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b">
                <tr>
                  <th className="p-4">Route</th>
                  <th className="p-4">Vehicle Type</th>
                  <th className="p-4">Transporter</th>
                  <th className="p-4">Rate (Per Vehicle)</th>
                  <th className="p-4">Validity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading freight contracts...
                    </td>
                  </tr>
                ) : rates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No negotiated contract rates found.
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate._id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{rate.source}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{rate.destination}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{rate.vehicleType}</td>
                      <td className="p-4">
                        {typeof rate.transporterId === 'object' 
                          ? rate.transporterId.companyName || rate.transporterId.name 
                          : 'Unknown Transporter'}
                      </td>
                      <td className="p-4 font-semibold text-foreground">
                        ₹{rate.ratePerVehicle.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{rate.effectiveFrom.split('T')[0]} to {rate.effectiveTo.split('T')[0]}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {rate.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <PermissionGate permission="master.write">
                            <button
                              onClick={() => handleOpenEdit(rate)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rate._id)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 flex items-center justify-between border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Showing page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchRates(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 border rounded hover:bg-background disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchRates(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-1.5 border rounded hover:bg-background disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </Layout.Body>

      {/* Contract Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg overflow-hidden border-border/80 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-background text-foreground">
            <div className="p-6 border-b flex justify-between items-center bg-muted/30">
              <div>
                <h3 className="font-bold text-lg">{isEditing ? 'Edit Freight Contract' : 'Add Negotiated Freight Rate'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Input details for a negotiated logistics contract</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Source City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MUMBAI"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Destination City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DELHI"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Vehicle Type *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 14 Ton Truck"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Contract Rate (₹) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground font-semibold">₹</span>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="e.g. 45000"
                        value={ratePerVehicle}
                        onChange={(e) => setRatePerVehicle(e.target.value)}
                        className="w-full pl-7 pr-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Transporter *</label>
                  <select
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {transporters.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.companyName || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Effective From *</label>
                    <input
                      type="date"
                      required
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Effective To *</label>
                    <input
                      type="date"
                      required
                      value={effectiveTo}
                      onChange={(e) => setEffectiveTo(e.target.value)}
                      className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-input bg-background"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-foreground cursor-pointer select-none">
                    Mark as Active Contract
                  </label>
                </div>
              </div>

              <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 shadow transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Contract
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Layout>
  );
}
