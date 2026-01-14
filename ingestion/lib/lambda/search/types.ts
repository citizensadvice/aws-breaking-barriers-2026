/**
 * Types for Search Lambda handlers
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { DocumentSummary, DocumentMetadata } from '../../shared/types';

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
 * Metadata search request body
 * Requirements: 4.2, 4.4
 */
export interface MetadataSearchRequest {
  location?: string;
  category?: string;
  fileExtension?: string;
  sensitivity?: number;
  minSensitivity?: number;
  maxSensitivity?: number;
  expiryDateBefore?: string;
  expiryDateAfter?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Semantic search request body
 * Requirements: 4.1, 4.3
 */
export interface SemanticSearchRequest {
  query: string;
  filters?: {
    location?: string;
    category?: string;
  };
  maxResults?: number;
}

/**
 * Metadata search response
 * Requirements: 4.4
 */
export interface MetadataSearchResponse {
  documents: DocumentSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Semantic search result item
 * Requirements: 4.1, 4.3
 */
export interface SemanticSearchResultItem {
  documentId: string;
  relevanceScore: number;
  textPassage: string;
  metadata: Partial<DocumentMetadata>;
}

/**
 * Semantic search response
 * Requirements: 4.1, 4.3
 */
export interface SemanticSearchResponse {
  results: SemanticSearchResultItem[];
  totalResults: number;
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
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
}
