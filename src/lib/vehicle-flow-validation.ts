/**
 * Frontend Vehicle Flow Validation Helpers
 * Client-side validation before submitting to backend
 */

import { VALIDATION_CONFIG, ERROR_MESSAGES } from './vehicle-flow.constants';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate vehicle number
 */
export function validateVehicleNumber(vehicleNumber: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!vehicleNumber || vehicleNumber.trim() === '') {
    errors.push({
      field: 'vehicleNumber',
      message: 'Vehicle number is required',
      code: 'REQUIRED'
    });
    return { valid: false, errors };
  }
  
  const normalized = vehicleNumber.trim().toUpperCase();
  
  if (!VALIDATION_CONFIG.VEHICLE_NUMBER.pattern.test(normalized)) {
    errors.push({
      field: 'vehicleNumber',
      message: VALIDATION_CONFIG.VEHICLE_NUMBER.message,
      code: 'INVALID_FORMAT'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate driver phone
 */
export function validateDriverPhone(phone: string | undefined): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Phone is optional
  if (!phone || phone.trim() === '') {
    return { valid: true, errors };
  }
  
  const normalized = phone.trim();
  
  // Check Indian format first
  const indianPattern = /^[6-9]\d{9}$/;
  const internationalPattern = VALIDATION_CONFIG.DRIVER_PHONE.pattern_alt;
  
  if (!indianPattern.test(normalized) && !internationalPattern.test(normalized)) {
    errors.push({
      field: 'driverPhone',
      message: VALIDATION_CONFIG.DRIVER_PHONE.message,
      code: 'INVALID_FORMAT'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate destination field
 */
export function validateDestination(
  destination: string | undefined,
  fieldName: string = 'Destination'
): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!destination || destination.trim() === '') {
    errors.push({
      field: fieldName.toLowerCase(),
      message: `${fieldName} is required`,
      code: 'REQUIRED'
    });
    return { valid: false, errors };
  }
  
  const normalized = destination.trim();
  const { minLength, maxLength } = VALIDATION_CONFIG.DESTINATION;
  
  if (normalized.length < minLength) {
    errors.push({
      field: fieldName.toLowerCase(),
      message: `${fieldName} too short (minimum ${minLength} characters)`,
      code: 'TOO_SHORT'
    });
  }
  
  if (normalized.length > maxLength) {
    errors.push({
      field: fieldName.toLowerCase(),
      message: `${fieldName} too long (maximum ${maxLength} characters)`,
      code: 'TOO_LONG'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate notes field
 */
export function validateNotes(notes: string | undefined): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Notes are optional
  if (!notes || notes.trim() === '') {
    return { valid: true, errors };
  }
  
  const { maxLength } = VALIDATION_CONFIG.NOTES;
  
  if (notes.length > maxLength) {
    errors.push({
      field: 'notes',
      message: `Notes exceed maximum length (${maxLength} characters)`,
      code: 'TOO_LONG'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate single photo file
 */
export function validatePhotoFile(file: File): ValidationError | null {
  const { maxFileSize, allowedMimeTypes, message } = VALIDATION_CONFIG.PHOTOS;
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      field: 'photo',
      message: `${message.fileType}. Got: ${file.type}`,
      code: 'INVALID_FILE_TYPE'
    };
  }
  
  // Check file size
  if (file.size > maxFileSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      field: 'photo',
      message: `${message.fileSize}. File size: ${sizeMB}MB`,
      code: 'FILE_TOO_LARGE'
    };
  }
  
  return null;
}

/**
 * Validate photo collection for a phase
 */
export function validatePhotoCollection(
  photos: File[] | undefined,
  phaseName: string = 'photos'
): ValidationResult {
  const errors: ValidationError[] = [];
  const { maxPhotosPerPhase, message } = VALIDATION_CONFIG.PHOTOS;
  
  if (!photos || photos.length === 0) {
    errors.push({
      field: phaseName,
      message: message.minPhotos,
      code: 'NO_PHOTOS'
    });
    return { valid: false, errors };
  }
  
  if (photos.length > maxPhotosPerPhase) {
    errors.push({
      field: phaseName,
      message: message.maxPhotos,
      code: 'TOO_MANY_PHOTOS'
    });
    return { valid: false, errors };
  }
  
  // Validate individual files
  const photoErrors = photos
    .map((file, index) => ({ file, index, error: validatePhotoFile(file) }))
    .filter(({ error }) => error !== null);
  
  if (photoErrors.length > 0) {
    photoErrors.forEach(({ index, error }) => {
      errors.push({
        field: `${phaseName}[${index}]`,
        message: error!.message,
        code: error!.code
      });
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate movement payload before gate-in
 */
export function validateGateInPayload(data: {
  vehicleNumber: string;
  transporterName: string;
  driverName?: string;
  driverPhone?: string;
  toDestination: string;
  fromDestination?: string;
  notes?: string;
  gateInPhotos?: File[];
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Vehicle number
  const vehicleResult = validateVehicleNumber(data.vehicleNumber);
  errors.push(...vehicleResult.errors);
  
  // Transporter name (required)
  if (!data.transporterName || data.transporterName.trim() === '') {
    errors.push({
      field: 'transporterName',
      message: 'Transporter name is required',
      code: 'REQUIRED'
    });
  }
  
  // Driver phone (optional but validate if provided)
  const phoneResult = validateDriverPhone(data.driverPhone);
  errors.push(...phoneResult.errors);
  
  // Destination
  const destResult = validateDestination(data.toDestination, 'Destination');
  errors.push(...destResult.errors);
  
  // From destination (optional but validate if provided)
  if (data.fromDestination) {
    const fromResult = validateDestination(data.fromDestination, 'From destination');
    errors.push(...fromResult.errors);
  }
  
  // Notes
  const notesResult = validateNotes(data.notes);
  errors.push(...notesResult.errors);
  
  // Photos (required for gate-in)
  const photoResult = validatePhotoCollection(data.gateInPhotos, 'Gate-in photos');
  errors.push(...photoResult.errors);
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate inspection checks completeness
 */
export function validateInspectionChecks(checks: Record<string, boolean>): ValidationResult {
  const errors: ValidationError[] = [];
  
  const requiredChecks = [
    'checkedTransporter',
    'checkedVehicle',
    'checkedRoute',
    'rcBook',
    'insurance',
    'permit',
    'puc',
    'fitness',
    'driverLicense'
  ];
  
  const unchecked = requiredChecks.filter(check => !checks[check]);
  
  if (unchecked.length > 0) {
    errors.push({
      field: 'inspectionChecks',
      message: `Missing checks: ${unchecked.join(', ')}`,
      code: 'INCOMPLETE'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate gate-out checks
 */
export function validateGateOutChecks(checks: Record<string, boolean>): ValidationResult {
  const errors: ValidationError[] = [];
  
  const requiredChecks = [
    'loadingComplete',
    'documentsReturned',
    'sealChecked',
    'exitApproved'
  ];
  
  const unchecked = requiredChecks.filter(check => !checks[check]);
  
  if (unchecked.length > 0) {
    errors.push({
      field: 'gateOutChecks',
      message: `Missing checks: ${unchecked.join(', ')}`,
      code: 'INCOMPLETE'
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(errorCode: string): string {
  const message = Object.values(ERROR_MESSAGES).find(m => m.title === errorCode);
  return message?.message || 'An error occurred. Please try again.';
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  errors.forEach(error => {
    if (!formatted[error.field]) {
      formatted[error.field] = error.message;
    }
  });
  
  return formatted;
}

/**
 * Check if all photos are valid
 */
export function arePhotosValid(files: File[]): boolean {
  if (!files || files.length === 0) return false;
  
  return files.every(file => validatePhotoFile(file) === null);
}

/**
 * Check if validation error is retriable
 */
export function isRetriableError(errorCode: string): boolean {
  const retriableCodes = [
    'NETWORK_ERROR',
    'REQUEST_IN_PROGRESS',
    'SERVER_ERROR'
  ];
  
  return retriableCodes.includes(errorCode);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 1000); // Limit length
}

/**
 * Format vehicle number to standard format
 */
export function formatVehicleNumber(vehicleNumber: string): string {
  return vehicleNumber.trim().toUpperCase().replace(/\s/g, '');
}

/**
 * Parse error response from API
 */
export function parseApiError(error: any): {
  code: string;
  message: string;
  details?: Record<string, string>;
  retriable: boolean;
} {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      retriable: false
    };
  }
  
  // Handle validation errors from backend
  if (error.validationErrors) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Please correct the highlighted errors',
      details: error.validationErrors,
      retriable: false
    };
  }
  
  // Handle specific error codes
  if (error.code) {
    return {
      code: error.code,
      message: error.message || 'An error occurred',
      details: error.details,
      retriable: isRetriableError(error.code)
    };
  }
  
  // Handle HTTP status codes
  if (error.status === 429) {
    return {
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please wait before trying again.',
      retriable: true
    };
  }
  
  if (error.status === 409) {
    return {
      code: 'CONFLICT',
      message: error.message || 'This resource was modified. Please refresh and try again.',
      retriable: true
    };
  }
  
  if (error.status === 503) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Server is temporarily unavailable. Please try again later.',
      retriable: true
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An error occurred',
    retriable: false
  };
}
