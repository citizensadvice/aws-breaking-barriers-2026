/**
 * Types for Document Lambda handlers
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 2.6, 2.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { DocumentMetadataInput, Document, DocumentSummary } from '../../shared/types';

/**
 * API Gateway event body for document upload
 */
export interface UploadDocumentBody {
  fileName: string;
  fileContent: string;  // Base64 encoded file content
  googleDocsUrl?: string;
  metadata: DocumentMetadataInput;
}

/**
 * API Gateway event body for document update
 */
export interface UpdateDocumentBody {
  fileName?: string;
  fileContent?: string;  // Base64 encoded file content
  metadata?: Partial<DocumentMetadataInput>;
}

/**
 * API response structure
 */
export interface ApiResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Success response data for document operations
 */
export interface DocumentResponse {
  document: Document;
  downloadUrl?: string;
}

/**
 * List documents response
 */
export interface ListDocumentsResponse {
  documents: DocumentSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * User context extracted from JWT token
 */
export interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'user';
}

/**
 * Query parameters for list documents
 */
export interface ListDocumentsQuery {
  page?: string;
  pageSize?: string;
  location?: string;
  category?: string;
  fileExtension?: string;
  sensitivity?: string;
}
