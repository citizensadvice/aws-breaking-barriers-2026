/**
 * Utility functions for Document Lambda handlers
 * Requirements: 2.2, 2.6, 2.7
 */

import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, ErrorResponse, UserContext } from './types';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Document, DynamoDBDocumentItem, BedrockMetadataFile } from '../../shared/types';

/**
 * Generate a unique document ID
 */
export function generateDocumentId(): string {
  return uuidv4();
}

/**
 * Generate S3 key for document storage
 * Format: {organizationId}/{documentId}/{fileName}
 */
export function generateS3Key(organizationId: string, documentId: string, fileName: string): string {
  return `${organizationId}/${documentId}/${fileName}`;
}

/**
 * Generate S3 key for Bedrock metadata file
 * Format: {organizationId}/{documentId}/{documentId}.metadata.json
 */
export function generateMetadataS3Key(organizationId: string, documentId: string): string {
  return `${organizationId}/${documentId}/${documentId}.metadata.json`;
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get default sensitivity value (3)
 * Requirements: 2.6
 */
export function getDefaultSensitivity(): number {
  return 3;
}

/**
 * Get initial version number (1)
 * Requirements: 2.7
 */
export function getInitialVersion(): number {
  return 1;
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(data: T, statusCode = 200): ApiResponse<T> {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify(data),
  };
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  statusCode: number
): ApiResponse<ErrorResponse> {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({ error, message }),
  };
}

/**
 * Extract user context from API Gateway event
 * In production, this would parse the JWT token from Cognito
 */
export function extractUserContext(event: APIGatewayProxyEvent): UserContext | null {
  const claims = event.requestContext.authorizer?.claims;
  
  if (!claims) {
    return null;
  }

  return {
    userId: claims.sub || claims['cognito:username'],
    email: claims.email,
    organizationId: claims['custom:organizationId'],
    role: claims['custom:role'] as 'admin' | 'user',
  };
}

/**
 * Convert Document to DynamoDB item
 */
export function documentToDynamoDBItem(doc: Document): DynamoDBDocumentItem {
  return {
    PK: `DOC#${doc.id}`,
    SK: 'META',
    GSI1PK: `ORG#${doc.organizationId}`,
    GSI1SK: `USER#${doc.userId}#${doc.createdAt}`,
    GSI2PK: `ORG#${doc.organizationId}`,
    GSI2SK: `LOC#${doc.location}#${doc.createdAt}`,
    id: doc.id,
    userId: doc.userId,
    organizationId: doc.organizationId,
    fileName: doc.fileName,
    fileExtension: doc.fileExtension,
    s3Key: doc.s3Key,
    location: doc.location,
    category: doc.category,
    sensitivity: doc.sensitivity,
    expiryDate: doc.expiryDate,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert DynamoDB item to Document
 */
export function dynamoDBItemToDocument(item: DynamoDBDocumentItem): Document {
  return {
    id: item.id,
    userId: item.userId,
    organizationId: item.organizationId,
    fileName: item.fileName,
    fileExtension: item.fileExtension,
    s3Key: item.s3Key,
    location: item.location,
    category: item.category,
    sensitivity: item.sensitivity,
    expiryDate: item.expiryDate,
    version: item.version,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/**
 * Create Bedrock metadata file content
 */
export function createBedrockMetadata(doc: Document): BedrockMetadataFile {
  return {
    metadataAttributes: {
      documentId: doc.id,
      organizationId: doc.organizationId,
      userId: doc.userId,
      location: doc.location,
      category: doc.category,
      sensitivity: doc.sensitivity,
      fileExtension: doc.fileExtension,
    },
  };
}
