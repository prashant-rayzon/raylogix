import { useEffect, useState } from 'react';
import { billingService, BillingLoad } from '@/api/services/billing/billing.service';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  ClipboardCheck,
  Scale
} from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import { Layout } from '@/components/custom/layout';
import ThemeSwitch from '@/components/theme-switch';
import { toast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function BillingVerificationPage() {
  const [loads, setLoads] = useState<BillingLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'verified' | 'approved' | 'rejected' | ''>('');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<BillingLoad | null>(null);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [matchedRatePerVehicle, setMatchedRatePerVehicle] = useState('');
  const [deviationReason, setDeviationReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const fetchLoads = async (page = 1) => {
    try {
      setLoading(true);
      const response = await billingService.list({
        page,
        limit: 10,
        billingStatus: statusFilter || undefined,
      });
      setLoads(response.loads || []);
      setPagination(response.pagination);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch delivered loads.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, [statusFilter]);

  const handleOpenVerify = (load: BillingLoad) => {
    setSelectedLoad(load);
    setInvoiceNumber(load.billingAudit?.invoiceNumber || '');
    setInvoiceAmount(load.billingAudit?.invoiceAmount ? String(load.billingAudit.invoiceAmount) : '');
    setMatchedRatePerVehicle(load.billingAudit?.matchedRatePerVehicle ? String(load.billingAudit.matchedRatePerVehicle) : '');
    setDeviationReason(load.billingAudit?.deviationReason || '');
    setRemarks(load.billingAudit?.remarks || '');
    setShowModal(true);
  };

  const handleVerifySubmit = async (status: 'verified' | 'approved' | 'rejected') => {
    if (!selectedLoad) return;
    if (!invoiceNumber || !invoiceAmount || !matchedRatePerVehicle) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in Invoice Number, Amount, and Matched Rate.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await billingService.verify(selectedLoad._id, {
        status,
        invoiceNumber,
        invoiceAmount: Number(invoiceAmount),
        matchedRatePerVehicle: Number(matchedRatePerVehicle),
        deviationReason,
        remarks,
      });

      toast({
        title: 'Success',
        description: `Billing status updated to ${status} successfully.`,
      });

      setShowModal(false);
      fetchLoads(pagination.page);
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update billing verification details.',
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance Billing Verification</h1>
          <p className="text-muted-foreground text-sm">
            Match transporter invoice payments against pre-negotiated rates and weighbridge recordings.
          </p>
        </div>

        {/* Filter bar */}
        <Card className="border-border/40">
          <CardContent className="p-4 flex gap-4">
            <button
              onClick={() => setStatusFilter('')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                statusFilter === ''
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              All Delivered
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                statusFilter === 'pending'
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Pending Verification
            </button>
            <button
              onClick={() => setStatusFilter('verified')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                statusFilter === 'verified'
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Verified (Matched)
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                statusFilter === 'approved'
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              Approved Payouts
            </button>
          </CardContent>
        </Card>

        {/* Loads Table */}
        <Card className="overflow-hidden border-border/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold border-b">
                <tr>
                  <th className="p-4">Load Details</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Transporter</th>
                  <th className="p-4">Weighbridge Weights</th>
                  <th className="p-4">Invoice Info</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading delivered loads...
                    </td>
                  </tr>
                ) : loads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No delivered loads found for billing audit.
                    </td>
                  </tr>
                ) : (
                  loads.map((load: any) => {
                    const tare = load.vehicleMovements?.[0]?.gateIn?.tareWeight || 0;
                    const gross = load.vehicleMovements?.[0]?.gateOut?.grossWeight || 0;
                    const net = gross && tare ? gross - tare : 0;

                    return (
                      <tr key={load._id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium">
                          <div className="space-y-1">
                            <span className="font-semibold text-foreground">{load.loadNumber}</span>
                            <div className="text-[10px] text-muted-foreground">{load.material}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs">
                            <span>{load.pickupLocation?.city || 'N/A'}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{load.deliveryLocation?.city || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs">
                          {load.assignedTransporter?.companyName || load.assignedTransporter?.name || 'N/A'}
                        </td>
                        <td className="p-4 text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Tare: {tare ? `${tare.toLocaleString()} kg` : 'N/A'}</span>
                          </div>
                          <div>Gross: {gross ? `${gross.toLocaleString()} kg` : 'N/A'}</div>
                          {net > 0 && <div className="font-semibold text-emerald-600">Net Payload: {net.toLocaleString()} kg</div>}
                        </td>
                        <td className="p-4 text-xs space-y-0.5">
                          {load.billingAudit?.invoiceNumber ? (
                            <>
                              <div className="font-semibold text-foreground">Inv: {load.billingAudit.invoiceNumber}</div>
                              <div className="text-muted-foreground">Amt: ₹{load.billingAudit.invoiceAmount?.toLocaleString('en-IN')}</div>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Not invoiced</span>
                          )}
                        </td>
                        <td className="p-4">
                          {load.billingAudit?.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          ) : load.billingAudit?.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              <ClipboardCheck className="w-3 h-3" /> Verified
                            </span>
                          ) : load.billingAudit?.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" /> Pending Audit
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <PermissionGate permission="billing.verify">
                            <button
                              onClick={() => handleOpenVerify(load)}
                              className="px-3 py-1.5 bg-muted text-foreground hover:bg-primary hover:text-primary-foreground rounded text-xs font-semibold transition-all"
                            >
                              Audit Load
                            </button>
                          </PermissionGate>
                        </td>
                      </tr>
                    );
                  })
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
                  onClick={() => fetchLoads(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-1.5 border rounded hover:bg-background disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchLoads(pagination.page + 1)}
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

      {/* Audit Modal */}
      {showModal && selectedLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg overflow-hidden border-border/80 shadow-2xl animate-in fade-in zoom-in-95 duration-150 bg-background text-foreground">
            <div className="p-6 border-b flex justify-between items-center bg-muted/30">
              <div>
                <h3 className="font-bold text-lg">Billing matching audit - {selectedLoad.loadNumber}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Match invoice and weighbridge records</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-muted rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Load Info & Weights */}
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
                <h4 className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Captured Weights & Logistics Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Pickup City:</strong> {selectedLoad.pickupLocation?.city || 'N/A'}</div>
                  <div><strong>Delivery City:</strong> {selectedLoad.deliveryLocation?.city || 'N/A'}</div>
                  <div><strong>Tare Weight:</strong> {selectedLoad.vehicleMovements?.[0]?.gateIn?.tareWeight ? `${selectedLoad.vehicleMovements[0].gateIn.tareWeight} kg` : 'N/A'}</div>
                  <div><strong>Gross Weight:</strong> {selectedLoad.vehicleMovements?.[0]?.gateOut?.grossWeight ? `${selectedLoad.vehicleMovements[0].gateOut.grossWeight} kg` : 'N/A'}</div>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Invoice Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45000"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Matched Rate Per Vehicle (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 45000"
                  value={matchedRatePerVehicle}
                  onChange={(e) => setMatchedRatePerVehicle(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Deviation Reason (If rates differ)</label>
                <input
                  type="text"
                  placeholder="e.g. Extra loading charges approved by lane manager"
                  value={deviationReason}
                  onChange={(e) => setDeviationReason(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Internal Remarks</label>
                <textarea
                  placeholder="Add auditing remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-muted/10 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => handleVerifySubmit('rejected')}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Reject billing
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVerifySubmit('verified')}
                  className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  Verify Matched
                </button>
                <PermissionGate permission="billing.approve">
                  <button
                    type="button"
                    onClick={() => handleVerifySubmit('approved')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow transition-colors"
                  >
                    Approve payout
                  </button>
                </PermissionGate>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
}
