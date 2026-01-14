/**
 * Document Lambda Handler
 * Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  UploadDocumentBody, 
  UpdateDocumentBody, 
  ListDocumentsQuery,
  UserContext 
} from './types';
import {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
} from './document-service';
import { createSuccessResponse, createErrorResponse, extractUserContext } from './utils';
import { convertGoogleDoc, validateGoogleDocsUrl } from '../conversion/google-docs-service';

/**
 * Main handler for document operations
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = extractUserContext(event);
    if (!user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const method = event.httpMethod;
    const documentId = event.pathParameters?.id;

    switch (method) {
      case 'POST':
        return handleUpload(event, user);
      case 'GET':
        if (documentId) {
          return handleGetDocument(documentId, user);
        }
        return handleListDocuments(event, user);
      case 'PUT':
        if (!documentId) {
          return createErrorResponse('BAD_REQUEST', 'Document ID is required', 400);
        }
        return handleUpdateDocument(documentId, event, user);
      case 'DELETE':
        if (!documentId) {
          return createErrorResponse('BAD_REQUEST', 'Document ID is required', 400);
        }
        return handleDeleteDocument(documentId, user);
      default:
        return createErrorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`, 405);
    }
  } catch (error) {
    console.error('Document handler error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
}

/**
 * Handle document upload
 * Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.5, 2.6, 2.7
 */
async function handleUpload(
  event: APIGatewayProxyEvent,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse('BAD_REQUEST', 'Request body is required', 400);
    }

    const body: UploadDocumentBody = JSON.parse(event.body);

    if (!body.fileName) {
      return createErrorResponse('BAD_REQUEST', 'File name is required', 400);
    }

    if (!body.fileContent && !body.googleDocsUrl) {
      return createErrorResponse('BAD_REQUEST', 'File content or Google Docs URL is required', 400);
    }

    if (!body.metadata) {
      return createErrorResponse('BAD_REQUEST', 'Metadata is required', 400);
    }

    if (!body.metadata.location) {
      return createErrorResponse('MISSING_LOCATION', 'Location metadata is required', 400);
    }

    // Validate sensitivity if provided
    if (body.metadata.sensitivity !== undefined) {
      if (body.metadata.sensitivity < 1 || body.metadata.sensitivity > 5) {
        return createErrorResponse(
          'INVALID_SENSITIVITY',
          'Sensitivity must be between 1 and 5',
          400
        );
      }
    }

    let fileContent: Buffer;
    let fileName = body.fileName;

    // Handle Google Docs URL conversion
    if (body.googleDocsUrl) {
      // Validate Google Docs URL
      const urlValidation = validateGoogleDocsUrl(body.googleDocsUrl);
      if (!urlValidation.isValid) {
        return createErrorResponse('INVALID_GOOGLE_DOCS_URL', urlValidation.error || 'Invalid Google Docs URL', 400);
      }

      // Fetch and convert Google Doc to PDF
      console.log('Converting Google Doc:', body.googleDocsUrl);
      
      // Use a temporary document ID for conversion
      const tempDocId = `temp-${Date.now()}`;
      const conversionResult = await convertGoogleDoc({
        documentId: tempDocId,
        sourceType: 'google-docs',
        sourceUrl: body.googleDocsUrl,
        organizationId: user.organizationId,
        userId: user.userId,
        fileName: body.fileName,
      });

      if (conversionResult.status === 'failed') {
        return createErrorResponse(
          'GOOGLE_DOCS_CONVERSION_FAILED',
          conversionResult.errorMessage || 'Failed to convert Google Doc',
          400
        );
      }

      // For Google Docs, we need to fetch the converted content
      // The convertGoogleDoc function already uploads to S3, so we need to adjust the flow
      // For now, let's fetch the PDF content directly
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({});
      const bucketName = process.env.DOCUMENTS_BUCKET_NAME || '';
      
      const s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: conversionResult.convertedS3Key,
      }));

      const chunks: Uint8Array[] = [];
      for await (const chunk of s3Response.Body as any) {
        chunks.push(chunk);
      }
      fileContent = Buffer.concat(chunks);

      // Update filename to reflect PDF conversion
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName = fileName.replace(/\.[^/.]+$/, '.pdf') || `${fileName}.pdf`;
      }

      // Delete the temporary file created by conversion
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: conversionResult.convertedS3Key,
      }));
    } else {
      fileContent = Buffer.from(body.fileContent, 'base64');
    }

    const document = await createDocument({
      fileName,
      fileContent,
      metadata: body.metadata,
      user,
    });

    return createSuccessResponse({ document }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not supported')) {
        return createErrorResponse('UNSUPPORTED_FILE_TYPE', error.message, 400);
      }
      if (error.message.includes('maximum size')) {
        return createErrorResponse('FILE_TOO_LARGE', error.message, 400);
      }
      if (error.message.includes('Location')) {
        return createErrorResponse('MISSING_LOCATION', error.message, 400);
      }
      if (error.message.includes('Sensitivity')) {
        return createErrorResponse('INVALID_SENSITIVITY', error.message, 400);
      }
      if (error.message.includes('ACCESS_DENIED')) {
        return createErrorResponse('GOOGLE_DOCS_ACCESS_DENIED', 'Unable to access Google Doc. Make sure the document is publicly accessible.', 403);
      }
      if (error.message.includes('NOT_FOUND')) {
        return createErrorResponse('GOOGLE_DOCS_NOT_FOUND', 'Google Doc not found. Please check the URL.', 404);
      }
    }

    throw error;
  }
}

