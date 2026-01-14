/**
 * Types for Authorization Middleware
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5
 */

// Re-export shared types
export { UserRole, User, CognitoTokenPayload } from '../types';

/**
 * User context extracted from JWT token
 * Requirements: 5.2, 6.5
 */
export interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'user';
}

/**
 * Extended Cognito JWT token payload with timing fields
 * Requirements: 5.2, 5.4
 */
export interface CognitoTokenPayloadExtended {
  sub: string;
  email: string;
  'custom:organizationId': string;
  'custom:role': string;
  exp: number;
  iat: number;
  iss: string;
  aud?: string;
  token_use?: string;
}

/**
 * JWT validation result
 * Requirements: 5.1, 5.3
 */
export interface JwtValidationResult {
  isValid: boolean;
  user?: UserContext;
  error?: AuthError;
}

/**
 * Authorization check result
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export interface AuthorizationResult {
  isAuthorized: boolean;
  error?: AuthError;
}

/**
 * Auth error types
 */
export type AuthErrorCode = 
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'FORBIDDEN'
  | 'CROSS_ORG_ACCESS_DENIED'
  | 'INSUFFICIENT_PERMISSIONS';

/**
 * Auth error structure
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * JWT verifier configuration
 */
export interface JwtVerifierConfig {
  userPoolId: string;
  clientId: string;
  region?: string;
}
