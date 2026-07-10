import { IconCamera, IconPhoto, IconTrash } from '@tabler/icons-react';

import { VehicleWorkflowPhoto } from '../types';
import { cn } from '@/lib/utils';

interface VehiclePhotoUploaderProps {
  photos: VehicleWorkflowPhoto[];
  disabled?: boolean;
  error?: string;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (photoId: string) => void;
}

export function VehiclePhotoUploader({
  photos, disabled, error, onAddPhotos, onRemovePhoto,
}: VehiclePhotoUploaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Vehicle Photos</p>
          <p className="text-xs text-muted-foreground">Upload clear photos of the vehicle <br/> and driver for verification.</p>
        </div>

        <label className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2 text-xs font-medium text-foreground transition hover:border-primary/70 hover:bg-primary/5',
          disabled && 'pointer-events-none opacity-50'
        )}>
          <IconCamera className="h-4 w-4" />
          Add Photos
          <input type="file" accept="image/*" multiple className="hidden" disabled={disabled} onChange={e => onAddPhotos(e.target.files)} />
        </label>
      </div>

      {photos.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map(photo => (
            <div key={photo.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/10 shadow-sm transition hover:border-primary/60">
              <div className="relative h-32 w-full overflow-hidden bg-slate-50">
                <img src={photo.previewUrl} alt={photo.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(photo.id)}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground transition hover:bg-destructive hover:text-white"
                  aria-label={`Remove ${photo.name}`}
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 px-3 py-3">
                <p className="truncate text-sm font-medium">{photo.name}</p>
                <p className="text-[11px] text-muted-foreground">Uploaded</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-7 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <IconPhoto className="h-5 w-5" />
            <span>No photos uploaded yet.</span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Photos are optional. Upload any supporting images if available.</p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
