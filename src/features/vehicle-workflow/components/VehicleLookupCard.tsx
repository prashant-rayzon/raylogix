import { IconLoader, IconRefresh, IconTruck } from '@tabler/icons-react';

import { Button } from '@/components/custom/button';
import { VehicleLookupResult } from '../types';
import { cn } from '@/lib/utils';

interface VehicleLookupCardProps {
  vehicleNumber: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  result: VehicleLookupResult | null;
  onLookup: () => void;
}

function StatusPill({ label, tone }: { label: string; tone: 'good' | 'warn' }) {
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
      tone === 'good'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    )}>
      {label}
    </span>
  );
}

export function VehicleLookupCard({
  vehicleNumber, status, message, result, onLookup,
}: VehicleLookupCardProps) {
  return (
    <div className="space-y-3 rounded-3xl border border-border/60 bg-background p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Vehicle Lookup</p>
          <p className="text-xs text-muted-foreground">Confirm registration details before creating the entry.</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 gap-2 text-xs"
          disabled={!vehicleNumber || status === 'loading'}
          onClick={onLookup}
        >
          {status === 'loading' ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconRefresh className="h-4 w-4" />}
          {status === 'loading' ? 'Checking' : 'Get Info'}
        </Button>
      </div>

      <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <IconTruck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-5">{result.vehicleNumber}</p>
                <p className="text-xs text-muted-foreground">{result.ownerName}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-background px-3 py-2 text-[11px] text-muted-foreground">
                <p className="uppercase tracking-wide">Vehicle Type</p>
                <p className="mt-1 text-sm font-medium text-foreground">{result.vehicleType}</p>
              </div>
              <div className="rounded-2xl bg-background px-3 py-2 text-[11px] text-muted-foreground">
                <p className="uppercase tracking-wide">Last Updated</p>
                <p className="mt-1 text-sm font-medium text-foreground">{new Date(result.lastUpdated).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label={`Registration: ${result.registrationStatus}`} tone={result.registrationStatus === 'active' ? 'good' : 'warn'} />
              <StatusPill label={`Permit: ${result.permitStatus}`} tone={result.permitStatus === 'valid' ? 'good' : 'warn'} />
              <StatusPill label={`Insurance: ${result.insuranceStatus}`} tone={result.insuranceStatus === 'valid' ? 'good' : 'warn'} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
            No vehicle lookup data yet.
          </div>
        )}
      </div>

      <p className={cn(
        'text-xs',
        status === 'error' ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {message}
      </p>
    </div>
  );
}
