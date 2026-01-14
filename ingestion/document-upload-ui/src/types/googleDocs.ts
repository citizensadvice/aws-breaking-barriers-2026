import { DocumentMetadata } from './metadata';

export interface GoogleDocsUpload {
  id: string;
  url: string;
  metadata: DocumentMetadata;
  title?: string;
  preview?: string;
  status: 'pending' | 'validating' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface GoogleDocsValidationResult {
  valid: boolean;
  error?: string;
  title?: string;
  preview?: string;
}

/**
 * Validate Google Docs URL format
 * Accepts URLs in the format:
 * - https://docs.google.com/document/d/{id}/...
 * - https://docs.google.com/spreadsheets/d/{id}/...
 * - https://docs.google.com/presentation/d/{id}/...
 */
export const validateGoogleDocsUrl = (url: string): GoogleDocsValidationResult => {
  if (!url || url.trim().length === 0) {
    return {
      valid: false,
      error: 'URL is required'
    };
  }

  const trimmedUrl = url.trim();

  // Check if it's a valid URL
  try {
    const urlObj = new URL(trimmedUrl);
    
    // Check if it's a Google Docs domain
    if (!urlObj.hostname.includes('docs.google.com')) {
      return {
        valid: false,
        error: 'URL must be from docs.google.com'
      };
    }

    // Check if it matches the expected pattern
    const pathPattern = /^\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/;
    const match = urlObj.pathname.match(pathPattern);

    if (!match) {
      return {
        valid: false,
        error: 'Invalid Google Docs URL format. Expected format: https://docs.google.com/document/d/{id}/...'
      };
    }

    return {
      valid: true
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
};

/**
 * Extract document ID from Google Docs URL
 */
export const extractDocumentId = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathPattern = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = urlObj.pathname.match(pathPattern);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Extract document type from Google Docs URL
 */
export const extractDocumentType = (url: string): 'document' | 'spreadsheet' | 'presentation' | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname.includes('/document/')) return 'document';
    if (urlObj.pathname.includes('/spreadsheets/')) return 'spreadsheet';
    if (urlObj.pathname.includes('/presentation/')) return 'presentation';
    return null;
  } catch (error) {
    return null;
  }
};
