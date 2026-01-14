/**
 * Search Service - Core business logic for search operations
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from '@aws-sdk/client-bedrock-agent-runtime';

import { DocumentSummary, DynamoDBDocumentItem, Document } from '../../shared/types';
import {
  UserContext,
  MetadataSearchRequest,
  MetadataSearchResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
  SemanticSearchResultItem,
} from './types';

const dynamoDBClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockAgentRuntimeClient({});

const TABLE_NAME = process.env.DOCUMENTS_TABLE_NAME || '';
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID || '';

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_RESULTS = 10;

/**
 * Search documents by metadata filters
 * Requirements: 4.2, 4.4, 4.5
 */
export async function searchByMetadata(
  request: MetadataSearchRequest,
  user: UserContext
): Promise<MetadataSearchResponse> {
  const page = request.page ?? 1;
  const pageSize = request.pageSize ?? DEFAULT_PAGE_SIZE;

  // Build query based on user role
  const queryParams = buildMetadataQuery(request, user);

  const result = await dynamoDBClient.send(new QueryCommand(queryParams));

  const allDocuments = (result.Items || []).map((item) =>
    dynamoDBItemToDocument(item as DynamoDBDocumentItem)
  );

  // Apply additional filters that can't be done in DynamoDB query
  const filteredDocuments = applyAdditionalFilters(allDocuments, request);

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDocs = filteredDocuments.slice(startIndex, endIndex);

  const documents: DocumentSummary[] = paginatedDocs.map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    fileExtension: doc.fileExtension,
    location: doc.location,
    category: doc.category,
    sensitivity: doc.sensitivity,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));

  return {
    documents,
    totalCount: filteredDocuments.length,
    page,
    pageSize,
    hasMore: endIndex < filteredDocuments.length,
  };
}


/**
 * Build DynamoDB query for metadata search
 * Requirements: 4.2, 4.5
 */
function buildMetadataQuery(
  request: MetadataSearchRequest,
  user: UserContext
): {
  TableName: string;
  IndexName: string;
  KeyConditionExpression: string;
  ExpressionAttributeValues: Record<string, string | number>;
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
} {
  const expressionAttributeValues: Record<string, string | number> = {};
  const filterExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};

  let keyConditionExpression: string;
  let indexName: string;

  // Use location-based GSI if location filter is provided
  if (request.location) {
    indexName = 'GSI2';
    keyConditionExpression = 'GSI2PK = :orgPk AND begins_with(GSI2SK, :locPrefix)';
    expressionAttributeValues[':orgPk'] = `ORG#${user.organizationId}`;
    expressionAttributeValues[':locPrefix'] = `LOC#${request.location}#`;
  } else if (user.role === 'admin') {
    // Admin can see all documents in their organization
    indexName = 'GSI1';
    keyConditionExpression = 'GSI1PK = :orgPk';
    expressionAttributeValues[':orgPk'] = `ORG#${user.organizationId}`;
  } else {
    // Regular users can only see their own documents
    indexName = 'GSI1';
    keyConditionExpression = 'GSI1PK = :orgPk AND begins_with(GSI1SK, :userPrefix)';
    expressionAttributeValues[':orgPk'] = `ORG#${user.organizationId}`;
    expressionAttributeValues[':userPrefix'] = `USER#${user.userId}#`;
  }

  // Add filter for user documents when using GSI2 (location-based)
  if (request.location && user.role !== 'admin') {
    filterExpressions.push('userId = :userId');
    expressionAttributeValues[':userId'] = user.userId;
  }

  // Add category filter
  if (request.category) {
    filterExpressions.push('category = :category');
    expressionAttributeValues[':category'] = request.category;
  }

  // Add file extension filter
  if (request.fileExtension) {
    filterExpressions.push('fileExtension = :fileExtension');
    expressionAttributeValues[':fileExtension'] = request.fileExtension;
  }

  // Add exact sensitivity filter
  if (request.sensitivity !== undefined) {
    filterExpressions.push('sensitivity = :sensitivity');
    expressionAttributeValues[':sensitivity'] = request.sensitivity;
  }

  // Add sensitivity range filters
  if (request.minSensitivity !== undefined) {
    filterExpressions.push('sensitivity >= :minSensitivity');
    expressionAttributeValues[':minSensitivity'] = request.minSensitivity;
  }

  if (request.maxSensitivity !== undefined) {
    filterExpressions.push('sensitivity <= :maxSensitivity');
    expressionAttributeValues[':maxSensitivity'] = request.maxSensitivity;
  }

  // Add expiry date filters
  if (request.expiryDateBefore) {
    filterExpressions.push('expiryDate < :expiryBefore');
    expressionAttributeValues[':expiryBefore'] = request.expiryDateBefore;
    expressionAttributeNames['#expiryDate'] = 'expiryDate';
  }

  if (request.expiryDateAfter) {
    filterExpressions.push('expiryDate > :expiryAfter');
    expressionAttributeValues[':expiryAfter'] = request.expiryDateAfter;
  }

  const queryParams: {
    TableName: string;
    IndexName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, string | number>;
    FilterExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
  } = {
    TableName: TABLE_NAME,
    IndexName: indexName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  if (filterExpressions.length > 0) {
    queryParams.FilterExpression = filterExpressions.join(' AND ');
  }

  if (Object.keys(expressionAttributeNames).length > 0) {
    queryParams.ExpressionAttributeNames = expressionAttributeNames;
  }

  return queryParams;
}

