import { VehicleWorkflowDraft } from './types';

export interface VehicleWorkflowValidationResult {
  isValid: boolean;
  missingDocuments: string[];
  missingUploads: string[];
  hasPhotos: boolean;
  hasLookup: boolean;
}

export function validateVehicleWorkflowDraft(draft: VehicleWorkflowDraft): VehicleWorkflowValidationResult {
  const missingDocuments = [] as string[];
  const missingUploads = [] as string[];
  const hasLookup = draft.lookupStatus === 'success' && !!draft.lookupResult;
  const hasPhotos = draft.photos.length > 0;

  return {
    isValid: hasLookup,
    missingDocuments,
    missingUploads,
    hasPhotos,
    hasLookup,
  };
}
