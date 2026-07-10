import { IconPaperclip, IconTrash } from '@tabler/icons-react';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { REQUIRED_DOCUMENTS, VehicleDocumentKey, VehicleWorkflowDocumentUpload } from '../types';

interface VehicleDocumentChecklistProps {
  documents: Record<VehicleDocumentKey, boolean>;
  documentUploads: Record<VehicleDocumentKey, VehicleWorkflowDocumentUpload[]>;
  disabled?: boolean;
  missingDocuments?: string[];
  missingUploads?: string[];
  onToggle: (key: VehicleDocumentKey, checked: boolean) => void;
  onAddUpload: (key: VehicleDocumentKey, files: FileList | null) => void;
  onRemoveUpload: (key: VehicleDocumentKey, uploadId: string) => void;
}

export function VehicleDocumentChecklist({
  documents,
  documentUploads,
  disabled,
  missingDocuments = [],
  missingUploads = [],
  onToggle,
  onAddUpload,
  onRemoveUpload,
}: VehicleDocumentChecklistProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background p-3">
      <div>
        <p className="text-sm font-semibold">Required Documents</p>
        <p className="text-xs text-muted-foreground">Verify and upload every required document before entry approval.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {REQUIRED_DOCUMENTS.map(item => {
          const uploads = documentUploads[item.key] || [];
          const hasMissingCheck = missingDocuments.includes(item.label);
          const hasMissingUpload = missingUploads.includes(item.label);

          return (
            <div
              key={item.key}
              className={cn(
                'space-y-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2',
                (hasMissingCheck || hasMissingUpload) && 'border-amber-400/70'
              )}
            >
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={documents[item.key]}
                  disabled={disabled}
                  onCheckedChange={value => onToggle(item.key, Boolean(value))}
                />
                <span className="text-sm">{item.label}</span>
              </label>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {uploads.length > 0 ? `${uploads.length} file${uploads.length > 1 ? 's' : ''} uploaded` : 'Upload document proof'}
                </span>
                <label className={cn(
                  'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted',
                  disabled && 'pointer-events-none opacity-50'
                )}>
                  <IconPaperclip className="h-3 w-3" />
                  Upload
                  <input type="file" className="hidden" disabled={disabled} onChange={e => onAddUpload(item.key, e.target.files)} />
                </label>
              </div>

              {uploads.length > 0 && (
                <div className="space-y-1">
                  {uploads.map(upload => (
                    <div key={upload.id} className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5">
                      <span className="truncate text-[11px]">{upload.name}</span>
                      <button type="button" onClick={() => onRemoveUpload(item.key, upload.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                        <IconTrash className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {missingDocuments.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Missing verification: {missingDocuments.join(', ')}
        </p>
      )}
      {missingUploads.length > 0 && (
        <p className="text-xs text-destructive">
          Upload required: {missingUploads.join(', ')}
        </p>
      )}
    </div>
  );
}