/**
 * Apply additional filters that can't be done in DynamoDB query
 * Requirements: 4.2
 */
function applyAdditionalFilters(
  documents: Document[],
  request: MetadataSearchRequest
): Document[] {
  let filtered = documents;

  // Filter by expiry date range (if both are provided)
  if (request.expiryDateBefore && request.expiryDateAfter) {
    filtered = filtered.filter((doc) => {
      if (!doc.expiryDate) return false;
      return doc.expiryDate > request.expiryDateAfter! && doc.expiryDate < request.expiryDateBefore!;
    });
  }

  return filtered;
}

/**
 * Convert DynamoDB item to Document
 */
function dynamoDBItemToDocument(item: DynamoDBDocumentItem): Document {
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
 * Semantic search using Bedrock Knowledge Base
 * Requirements: 4.1, 4.3, 4.5
 */
export async function searchSemantic(
  request: SemanticSearchRequest,
  user: UserContext
): Promise<SemanticSearchResponse> {
  const maxResults = request.maxResults ?? DEFAULT_MAX_RESULTS;

  // Build retrieval filter for authorization
  const retrievalFilter = buildRetrievalFilter(request, user);

  const retrieveInput: RetrieveCommandInput = {
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: request.query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: maxResults,
        filter: retrievalFilter as any,
      },
    },
  };

  const response = await bedrockClient.send(new RetrieveCommand(retrieveInput));

  const results: SemanticSearchResultItem[] = (response.retrievalResults || []).map((retrievalResult) => {
    const metadata = retrievalResult.metadata || {};
    
    return {
      documentId: (metadata['documentId'] as string) || '',
      relevanceScore: retrievalResult.score || 0,
      textPassage: retrievalResult.content?.text || '',
      metadata: {
        location: metadata['location'] as string,
        category: metadata['category'] as string,
        sensitivity: metadata['sensitivity'] as number,
        fileExtension: metadata['fileExtension'] as string,
      },
    };
  });

  return {
    results,
    totalResults: results.length,
  };
}

/**
 * Build retrieval filter for Bedrock Knowledge Base
 * Ensures authorization filtering
 * Requirements: 4.5
 */
function buildRetrievalFilter(
  request: SemanticSearchRequest,
  user: UserContext
): Record<string, unknown> | undefined {
  const andConditions: Array<Record<string, unknown>> = [];

  // Always filter by organization for authorization
  andConditions.push({
    equals: {
      key: 'organizationId',
      value: user.organizationId,
    },
  });

  // For non-admin users, filter by userId
  if (user.role !== 'admin') {
    andConditions.push({
      equals: {
        key: 'userId',
        value: user.userId,
      },
    });
  }

  // Add location filter if provided
  if (request.filters?.location) {
    andConditions.push({
      equals: {
        key: 'location',
        value: request.filters.location,
      },
    });
  }

  // Add category filter if provided
  if (request.filters?.category) {
    andConditions.push({
      equals: {
        key: 'category',
        value: request.filters.category,
      },
    });
  }

  // Return filter with AND conditions
  if (andConditions.length === 1) {
    return andConditions[0];
  }

  return {
    andAll: andConditions,
  };
}
