export interface DocumentMetadata {
  location: string;
  category?: string;
  expiryDate?: Date;
  title?: string;
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

  return {
    valid: errors.length === 0,
    errors
  };
};