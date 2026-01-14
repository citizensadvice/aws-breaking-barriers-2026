/**
 * Document Service - Core business logic for document operations
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  DeleteCommand, 
  QueryCommand,
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BedrockAgentClient, StartIngestionJobCommand } from '@aws-sdk/client-bedrock-agent';

import { 
  Document, 
  DocumentMetadataInput, 
  DocumentSummary,
  DynamoDBDocumentItem 
} from '../../shared/types';
import { extractFileExtension, validateFile } from '../../shared/file-validation';
import { documentMetadataInputSchema } from '../../shared/validation';
import { UserContext, ListDocumentsResponse } from './types';
import {
  generateDocumentId,
  generateS3Key,
  generateMetadataS3Key,
  getCurrentTimestamp,
  getDefaultSensitivity,
  getInitialVersion,
  documentToDynamoDBItem,
  dynamoDBItemToDocument,
  createBedrockMetadata,
} from './utils';

const s3Client = new S3Client({});
const dynamoDBClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockAgentClient = new BedrockAgentClient({});

const BUCKET_NAME = process.env.DOCUMENTS_BUCKET_NAME || '';
const TABLE_NAME = process.env.DOCUMENTS_TABLE_NAME || '';
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID || '';
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID || '';
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

export interface CreateDocumentParams {
  fileName: string;
  fileContent: Buffer;
  metadata: DocumentMetadataInput;
  user: UserContext;
}

export interface UpdateDocumentParams {
  documentId: string;
  fileName?: string;
  fileContent?: Buffer;
  metadata?: Partial<DocumentMetadataInput>;
  user: UserContext;
}

export interface ListDocumentsParams {
  user: UserContext;
  page?: number;
  pageSize?: number;
  location?: string;
  category?: string;
  fileExtension?: string;
  sensitivity?: number;
}

/**
 * Create a new document
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 2.6, 2.7
 */
export async function createDocument(params: CreateDocumentParams): Promise<Document> {
  const { fileName, fileContent, metadata, user } = params;

  // Validate file type and size
  const fileValidation = validateFile(fileName, fileContent.length);
  if (!fileValidation.isValid) {
    throw new Error(fileValidation.error?.message || 'File validation failed');
  }

  // Validate metadata
  const metadataValidation = documentMetadataInputSchema.safeParse(metadata);
  if (!metadataValidation.success) {
    throw new Error(metadataValidation.error.errors[0].message);
  }

  const documentId = generateDocumentId();
  const timestamp = getCurrentTimestamp();
  const fileExtension = extractFileExtension(fileName) || '';
  const s3Key = generateS3Key(metadata.location, documentId, fileName);

  // Create document record
  const document: Document = {
    id: documentId,
    userId: user.userId,
    organizationId: user.organizationId,
    fileName,
    fileExtension,
    s3Key,
    location: metadata.location,
    category: metadata.category,
    expiryDate: metadata.expiryDate,
    sensitivity: metadata.sensitivity ?? getDefaultSensitivity(),
    version: getInitialVersion(),
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Upload file to S3
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: getContentType(fileExtension),
  }));

  // Create Bedrock metadata file
  const metadataS3Key = generateMetadataS3Key(metadata.location, documentId);
  const bedrockMetadata = createBedrockMetadata(document);
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: metadataS3Key,
    Body: JSON.stringify(bedrockMetadata),
    ContentType: 'application/json',
  }));

  // Store metadata in DynamoDB
  const dynamoItem = documentToDynamoDBItem(document);
  await dynamoDBClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: dynamoItem,
  }));

  // Trigger Knowledge Base ingestion
  await triggerKnowledgeBaseIngestion();

  return document;
}

/**
 * Trigger Bedrock Knowledge Base ingestion job
 * This syncs new documents to the Knowledge Base for semantic search
 */
async function triggerKnowledgeBaseIngestion(): Promise<void> {
  if (!KNOWLEDGE_BASE_ID || !DATA_SOURCE_ID) {
    console.warn('Knowledge Base ID or Data Source ID not configured, skipping ingestion');
    return;
  }

  try {
    console.log('Starting Knowledge Base ingestion job...');
    const response = await bedrockAgentClient.send(new StartIngestionJobCommand({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      dataSourceId: DATA_SOURCE_ID,
    }));
    console.log('Ingestion job started:', response.ingestionJob?.ingestionJobId);
  } catch (error) {
    // Log but don't fail the document creation if ingestion fails
    console.error('Failed to start ingestion job:', error);
  }
}


