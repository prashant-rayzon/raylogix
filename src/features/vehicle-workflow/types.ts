export type VehicleDocumentKey =
  | 'rcBook'
  | 'insurance'
  | 'permit'
  | 'puc'
  | 'fitness'
  | 'driverLicense';

export const REQUIRED_DOCUMENTS: Array<{ key: VehicleDocumentKey; label: string }> = [
  { key: 'rcBook', label: 'RC Book' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'permit', label: 'Permit' },
  { key: 'puc', label: 'PUC' },
  { key: 'fitness', label: 'Fitness' },
  { key: 'driverLicense', label: "Driver License" },
];

export interface VehicleWorkflowPhoto {
  id: string;
  name: string;
  previewUrl: string;
  addedAt: string;
  file?: File;
}

export interface VehicleWorkflowDocumentUpload {
  id: string;
  name: string;
  previewUrl?: string;
  addedAt: string;
  file?: File;
}

export interface VehicleLookupResult {
  vehicleNumber: string;
  ownerName: string;
  vehicleType: string;
  registrationStatus: 'active' | 'warning';
  permitStatus: 'valid' | 'expiring';
  insuranceStatus: 'valid' | 'expiring';
  lastUpdated: string;
}

export interface VehicleWorkflowDraft {
  lookupStatus: 'idle' | 'loading' | 'success' | 'error';
  lookupMessage: string;
  lookupResult: VehicleLookupResult | null;
  photos: VehicleWorkflowPhoto[];
}
