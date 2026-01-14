/**
 * Authorization Helper Functions
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Document } from '../types';
import { UserContext, AuthorizationResult, AuthError } from './types';

/**
 * Check if user is the owner of a document
 * Requirements: 6.2
 * 
 * @param document - The document to check ownership of
 * @param user - The user context
 * @returns true if the user owns the document
 */
export function isDocumentOwner(document: Document, user: UserContext): boolean {
  return document.userId === user.userId;
}

/**
 * Check if user belongs to the same organization as the document
 * Requirements: 6.3, 6.5
 * 
 * @param document - The document to check
 * @param user - The user context
 * @returns true if user is in the same organization as the document
 */
export function isSameOrganization(document: Document, user: UserContext): boolean {
  return document.organizationId === user.organizationId;
}

/**
 * Check if user has admin role
 * Requirements: 6.1
 * 
 * @param user - The user context
 * @returns true if user has admin role
 */
export function isAdmin(user: UserContext): boolean {
  return user.role === 'admin';
}

/**
 * Check if user is authorized to view/access a document
 * Authorization rules:
 * - Admin: Can access all documents in their organization
 * - User: Can only access documents they uploaded
 * - Cross-organization access is always denied
 * 
 * Requirements: 6.1, 6.2, 6.3
 * 
 * @param document - The document to check access for
 * @param user - The user context
 * @returns AuthorizationResult indicating if access is allowed
 */
export function canAccessDocument(document: Document, user: UserContext): AuthorizationResult {
  // Cross-organization access is always denied
  if (!isSameOrganization(document, user)) {
    return {
      isAuthorized: false,
      error: {
        code: 'CROSS_ORG_ACCESS_DENIED',
        message: 'Access to documents outside your organization is denied',
      },
    };
  }

  // Admin can access all documents in their organization
  if (isAdmin(user)) {
    return { isAuthorized: true };
  }

  // Regular users can only access their own documents
  if (isDocumentOwner(document, user)) {
    return { isAuthorized: true };
  }

  return {
    isAuthorized: false,
    error: {
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this document',
    },
  };
}

/**
 * Check if user is authorized to modify a document (update/delete)
 * Authorization rules:
 * - Admin: Can modify all documents in their organization
 * - User: Can only modify documents they uploaded
 * - Cross-organization modification is always denied
 * 
 * Requirements: 6.1, 6.3, 6.4
 * 
 * @param document - The document to check modification rights for
 * @param user - The user context
 * @returns AuthorizationResult indicating if modification is allowed
 */
export function canModifyDocument(document: Document, user: UserContext): AuthorizationResult {
  // Cross-organization modification is always denied
  if (!isSameOrganization(document, user)) {
    return {
      isAuthorized: false,
      error: {
        code: 'CROSS_ORG_ACCESS_DENIED',
        message: 'Modification of documents outside your organization is denied',
      },
    };
  }

  // Admin can modify all documents in their organization
  if (isAdmin(user)) {
    return { isAuthorized: true };
  }

  // Regular users can only modify their own documents
  if (isDocumentOwner(document, user)) {
    return { isAuthorized: true };
  }

  return {
    isAuthorized: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'You do not have permission to modify this document',
    },
  };
}

/**
 * Check if user is authorized to delete a document
 * Same rules as modification
 * 
 * Requirements: 6.1, 6.3, 6.4
 * 
 * @param document - The document to check deletion rights for
 * @param user - The user context
 * @returns AuthorizationResult indicating if deletion is allowed
 */
export function canDeleteDocument(document: Document, user: UserContext): AuthorizationResult {
  return canModifyDocument(document, user);
}

/**
 * Filter documents to only include those the user is authorized to access
 * Requirements: 6.1, 6.2, 6.3
 * 
 * @param documents - Array of documents to filter
 * @param user - The user context
 * @returns Array of documents the user is authorized to access
 */
export function filterAuthorizedDocuments(documents: Document[], user: UserContext): Document[] {
  return documents.filter(doc => canAccessDocument(doc, user).isAuthorized);
}

/**
 * Check if user can perform any action on documents in an organization
 * Requirements: 6.5
 * 
 * @param organizationId - The organization ID to check
 * @param user - The user context
 * @returns true if user belongs to the organization
 */
export function canAccessOrganization(organizationId: string, user: UserContext): boolean {
  return user.organizationId === organizationId;
}

/**
 * Get authorization error for cross-organization access attempt
 */
export function getCrossOrgAccessError(): AuthError {
  return {
    code: 'CROSS_ORG_ACCESS_DENIED',
    message: 'Access to documents outside your organization is denied',
  };
}

/**
 * Get authorization error for insufficient permissions
 */
export function getInsufficientPermissionsError(): AuthError {
  return {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'You do not have permission to perform this action',
  };
}
