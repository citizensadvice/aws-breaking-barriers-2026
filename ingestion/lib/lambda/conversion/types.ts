/**
 * Types for Conversion Lambda handlers
 * Requirements: 1.3, 1.4
 */

import { ConversionRequest, ConversionResult } from '../../shared/types';

/**
 * Extended conversion request with additional context
 */
export interface ConversionContext extends ConversionRequest {
  organizationId: string;
  userId: string;
  fileName?: string;
}

/**
 * Google Docs export formats
 */
export type GoogleDocsExportFormat = 'application/pdf';

/**
 * Google Docs API response structure
 */
export interface GoogleDocsExportResponse {
  content: Buffer;
  mimeType: string;
}

/**
 * PowerPoint conversion options
 */
export interface PowerPointConversionOptions {
  outputFormat: 'pdf';
  quality?: 'high' | 'medium' | 'low';
}

/**
 * Conversion error types
 */
export type ConversionErrorType = 
  | 'GOOGLE_DOCS_ACCESS_DENIED'
  | 'GOOGLE_DOCS_NOT_FOUND'
  | 'GOOGLE_DOCS_INVALID_URL'
  | 'POWERPOINT_CONVERSION_FAILED'
  | 'S3_UPLOAD_FAILED'
  | 'S3_DOWNLOAD_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * Conversion error structure
 */
export interface ConversionError {
  type: ConversionErrorType;
  message: string;
  retryable: boolean;
}

/**
 * Lambda invocation payload for conversion
 */
export interface ConversionLambdaPayload {
  conversionRequest: ConversionContext;
  retryCount?: number;
}

/**
 * Lambda response structure
 */
export interface ConversionLambdaResponse {
  statusCode: number;
  body: ConversionResult | { error: ConversionError };
}

export { ConversionRequest, ConversionResult };