/**
 * Handle get document by ID
 * Requirements: 7.1
 */
async function handleGetDocument(
  documentId: string,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  const result = await getDocument(documentId, user);

  if (!result) {
    return createErrorResponse('NOT_FOUND', 'Document not found', 404);
  }

  return createSuccessResponse(result);
}

/**
 * Handle document update
 * Requirements: 2.8, 7.2, 7.3
 */
async function handleUpdateDocument(
  documentId: string,
  event: APIGatewayProxyEvent,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse('BAD_REQUEST', 'Request body is required', 400);
    }

    const body: UpdateDocumentBody = JSON.parse(event.body);

    // Validate sensitivity if provided
    if (body.metadata?.sensitivity !== undefined) {
      if (body.metadata.sensitivity < 1 || body.metadata.sensitivity > 5) {
        return createErrorResponse(
          'INVALID_SENSITIVITY',
          'Sensitivity must be between 1 and 5',
          400
        );
      }
    }

    let fileContent: Buffer | undefined;
    if (body.fileContent) {
      fileContent = Buffer.from(body.fileContent, 'base64');
    }

    const document = await updateDocument({
      documentId,
      fileName: body.fileName,
      fileContent,
      metadata: body.metadata,
      user,
    });

    if (!document) {
      return createErrorResponse('NOT_FOUND', 'Document not found', 404);
    }

    return createSuccessResponse({ document });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return createErrorResponse('FORBIDDEN', error.message, 403);
      }
      if (error.message.includes('not supported')) {
        return createErrorResponse('UNSUPPORTED_FILE_TYPE', error.message, 400);
      }
      if (error.message.includes('maximum size')) {
        return createErrorResponse('FILE_TOO_LARGE', error.message, 400);
      }
    }
    throw error;
  }
}

/**
 * Handle document deletion
 * Requirements: 7.4
 */
async function handleDeleteDocument(
  documentId: string,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  try {
    const deleted = await deleteDocument(documentId, user);

    if (!deleted) {
      return createErrorResponse('NOT_FOUND', 'Document not found', 404);
    }

    return createSuccessResponse({ message: 'Document deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission')) {
      return createErrorResponse('FORBIDDEN', error.message, 403);
    }
    throw error;
  }
}

/**
 * Handle list documents
 * Requirements: 7.5, 7.6
 */
async function handleListDocuments(
  event: APIGatewayProxyEvent,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  const query = (event.queryStringParameters || {}) as ListDocumentsQuery;

  const result = await listDocuments({
    user,
    page: query.page ? parseInt(query.page, 10) : undefined,
    pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    location: query.location,
    category: query.category,
    fileExtension: query.fileExtension,
    sensitivity: query.sensitivity ? parseInt(query.sensitivity, 10) : undefined,
  });

  return createSuccessResponse(result);
}
