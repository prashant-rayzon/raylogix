import { VehicleLookupCard } from './VehicleLookupCard';
import { VehiclePhotoUploader } from './VehiclePhotoUploader';
import { VehicleWorkflowDraft } from '../types';

interface VehicleWorkflowSectionProps {
  vehicleNumber: string;
  saving?: boolean;
  draft: VehicleWorkflowDraft;
  onLookup: () => void;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (photoId: string) => void;
}

export function VehicleWorkflowSection(props: VehicleWorkflowSectionProps) {
  const {
    vehicleNumber,
    saving,
    draft,
    onLookup,
    onAddPhotos,
    onRemovePhoto,
  } = props;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="">
        <VehicleLookupCard
          vehicleNumber={vehicleNumber}
          status={draft.lookupStatus}
          message={draft.lookupMessage}
          result={draft.lookupResult}
          onLookup={onLookup}
        />
      </div>

      <div className="rounded-3xl border border-border/50 bg-background p-4 shadow-sm">
        <VehiclePhotoUploader
          photos={draft.photos}
          disabled={saving}
          onAddPhotos={onAddPhotos}
          onRemovePhoto={onRemovePhoto}
        />
      </div>
    </div>
  );
}
