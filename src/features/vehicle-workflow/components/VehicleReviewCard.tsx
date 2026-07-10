import { VehicleWorkflowDraft } from '../types';
import { validateVehicleWorkflowDraft } from '../validation';

interface VehicleReviewCardProps {
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  transporterName: string;
  fromDestination: string;
  toDestination: string;
  draft: VehicleWorkflowDraft;
}

export function VehicleReviewCard({
  vehicleNumber, driverName, driverPhone, transporterName, fromDestination, toDestination, draft,
}: VehicleReviewCardProps) {
  const validation = validateVehicleWorkflowDraft(draft);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
      <div>
        <p className="text-sm font-semibold">Final Review</p>
        <p className="text-xs text-muted-foreground">Check the complete entry before submission.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Vehicle', vehicleNumber || '—'],
          ['Driver', driverName || '—'],
          ['Phone', driverPhone || '—'],
          ['Transporter', transporterName || '—'],
          ['From', fromDestination || '—'],
          ['To', toDestination || '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/50 bg-background px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Lookup</p>
          <p className="text-sm font-semibold">{validation.hasLookup ? 'Ready' : 'Pending'}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Documents</p>
          <p className="text-sm font-semibold">{6 - validation.missingDocuments.length}/6 complete</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Photos</p>
          <p className="text-sm font-semibold">{draft.photos.length} uploaded</p>
        </div>
      </div>
    </div>
  );
}
