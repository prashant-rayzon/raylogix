import { useState } from 'react';
import {
  IconTruck,
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconCircleCheck,
  IconAlertTriangle,
  IconX,
  IconClock,
  IconMapPin,
  IconCreditCard,
  IconRoute,
  IconBuildingArch,
  IconArrowRight,
  IconArrowLeft,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Layout } from '@/components/custom/layout';
import { Button } from '@/components/custom/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { fastagService, FastagNormalized, FastagTollCrossing } from '@/api/services/tracking/fastag.service';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const timeAgo = (value?: string | null) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
};

const getTagStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: <IconCircleCheck className="h-3.5 w-3.5" />,
      };
    case 'low balance':
      return {
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        icon: <IconAlertTriangle className="h-3.5 w-3.5" />,
      };
    case 'blacklisted':
      return {
        color: 'bg-rose-100 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        icon: <IconX className="h-3.5 w-3.5" />,
      };
    default:
      return {
        color: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        icon: <IconAlertCircle className="h-3.5 w-3.5" />,
      };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  highlight?: 'green' | 'amber' | 'red' | 'blue';
}) {
  const highlightStyles = {
    green: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-rose-200 bg-rose-50',
    blue: 'border-blue-200 bg-blue-50',
  };
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? highlightStyles[highlight] : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-xl font-bold text-foreground truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function CrossingCard({ crossing, index }: { crossing: FastagTollCrossing; index: number }) {
  return (
    <div className="flex gap-3 py-3 border-b border-border/60 last:border-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            index === 0
              ? 'bg-blue-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {index + 1}
        </div>
        {/* vertical connector */}
        <div className="flex-1 w-px bg-border/50 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              {crossing.plazaName}
            </p>
            <p className="text-xs text-muted-foreground">
              {crossing.highway} · {crossing.city}, {crossing.state}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Badge
              className={`text-[10px] px-2 py-0.5 font-semibold ${
                crossing.direction === 'Entry'
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-violet-100 text-violet-700 border-violet-200'
              }`}
              variant="outline"
            >
              {crossing.direction === 'Entry' ? (
                <IconArrowRight className="h-2.5 w-2.5 mr-1" />
              ) : (
                <IconArrowLeft className="h-2.5 w-2.5 mr-1" />
              )}
              {crossing.direction}
            </Badge>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <IconClock className="h-3 w-3" />
            {formatDateTime(crossing.crossingTime)}
            <span className="text-muted-foreground/60">({timeAgo(crossing.crossingTime)})</span>
          </span>
          <span className="flex items-center gap-1">
            <IconCreditCard className="h-3 w-3" />
            ₹{crossing.feeCharged}
          </span>
          <span>Lane {crossing.laneNumber}</span>
          <span>{crossing.vehicleClass}</span>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
          TXN: {crossing.transactionId}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function FastagTrackingPage() {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FastagNormalized | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const v = vehicleNumber.replace(/\s+/g, '').toUpperCase();
    if (!v) {
      toast({ title: 'Enter a vehicle number', variant: 'destructive' });
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await fastagService.getVehicleTracking(v);
      if (!res.success) {
        setError(res.message || 'Failed to fetch FASTag data');
        toast({ title: 'Tracking failed', description: res.message, variant: 'destructive' });
        return;
      }
      setResult(res.data.normalized);
      setIsDemoData(res.isDemoData);
      toast({
        title: 'FASTag data fetched',
        description: `Found ${res.data.normalized.totalTransactions} toll crossing(s) for ${v}`,
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'An unexpected error occurred';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tagConfig = result ? getTagStatusConfig(result.tagStatus) : null;

  return (
    <Layout>
      <Layout.Header>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
            <IconTruck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">FASTag Vehicle Tracker</h1>
            <p className="text-xs text-muted-foreground">
              Track vehicle toll movements using FASTag data
            </p>
          </div>
        </div>
      </Layout.Header>

      <Layout.Body className="space-y-6">
        {/* ── Search Bar ── */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Enter Vehicle Registration Number
            </p>
            <div className="flex gap-2">
              <Input
                id="fastag-vehicle-input"
                placeholder="e.g. KA01AM3300 or GJ01AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono uppercase text-sm"
                maxLength={12}
              />
              <Button
                id="fastag-search-btn"
                onClick={handleSearch}
                disabled={loading}
                className="gap-2 shrink-0"
              >
                {loading ? (
                  <IconRefresh className="h-4 w-4 animate-spin" />
                ) : (
                  <IconSearch className="h-4 w-4" />
                )}
                {loading ? 'Searching...' : 'Track'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Powered by FASTag Toll Crossing Data — tracks market &amp; self vehicles via NETC
              FASTag toll movement.
            </p>
          </CardContent>
        </Card>

        {/* ── Error State ── */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <IconAlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Tracking Failed</p>
              <p className="text-xs mt-1 text-rose-600">{error}</p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-4">
            {/* Demo data banner */}
            {isDemoData && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-700">
                <IconInfoCircle className="h-4 w-4 shrink-0" />
                <p className="text-xs font-medium">
                  <strong>Demo Mode:</strong> Showing realistic simulated FASTag data. Connect a live
                  FASTAG_COMPANY_ID in server <code className="bg-amber-100 px-1 rounded">.env</code>{' '}
                  for real tracking.
                </p>
              </div>
            )}

            {/* ── Header Info ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground font-mono">
                    {result.vehicleNumber}
                  </h2>
                  {tagConfig && (
                    <span
                      className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-0.5 text-xs font-semibold ${tagConfig.color}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${tagConfig.dot}`} />
                      {result.tagStatus}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{result.issuerBank}</span>
                  <span>·</span>
                  <span>{result.vehicleClass}</span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">Tag: {result.tagId}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-foreground">₹{result.walletBalance}</p>
                <p className="text-xs text-muted-foreground">Wallet Balance</p>
              </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Last Plaza"
                value={result.lastPlaza || '—'}
                icon={<IconBuildingArch className="h-4 w-4" />}
                sub={result.lastState}
              />
              <StatCard
                label="Last Crossing"
                value={timeAgo(result.lastCrossingTime) || '—'}
                icon={<IconClock className="h-4 w-4" />}
                sub={formatDateTime(result.lastCrossingTime)}
              />
              <StatCard
                label="Total Crossings (48h)"
                value={String(result.totalTransactions)}
                icon={<IconRoute className="h-4 w-4" />}
                sub="Last 48 hours"
                highlight="blue"
              />
              <StatCard
                label="Tag Status"
                value={result.tagStatus}
                icon={<IconCreditCard className="h-4 w-4" />}
                sub={`Via ${result.issuerBank}`}
                highlight={
                  result.tagStatus === 'Active'
                    ? 'green'
                    : result.tagStatus === 'Low Balance'
                    ? 'amber'
                    : result.tagStatus === 'Blacklisted'
                    ? 'red'
                    : undefined
                }
              />
            </div>

            {/* ── Toll Crossing Timeline ── */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/50">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <IconMapPin className="h-4 w-4 text-blue-600" />
                    Toll Crossing History
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {result.tollCrossings.length} crossing(s) · Most recent first
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {result.tollCrossings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <IconRoute className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No toll crossings found for this vehicle in the last 48 hours.</p>
                  </div>
                ) : (
                  <div>
                    {result.tollCrossings.map((crossing, i) => (
                      <CrossingCard key={crossing.transactionId || i} crossing={crossing} index={i} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Raw API Response (collapsible) ── */}
            <details className="group rounded-xl border border-border overflow-hidden">
              <summary className="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2">
                  <IconInfoCircle className="h-3.5 w-3.5" />
                  Raw API Response
                </span>
                <span className="text-[10px] group-open:hidden">Click to expand</span>
                <span className="text-[10px] hidden group-open:block">Click to collapse</span>
              </summary>
              <div className="border-t border-border bg-muted/30 p-4">
                <pre className="text-[10px] font-mono text-muted-foreground overflow-auto max-h-64 whitespace-pre-wrap break-all">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}

        {/* ── Empty state ── */}
        {!result && !error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
              <IconTruck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Track Any Vehicle via FASTag
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Enter a vehicle registration number above to view its recent toll plaza crossings,
              FASTag status, and wallet balance.
            </p>
          </div>
        )}
      </Layout.Body>
    </Layout>
  );
}
