/**
 * JWT Validation Middleware for Cognito Tokens
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import {
  UserContext,
  CognitoTokenPayloadExtended,
  JwtValidationResult,
  JwtVerifierConfig,
  AuthError,
} from './types';

/**
 * Default configuration from environment variables
 */
const DEFAULT_CONFIG: JwtVerifierConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || '',
  clientId: process.env.COGNITO_CLIENT_ID || '',
  region: process.env.AWS_REGION || 'us-east-1',
};

/**
 * Extract JWT token from Authorization header
 * Requirements: 5.1
 */
export function extractToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and raw token formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Decode JWT token payload without verification (for testing/debugging)
 * Note: In production, always use verifyToken for actual validation
 */
export function decodeTokenPayload(token: string): CognitoTokenPayloadExtended | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    return JSON.parse(payload) as CognitoTokenPayloadExtended;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 * Requirements: 5.4
 */
export function isTokenExpired(payload: CognitoTokenPayloadExtended): boolean {
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Extract user context from token payload
 * Requirements: 5.2
 */
export function extractUserFromPayload(payload: CognitoTokenPayloadExtended): UserContext {
  return {
    userId: payload.sub,
    email: payload.email,
    organizationId: payload['custom:organizationId'],
    role: payload['custom:role'] as 'admin' | 'user',
  };
}

/**
 * Validate user context has all required fields
 */
export function isValidUserContext(user: UserContext): boolean {
  return !!(
    user.userId &&
    user.email &&
    user.organizationId &&
    (user.role === 'admin' || user.role === 'user')
  );
}

/**
 * Validate JWT token from API Gateway event
 * This function handles the full validation flow including:
 * - Token extraction from Authorization header
 * - Token structure validation
 * - Expiration check
 * - User context extraction
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function validateToken(event: APIGatewayProxyEvent): JwtValidationResult {
  // First check if API Gateway has already validated the token via Cognito authorizer
  const claims = event.requestContext.authorizer?.claims;
  
  if (claims) {
    // Token was validated by API Gateway Cognito authorizer
    const user: UserContext = {
      userId: claims.sub || claims['cognito:username'],
      email: claims.email,
      organizationId: claims['custom:organizationId'],
      role: claims['custom:role'] as 'admin' | 'user',
    };

    if (!isValidUserContext(user)) {
      return {
        isValid: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is missing required claims',
        },
      };
    }

    return { isValid: true, user };
  }

  // Manual token validation (for cases without API Gateway authorizer)
  const token = extractToken(event);
  
  if (!token) {
    return {
      isValid: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    };
  }

  const payload = decodeTokenPayload(token);
  
  if (!payload) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid token format',
      },
    };
  }

  if (isTokenExpired(payload)) {
    return {
      isValid: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      },
    };
  }

  const user = extractUserFromPayload(payload);

  if (!isValidUserContext(user)) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token is missing required claims',
      },
    };
  }

  return { isValid: true, user };
}

/**
 * Extract user context from API Gateway event
 * Returns null if authentication fails
 * Requirements: 5.1, 5.2
 */
export function extractUserContext(event: APIGatewayProxyEvent): UserContext | null {
  const result = validateToken(event);
  return result.isValid ? result.user! : null;
}

/**
 * Create authentication error response
 */
export function createAuthError(error: AuthError): { statusCode: number; body: string } {
  const statusCode = error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED' 
    ? 401 
    : error.code === 'FORBIDDEN' || error.code === 'CROSS_ORG_ACCESS_DENIED' || error.code === 'INSUFFICIENT_PERMISSIONS'
    ? 403
    : 401;

  return {
    statusCode,
    body: JSON.stringify({
      error: error.code,
      message: error.message,
    }),
  };
}
