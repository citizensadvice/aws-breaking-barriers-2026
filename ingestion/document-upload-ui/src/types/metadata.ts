export interface DocumentMetadata {
  location: string;
  category?: string;
  expiryDate?: Date;
  sensitivity?: number; // 1-5 sensitivity ranking (1=low, 5=high), default: 3
  applyToAll?: boolean; // for bulk uploads
}

export interface MetadataFormProps {
  files: File[];
  onMetadataChange: (metadata: DocumentMetadata) => void;
  allowBulkMetadata?: boolean;
  initialMetadata?: DocumentMetadata;
  disabled?: boolean;
  className?: string;
}

export interface MetadataValidationError {
  field: keyof DocumentMetadata;
  message: string;
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: MetadataValidationError[];
}

// Predefined categories for the dropdown
export const DEFAULT_CATEGORIES = [
  'Policy',
  'Procedure',
  'Manual',
  'Report',
  'Contract',
  'Invoice',
  'Presentation',
  'Training Material',
  'Legal Document',
  'Technical Documentation'
];

export const validateMetadata = (metadata: DocumentMetadata): MetadataValidationResult => {
  const errors: MetadataValidationError[] = [];

  // Location is required
  if (!metadata.location || metadata.location.trim().length === 0) {
    errors.push({
      field: 'location',
      message: 'Location is required'
    });
  }

  // Expiry date should be in the future if provided
  if (metadata.expiryDate && metadata.expiryDate <= new Date()) {
    errors.push({
      field: 'expiryDate',
      message: 'Expiry date must be in the future'
    });
  }

  // Sensitivity must be between 1 and 5 if provided
  if (metadata.sensitivity !== undefined && (metadata.sensitivity < 1 || metadata.sensitivity > 5)) {
    errors.push({
      field: 'sensitivity',
      message: 'Sensitivity must be between 1 and 5'
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};