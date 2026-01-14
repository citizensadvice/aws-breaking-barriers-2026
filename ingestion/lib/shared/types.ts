/**
 * Shared types and interfaces for Document Management Backend
 * Requirements: 2.1, 2.2, 2.5
 */

/**
 * Valid locations (organizations) for document upload
 */
export const VALID_LOCATIONS = ['croydon', 'manchester', 'arun-chichester'] as const;
export type ValidLocation = typeof VALID_LOCATIONS[number];

/**
 * Check if a location is valid
 */
export function isValidLocation(location: string): location is ValidLocation {
  return VALID_LOCATIONS.includes(location.toLowerCase() as ValidLocation);
}

/**
 * Get list of valid locations as a formatted string
 */
export function getValidLocationsString(): string {
  return VALID_LOCATIONS.join(', ');
}

/**
 * Supported file extensions for document upload
 * Requirements: 1.1, 1.2, 1.3
 */
export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.html'] as const;
export type SupportedFileExtension = typeof SUPPORTED_FILE_EXTENSIONS[number];

/**
 * Maximum file size in bytes (50MB)
 * Requirements: 1.6
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Document status values
 */
export type DocumentStatus = 'active' | 'processing' | 'failed';

/**
 * User roles for authorization
 * Requirements: 6.1, 6.2
 */
export type UserRole = 'admin' | 'user';

/**
 * User interface representing authenticated user
 * Requirements: 5.2, 6.5
 */
export interface User {
  userId: string;
  email: string;
  organizationId: string;
  role: UserRole;
}

/**
 * Cognito JWT token payload structure
 * Requirements: 5.2
 */
export interface CognitoTokenPayload {
  sub: string;
  email: string;
  'custom:organizationId': string;
  'custom:role': string;
}

/**
 * Document metadata provided during upload
 * Requirements: 2.1, 2.3, 2.4, 2.5
 */
export interface DocumentMetadataInput {
  location: string;           // Required: where doc applies
  category?: string;          // Optional: custom category
  expiryDate?: string;        // Optional: ISO date string
  sensitivity?: number;       // Optional: 1-5 ranking (default: 3)
}

/**
 * Complete document metadata stored in database
 * Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.9
 */
export interface DocumentMetadata {
  location: string;
  fileExtension: string;
  category?: string;
  expiryDate?: string;
  sensitivity: number;        // 1-5 ranking (default: 3)
  version: number;
}

/**
 * Full document record stored in DynamoDB
 * Requirements: 2.1, 2.2, 2.5, 2.6, 2.7, 2.9
 */
export interface Document {
  id: string;
  userId: string;
  organizationId: string;
  fileName: string;
  fileExtension: string;
  s3Key: string;
  location: string;
  category?: string;
  expiryDate?: string;
  sensitivity: number;        // 1-5 ranking (default: 3)
  version: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Document upload request structure
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1
 */
export interface DocumentUploadRequest {
  file?: Buffer;              // For direct upload
  fileName?: string;          // Original file name
  googleDocsUrl?: string;     // For Google Docs
  metadata: DocumentMetadataInput;
}

/**
 * Document summary for list/search results
 */
export interface DocumentSummary {
  id: string;
  fileName: string;
  fileExtension: string;
  location: string;
  category?: string;
  sensitivity: number;
  version: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversion request for Google Docs and PowerPoint
 * Requirements: 1.3, 1.4
 */
export interface ConversionRequest {
  documentId: string;
  sourceType: 'google-docs' | 'powerpoint';
  sourceUrl?: string;         // For Google Docs
  s3Key?: string;             // For PowerPoint
}

/**
 * Conversion result
 */
export interface ConversionResult {
  documentId: string;
  convertedS3Key: string;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

/**
 * Metadata search request
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
 * Semantic search request
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
 * Search result structure
 * Requirements: 4.4
 */
export interface SearchResult {
  documents: DocumentSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Semantic search result
 * Requirements: 4.1, 4.3
 */
export interface SemanticSearchResult {
  results: {
    documentId: string;
    relevanceScore: number;
    textPassage: string;
    metadata: DocumentMetadata;
  }[];
}

/**
 * DynamoDB document item structure
 */
export interface DynamoDBDocumentItem {
  PK: string;                 // DOC#{documentId}
  SK: string;                 // META
  GSI1PK: string;             // ORG#{organizationId}
  GSI1SK: string;             // USER#{userId}#{createdAt}
  GSI2PK: string;             // ORG#{organizationId}
  GSI2SK: string;             // LOC#{location}#{createdAt}
  id: string;
  userId: string;
  organizationId: string;
  fileName: string;
  fileExtension: string;
  s3Key: string;
  location: string;
  category?: string;
  sensitivity: number;
  expiryDate?: string;
  version: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Bedrock KB metadata file structure
 */
export interface BedrockMetadataFile {
  metadataAttributes: {
    documentId: string;
    organizationId: string;
    userId: string;
    location: string;
    category?: string;
    sensitivity: number;
    fileExtension: string;
  };
}
