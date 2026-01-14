/**
 * Zod validation schemas for Document Management Backend
 * Requirements: 2.1, 2.2, 2.5
 */

import { z } from 'zod';
import { SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './types';

/**
 * Sensitivity ranking validation (1-5)
 * Requirements: 2.5
 */
export const sensitivitySchema = z.number()
  .int()
  .min(1, 'Sensitivity must be at least 1')
  .max(5, 'Sensitivity must be at most 5');

/**
 * ISO date string validation
 */
export const isoDateSchema = z.string()
  .refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid ISO date format');

/**
 * Document metadata input validation schema
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export const documentMetadataInputSchema = z.object({
  location: z.string()
    .min(1, 'Location is required')
    .max(500, 'Location must be at most 500 characters'),
  category: z.string()
    .max(100, 'Category must be at most 100 characters')
    .optional(),
  expiryDate: isoDateSchema.optional(),
  sensitivity: sensitivitySchema.optional(),
});

/**
 * File extension validation
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */
export const fileExtensionSchema = z.string()
  .refine(
    (ext) => SUPPORTED_FILE_EXTENSIONS.includes(ext.toLowerCase() as any),
    (ext) => ({ message: `File type ${ext} is not supported. Supported types: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}` })
  );

/**
 * Google Docs URL validation
 * Requirements: 1.4
 */
export const googleDocsUrlSchema = z.string()
  .url('Invalid URL format')
  .refine(
    (url) => url.includes('docs.google.com') || url.includes('drive.google.com'),
    'URL must be a valid Google Docs or Google Drive link'
  );

/**
 * File name validation - extracts and validates extension
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */
export const fileNameSchema = z.string()
  .min(1, 'File name is required')
  .max(255, 'File name must be at most 255 characters')
  .refine(
    (name) => {
      const ext = getFileExtension(name);
      return ext !== null && SUPPORTED_FILE_EXTENSIONS.includes(ext.toLowerCase() as any);
    },
    (name) => {
      const ext = getFileExtension(name);
      return { message: `File type ${ext || 'unknown'} is not supported. Supported types: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}` };
    }
  );

/**
 * File size validation
 * Requirements: 1.6
 */
export const fileSizeSchema = z.number()
  .int()
  .positive('File size must be positive')
  .max(MAX_FILE_SIZE_BYTES, `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);

/**
 * Document upload request validation schema
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1
 */
export const documentUploadRequestSchema = z.object({
  file: z.instanceof(Buffer).optional(),
  fileName: z.string().optional(),
  googleDocsUrl: googleDocsUrlSchema.optional(),
  metadata: documentMetadataInputSchema,
}).refine(
  (data) => data.file !== undefined || data.googleDocsUrl !== undefined,
  'Either file or googleDocsUrl must be provided'
).refine(
  (data) => {
    if (data.file !== undefined && data.googleDocsUrl !== undefined) {
      return false;
    }
    return true;
  },
  'Cannot provide both file and googleDocsUrl'
).refine(
  (data) => {
    if (data.file !== undefined && !data.fileName) {
      return false;
    }
    return true;
  },
  'fileName is required when uploading a file'
);

/**
 * User role validation
 * Requirements: 6.1, 6.2
 */
export const userRoleSchema = z.enum(['admin', 'user']);

/**
 * User validation schema
 * Requirements: 5.2, 6.5
 */
export const userSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email format'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  role: userRoleSchema,
});

/**
 * Document status validation
 */
export const documentStatusSchema = z.enum(['active', 'processing', 'failed']);

/**
 * Full document validation schema
 */
export const documentSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  fileName: z.string().min(1),
  fileExtension: z.string().min(1),
  s3Key: z.string().min(1),
  location: z.string().min(1),
  category: z.string().optional(),
  expiryDate: isoDateSchema.optional(),
  sensitivity: sensitivitySchema,
  version: z.number().int().positive(),
  status: documentStatusSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

/**
 * Metadata search request validation
 * Requirements: 4.2, 4.4
 */
export const metadataSearchRequestSchema = z.object({
  location: z.string().optional(),
  category: z.string().optional(),
  fileExtension: z.string().optional(),
  sensitivity: sensitivitySchema.optional(),
  minSensitivity: sensitivitySchema.optional(),
  maxSensitivity: sensitivitySchema.optional(),
  expiryDateBefore: isoDateSchema.optional(),
  expiryDateAfter: isoDateSchema.optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

/**
 * Semantic search request validation
 * Requirements: 4.1
 */
export const semanticSearchRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(1000),
  filters: z.object({
    location: z.string().optional(),
    category: z.string().optional(),
  }).optional(),
  maxResults: z.number().int().positive().max(100).optional().default(10),
});

/**
 * Helper function to extract file extension from filename
 */
export function getFileExtension(fileName: string): string | null {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return null;
  }
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * Validate file type by extension
 * Requirements: 1.1, 1.2, 1.3, 1.5
 */
export function isValidFileType(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  if (!ext) return false;
  return SUPPORTED_FILE_EXTENSIONS.includes(ext as any);
}

/**
 * Validate file size
 * Requirements: 1.6
 */
export function isValidFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Validate sensitivity value
 * Requirements: 2.5
 */
export function isValidSensitivity(sensitivity: number): boolean {
  return Number.isInteger(sensitivity) && sensitivity >= 1 && sensitivity <= 5;
}

/**
 * Get default sensitivity value
 * Requirements: 2.6
 */
export function getDefaultSensitivity(): number {
  return 3;
}

/**
 * Get initial version number for new documents
 * Requirements: 2.7
 */
export function getInitialVersion(): number {
  return 1;
}
