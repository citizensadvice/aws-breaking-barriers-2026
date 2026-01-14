/**
 * Search Lambda Handler
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  UserContext,
  MetadataSearchRequest,
  SemanticSearchRequest,
  ApiResponse,
  ErrorResponse,
} from './types';
import { searchByMetadata, searchSemantic } from './search-service';

/**
 * Main handler for search operations
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const user = extractUserContext(event);
    if (!user) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const path = event.path;
    const method = event.httpMethod;

    if (method !== 'POST') {
      return createErrorResponse('METHOD_NOT_ALLOWED', `Method ${method} not allowed`, 405);
    }

    // Route based on path
    if (path.endsWith('/search/semantic')) {
      return handleSemanticSearch(event, user);
    } else if (path.endsWith('/search')) {
      return handleMetadataSearch(event, user);
    }

    return createErrorResponse('NOT_FOUND', 'Endpoint not found', 404);
  } catch (error) {
    console.error('Search handler error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
}

/**
 * Handle metadata search
 * Requirements: 4.2, 4.4, 4.5
 */
async function handleMetadataSearch(
  event: APIGatewayProxyEvent,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const request: MetadataSearchRequest = {
      location: body.location,
      category: body.category,
      fileExtension: body.fileExtension,
      sensitivity: body.sensitivity,
      minSensitivity: body.minSensitivity,
      maxSensitivity: body.maxSensitivity,
      expiryDateBefore: body.expiryDateBefore,
      expiryDateAfter: body.expiryDateAfter,
      page: body.page,
      pageSize: body.pageSize,
    };

    // Validate sensitivity values if provided
    if (request.sensitivity !== undefined) {
      if (request.sensitivity < 1 || request.sensitivity > 5) {
        return createErrorResponse(
          'INVALID_SENSITIVITY',
          'Sensitivity must be between 1 and 5',
          400
        );
      }
    }

    if (request.minSensitivity !== undefined) {
      if (request.minSensitivity < 1 || request.minSensitivity > 5) {
        return createErrorResponse(
          'INVALID_SENSITIVITY',
          'Minimum sensitivity must be between 1 and 5',
          400
        );
      }
    }

    if (request.maxSensitivity !== undefined) {
      if (request.maxSensitivity < 1 || request.maxSensitivity > 5) {
        return createErrorResponse(
          'INVALID_SENSITIVITY',
          'Maximum sensitivity must be between 1 and 5',
          400
        );
      }
    }

    // Validate page and pageSize
    if (request.page !== undefined && request.page < 1) {
      return createErrorResponse('INVALID_PAGE', 'Page must be at least 1', 400);
    }

    if (request.pageSize !== undefined && (request.pageSize < 1 || request.pageSize > 100)) {
      return createErrorResponse(
        'INVALID_PAGE_SIZE',
        'Page size must be between 1 and 100',
        400
      );
    }

    const result = await searchByMetadata(request, user);
    return createSuccessResponse(result);
  } catch (error) {
    console.error('Metadata search error:', error);
    throw error;
  }
}


/**
 * Handle semantic search
 * Requirements: 4.1, 4.3, 4.5
 */
async function handleSemanticSearch(
  event: APIGatewayProxyEvent,
  user: UserContext
): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse('BAD_REQUEST', 'Request body is required', 400);
    }

    const body = JSON.parse(event.body);

    if (!body.query || typeof body.query !== 'string' || body.query.trim() === '') {
      return createErrorResponse('BAD_REQUEST', 'Query is required and must be a non-empty string', 400);
    }

    const request: SemanticSearchRequest = {
      query: body.query.trim(),
      filters: body.filters,
      maxResults: body.maxResults,
    };

    // Validate maxResults if provided
    if (request.maxResults !== undefined) {
      if (request.maxResults < 1 || request.maxResults > 100) {
        return createErrorResponse(
          'INVALID_MAX_RESULTS',
          'Max results must be between 1 and 100',
          400
        );
      }
    }

    const result = await searchSemantic(request, user);
    return createSuccessResponse(result);
  } catch (error) {
    console.error('Semantic search error:', error);
    throw error;
  }
}

/**
 * Extract user context from API Gateway event
 */
function extractUserContext(event: APIGatewayProxyEvent): UserContext | null {
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
 * Create success response
 */
function createSuccessResponse<T>(data: T, statusCode = 200): ApiResponse<T> {
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
function createErrorResponse(
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