/**
 * Get document by ID
 * Requirements: 7.1
 */
export async function getDocument(
  documentId: string, 
  user: UserContext
): Promise<{ document: Document; downloadUrl: string } | null> {
  const result = await dynamoDBClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DOC#${documentId}`,
      SK: 'META',
    },
  }));

  if (!result.Item) {
    return null;
  }

  const document = dynamoDBItemToDocument(result.Item as DynamoDBDocumentItem);

  // Check authorization
  if (!isAuthorized(document, user)) {
    return null;
  }

  // Generate presigned URL for download
  const downloadUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: document.s3Key,
    }),
    { expiresIn: PRESIGNED_URL_EXPIRY }
  );

  return { document, downloadUrl };
}

/**
 * Update document
 * Requirements: 2.8, 7.2, 7.3
 */
export async function updateDocument(params: UpdateDocumentParams): Promise<Document | null> {
  const { documentId, fileName, fileContent, metadata, user } = params;

  // Get existing document
  const result = await dynamoDBClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DOC#${documentId}`,
      SK: 'META',
    },
  }));

  if (!result.Item) {
    return null;
  }

  const existingDoc = dynamoDBItemToDocument(result.Item as DynamoDBDocumentItem);

  // Check authorization for modification
  if (!canModify(existingDoc, user)) {
    throw new Error('You do not have permission to modify this document');
  }

  const timestamp = getCurrentTimestamp();
  let newS3Key = existingDoc.s3Key;
  let newFileName = existingDoc.fileName;
  let newFileExtension = existingDoc.fileExtension;

  // If new file is provided, upload it
  if (fileName && fileContent) {
    const fileValidation = validateFile(fileName, fileContent.length);
    if (!fileValidation.isValid) {
      throw new Error(fileValidation.error?.message || 'File validation failed');
    }

    newFileName = fileName;
    newFileExtension = extractFileExtension(fileName) || '';
    // Use existing location or updated location for S3 key
    const locationForKey = metadata?.location ?? existingDoc.location;
    newS3Key = generateS3Key(locationForKey, documentId, fileName);

    // Delete old file if key changed
    if (newS3Key !== existingDoc.s3Key) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: existingDoc.s3Key,
      }));
    }

    // Upload new file
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: newS3Key,
      Body: fileContent,
      ContentType: getContentType(newFileExtension),
    }));
  }

  // Validate metadata if provided
  if (metadata) {
    const partialMetadata = {
      location: metadata.location ?? existingDoc.location,
      category: metadata.category,
      expiryDate: metadata.expiryDate,
      sensitivity: metadata.sensitivity,
    };
    const metadataValidation = documentMetadataInputSchema.safeParse(partialMetadata);
    if (!metadataValidation.success) {
      throw new Error(metadataValidation.error.errors[0].message);
    }
  }

  // Create updated document
  const updatedDoc: Document = {
    ...existingDoc,
    fileName: newFileName,
    fileExtension: newFileExtension,
    s3Key: newS3Key,
    location: metadata?.location ?? existingDoc.location,
    category: metadata?.category !== undefined ? metadata.category : existingDoc.category,
    expiryDate: metadata?.expiryDate !== undefined ? metadata.expiryDate : existingDoc.expiryDate,
    sensitivity: metadata?.sensitivity ?? existingDoc.sensitivity,
    version: existingDoc.version + 1, // Increment version
    updatedAt: timestamp,
  };

  // Update Bedrock metadata file
  const metadataS3Key = generateMetadataS3Key(updatedDoc.location, documentId);
  const bedrockMetadata = createBedrockMetadata(updatedDoc);
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: metadataS3Key,
    Body: JSON.stringify(bedrockMetadata),
    ContentType: 'application/json',
  }));

  // Update DynamoDB
  const dynamoItem = documentToDynamoDBItem(updatedDoc);
  await dynamoDBClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: dynamoItem,
  }));

  return updatedDoc;
}


