/**
 * File type and size validation for Document Management Backend
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
 */

import { z } from 'zod';
import { 
  SUPPORTED_FILE_EXTENSIONS, 
  MAX_FILE_SIZE_BYTES,
  SupportedFileExtension 
} from './types';

/**
 * Error codes for file validation
 */
export const FileValidationErrorCode = {
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  MISSING_FILE_NAME: 'MISSING_FILE_NAME',
  INVALID_FILE_NAME: 'INVALID_FILE_NAME',
} as const;

export type FileValidationErrorCode = typeof FileValidationErrorCode[keyof typeof FileValidationErrorCode];

/**
 * File validation error
 */
export class FileValidationError extends Error {
  constructor(
    public readonly code: FileValidationErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
  isValid: boolean;
  fileName?: string;
  fileExtension?: SupportedFileExtension;
  fileSize?: number;
  error?: FileValidationError;
}

/**
 * Extract file extension from filename
 * Returns lowercase extension including the dot (e.g., '.pdf')
 */
export function extractFileExtension(fileName: string): string | null {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }
  
  const trimmedName = fileName.trim();
  const lastDotIndex = trimmedName.lastIndexOf('.');
  
  // No dot found, or dot is at the start (hidden file), or dot is at the end
  if (lastDotIndex === -1 || lastDotIndex === 0 || lastDotIndex === trimmedName.length - 1) {
    return null;
  }
  
  return trimmedName.substring(lastDotIndex).toLowerCase();
}

/**
 * Check if file extension is supported
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */
export function isSupportedFileExtension(extension: string): extension is SupportedFileExtension {
  return SUPPORTED_FILE_EXTENSIONS.includes(extension.toLowerCase() as SupportedFileExtension);
}

/**
 * Check if file name has a supported extension
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */
export function hasSupportedExtension(fileName: string): boolean {
  const ext = extractFileExtension(fileName);
  return ext !== null && isSupportedFileExtension(ext);
}

/**
 * Check if file size is within limits
 * Requirements: 1.6
 */
export function isFileSizeValid(sizeInBytes: number): boolean {
  return Number.isFinite(sizeInBytes) && sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Get maximum file size in MB for error messages
 */
export function getMaxFileSizeMB(): number {
  return MAX_FILE_SIZE_BYTES / (1024 * 1024);
}

/**
 * Get list of supported file extensions as a formatted string
 */
export function getSupportedExtensionsString(): string {
  return SUPPORTED_FILE_EXTENSIONS.join(', ');
}

/**
 * Validate file type by file name
 * Requirements: 1.1, 1.2, 1.3, 1.5
 * 
 * @param fileName - The name of the file to validate
 * @returns FileValidationResult with validation status and extracted extension
 */
export function validateFileType(fileName: string): FileValidationResult {
  if (!fileName || typeof fileName !== 'string') {
    return {
      isValid: false,
      error: new FileValidationError(
        FileValidationErrorCode.MISSING_FILE_NAME,
        'File name is required'
      ),
    };
  }

  const trimmedName = fileName.trim();
  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        FileValidationErrorCode.MISSING_FILE_NAME,
        'File name is required'
      ),
    };
  }

  const extension = extractFileExtension(trimmedName);
  
  if (!extension) {
    return {
      isValid: false,
      fileName: trimmedName,
      error: new FileValidationError(
        FileValidationErrorCode.INVALID_FILE_NAME,
        'File name must have a valid extension'
      ),
    };
  }

  if (!isSupportedFileExtension(extension)) {
    return {
      isValid: false,
      fileName: trimmedName,
      error: new FileValidationError(
        FileValidationErrorCode.UNSUPPORTED_FILE_TYPE,
        `File type ${extension} is not supported. Supported types: ${getSupportedExtensionsString()}`
      ),
    };
  }

  return {
    isValid: true,
    fileName: trimmedName,
    fileExtension: extension as SupportedFileExtension,
  };
}

/**
 * Validate file size
 * Requirements: 1.6
 * 
 * @param sizeInBytes - The size of the file in bytes
 * @returns FileValidationResult with validation status
 */
export function validateFileSize(sizeInBytes: number): FileValidationResult {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return {
      isValid: false,
      error: new FileValidationError(
        FileValidationErrorCode.FILE_TOO_LARGE,
        'File size must be a positive number'
      ),
    };
  }

  if (sizeInBytes > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      fileSize: sizeInBytes,
      error: new FileValidationError(
        FileValidationErrorCode.FILE_TOO_LARGE,
        `File exceeds maximum size of ${getMaxFileSizeMB()}MB`
      ),
    };
  }

  return {
    isValid: true,
    fileSize: sizeInBytes,
  };
}

/**
 * Validate both file type and size
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
 * 
 * @param fileName - The name of the file to validate
 * @param sizeInBytes - The size of the file in bytes
 * @returns FileValidationResult with complete validation status
 */
export function validateFile(fileName: string, sizeInBytes: number): FileValidationResult {
  // First validate file type
  const typeResult = validateFileType(fileName);
  if (!typeResult.isValid) {
    return typeResult;
  }

  // Then validate file size
  const sizeResult = validateFileSize(sizeInBytes);
  if (!sizeResult.isValid) {
    return {
      ...sizeResult,
      fileName: typeResult.fileName,
      fileExtension: typeResult.fileExtension,
    };
  }

  return {
    isValid: true,
    fileName: typeResult.fileName,
    fileExtension: typeResult.fileExtension,
    fileSize: sizeInBytes,
  };
}

/**
 * Zod schema for file validation
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
 */
export const fileValidationSchema = z.object({
  fileName: z.string()
    .min(1, 'File name is required')
    .max(255, 'File name must be at most 255 characters')
    .refine(
      (name) => {
        const ext = extractFileExtension(name);
        return ext !== null;
      },
      'File name must have a valid extension'
    )
    .refine(
      (name) => hasSupportedExtension(name),
      (name) => {
        const ext = extractFileExtension(name);
        return { 
          message: `File type ${ext || 'unknown'} is not supported. Supported types: ${getSupportedExtensionsString()}` 
        };
      }
    ),
  fileSize: z.number()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, `File exceeds maximum size of ${getMaxFileSizeMB()}MB`),
});

/**
 * Type for validated file input
 */
export type ValidatedFileInput = z.infer<typeof fileValidationSchema>;
