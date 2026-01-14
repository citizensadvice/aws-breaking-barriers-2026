export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  fileName?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  validFiles: File[];
  invalidFiles: File[];
}

export interface FileValidationConfig {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export interface FileValidatorProps {
  files: File[];
  config: FileValidationConfig;
  onValidationResult: (result: ValidationResult) => void;
  showRequirements?: boolean;
  className?: string;
}

export type ValidationErrorCode = 
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_FILE'
  | 'INVALID_FILE_NAME';

export const DEFAULT_VALIDATION_CONFIG: FileValidationConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  allowedExtensions: ['pdf', 'doc', 'docx', 'html', 'htm', 'txt', 'ppt', 'pptx']
};