/**
 * Delete document
 * Requirements: 7.4
 */
export async function deleteDocument(documentId: string, user: UserContext): Promise<boolean> {
  // Get existing document
  const result = await dynamoDBClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DOC#${documentId}`,
      SK: 'META',
    },
  }));

  if (!result.Item) {
    return false;
  }

  const document = dynamoDBItemToDocument(result.Item as DynamoDBDocumentItem);

  // Check authorization for deletion
  if (!canModify(document, user)) {
    throw new Error('You do not have permission to delete this document');
  }

  // Delete file from S3
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: document.s3Key,
  }));

  // Delete metadata file from S3
  const metadataS3Key = generateMetadataS3Key(document.location, documentId);
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: metadataS3Key,
  }));

  // Delete from DynamoDB
  await dynamoDBClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DOC#${documentId}`,
      SK: 'META',
    },
  }));

  return true;
}

/**
 * List documents with pagination and filtering
 * Requirements: 7.5, 7.6
 */
export async function listDocuments(params: ListDocumentsParams): Promise<ListDocumentsResponse> {
  const { user, page = 1, pageSize = 20, location, category, fileExtension, sensitivity } = params;

  // Build query based on user role
  let queryParams;
  
  if (user.role === 'admin') {
    // Admin can see all documents in their organization
    queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :orgPk',
      ExpressionAttributeValues: {
        ':orgPk': `ORG#${user.organizationId}`,
      } as Record<string, string | number>,
    };
  } else {
    // Regular users can only see their own documents
    queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :orgPk AND begins_with(GSI1SK, :userPrefix)',
      ExpressionAttributeValues: {
        ':orgPk': `ORG#${user.organizationId}`,
        ':userPrefix': `USER#${user.userId}#`,
      } as Record<string, string | number>,
    };
  }

  // Add filter expressions for metadata filtering
  const filterExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};

  if (location) {
    filterExpressions.push('#loc = :location');
    expressionAttributeNames['#loc'] = 'location';
    queryParams.ExpressionAttributeValues[':location'] = location;
  }

  if (category) {
    filterExpressions.push('category = :category');
    queryParams.ExpressionAttributeValues[':category'] = category;
  }

  if (fileExtension) {
    filterExpressions.push('fileExtension = :fileExtension');
    queryParams.ExpressionAttributeValues[':fileExtension'] = fileExtension;
  }

  if (sensitivity !== undefined) {
    filterExpressions.push('sensitivity = :sensitivity');
    queryParams.ExpressionAttributeValues[':sensitivity'] = sensitivity;
  }

  if (filterExpressions.length > 0) {
    (queryParams as any).FilterExpression = filterExpressions.join(' AND ');
  }

  if (Object.keys(expressionAttributeNames).length > 0) {
    (queryParams as any).ExpressionAttributeNames = expressionAttributeNames;
  }

  const result = await dynamoDBClient.send(new QueryCommand(queryParams));

  const allDocuments = (result.Items || []).map(item => 
    dynamoDBItemToDocument(item as DynamoDBDocumentItem)
  );

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDocs = allDocuments.slice(startIndex, endIndex);

  const documents: DocumentSummary[] = paginatedDocs.map(doc => ({
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
    totalCount: allDocuments.length,
    page,
    pageSize,
    hasMore: endIndex < allDocuments.length,
  };
}

/**
 * Check if user is authorized to view document
 * Requirements: 6.1, 6.2, 6.3
 */
function isAuthorized(document: Document, user: UserContext): boolean {
  // Must be in same organization
  if (document.organizationId !== user.organizationId) {
    return false;
  }

  // Admin can access all documents in their organization
  if (user.role === 'admin') {
    return true;
  }

  // Regular users can only access their own documents
  return document.userId === user.userId;
}

/**
 * Check if user can modify document
 * Requirements: 6.4
 */
function canModify(document: Document, user: UserContext): boolean {
  // Must be in same organization
  if (document.organizationId !== user.organizationId) {
    return false;
  }

  // Admin can modify all documents in their organization
  if (user.role === 'admin') {
    return true;
  }

  // Regular users can only modify their own documents
  return document.userId === user.userId;
}

/**
 * Get content type based on file extension
 */
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}
