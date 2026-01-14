/**
 * Google Docs Conversion Service
 * Requirements: 1.4 - Fetch document via Google Docs API, export as PDF, store in S3
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { 
  ConversionContext, 
  ConversionResult, 
  ConversionError,
  GoogleDocsExportFormat 
} from './types';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET_NAME || '';

// Google Docs export URL format
const GOOGLE_DOCS_EXPORT_URL = 'https://docs.google.com/document/d/{docId}/export?format=pdf';
const GOOGLE_SLIDES_EXPORT_URL = 'https://docs.google.com/presentation/d/{docId}/export/pdf';
const GOOGLE_SHEETS_EXPORT_URL = 'https://docs.google.com/spreadsheets/d/{docId}/export?format=pdf';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Extract Google Doc ID from various URL formats
 */
export function extractGoogleDocId(url: string): string | null {
  // Handle various Google Docs URL formats:
  // https://docs.google.com/document/d/{docId}/edit
  // https://docs.google.com/document/d/{docId}/view
  // https://docs.google.com/presentation/d/{docId}/edit
  // https://docs.google.com/spreadsheets/d/{docId}/edit
  
  const patterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Determine the type of Google document from URL
 */
export function getGoogleDocType(url: string): 'document' | 'presentation' | 'spreadsheet' | null {
  if (url.includes('/document/')) return 'document';
  if (url.includes('/presentation/')) return 'presentation';
  if (url.includes('/spreadsheets/')) return 'spreadsheet';
  return null;
}

/**
 * Get the export URL for a Google document
 */
function getExportUrl(docId: string, docType: 'document' | 'presentation' | 'spreadsheet'): string {
  switch (docType) {
    case 'document':
      return GOOGLE_DOCS_EXPORT_URL.replace('{docId}', docId);
    case 'presentation':
      return GOOGLE_SLIDES_EXPORT_URL.replace('{docId}', docId);
    case 'spreadsheet':
      return GOOGLE_SHEETS_EXPORT_URL.replace('{docId}', docId);
  }
}

/**
 * Fetch document from Google Docs and export as PDF
 */
async function fetchGoogleDoc(
  docId: string, 
  docType: 'document' | 'presentation' | 'spreadsheet'
): Promise<Buffer> {
  const exportUrl = getExportUrl(docId, docType);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('GOOGLE_DOCS_ACCESS_DENIED: Unable to access Google Doc. Make sure the document is publicly accessible or shared.');
        }
        if (response.status === 404) {
          throw new Error('GOOGLE_DOCS_NOT_FOUND: Google Doc not found. Please check the URL.');
        }
        throw new Error(`Failed to fetch Google Doc: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on access denied or not found
      if (lastError.message.includes('ACCESS_DENIED') || lastError.message.includes('NOT_FOUND')) {
        throw lastError;
      }
      
      // Wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to fetch Google Doc after retries');
}

/**
 * Generate S3 key for converted document
 */
function generateConvertedS3Key(
  organizationId: string, 
  documentId: string, 
  originalFileName?: string
): string {
  const fileName = originalFileName 
    ? originalFileName.replace(/\.[^/.]+$/, '.pdf')
    : `${documentId}.pdf`;
  return `${organizationId}/${documentId}/${fileName}`;
}

/**
 * Convert Google Docs document to PDF and store in S3
 * Requirements: 1.4
 */
export async function convertGoogleDoc(context: ConversionContext): Promise<ConversionResult> {
  const { documentId, sourceUrl, organizationId, fileName } = context;

  if (!sourceUrl) {
    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage: 'Source URL is required for Google Docs conversion',
    };
  }

  // Extract document ID from URL
  const docId = extractGoogleDocId(sourceUrl);
  if (!docId) {
    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage: 'Invalid Google Docs URL. Please provide a valid Google Docs, Slides, or Sheets URL.',
    };
  }

  // Determine document type
  const docType = getGoogleDocType(sourceUrl);
  if (!docType) {
    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage: 'Unable to determine Google document type from URL.',
    };
  }

  try {
    // Fetch and convert to PDF
    console.log(`Fetching Google ${docType} with ID: ${docId}`);
    const pdfContent = await fetchGoogleDoc(docId, docType);

    // Generate S3 key for converted file
    const convertedS3Key = generateConvertedS3Key(organizationId, documentId, fileName);

    // Upload to S3
    console.log(`Uploading converted PDF to S3: ${convertedS3Key}`);
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: convertedS3Key,
      Body: pdfContent,
      ContentType: 'application/pdf',
    }));

    return {
      documentId,
      convertedS3Key,
      status: 'completed',
    };
  } catch (error) {
    console.error('Google Docs conversion error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during conversion';
    
    return {
      documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage,
    };
  }
}

/**
 * Validate Google Docs URL
 */
export function validateGoogleDocsUrl(url: string): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.hostname !== 'docs.google.com') {
      return { isValid: false, error: 'URL must be from docs.google.com' };
    }

    const docId = extractGoogleDocId(url);
    if (!docId) {
      return { isValid: false, error: 'Unable to extract document ID from URL' };
    }

    const docType = getGoogleDocType(url);
    if (!docType) {
      return { isValid: false, error: 'URL must be a Google Docs, Slides, or Sheets document' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}
