/**
 * Conversion Service - Orchestrates document conversions
 * Requirements: 1.3, 1.4
 */

import { ConversionContext, ConversionResult } from './types';
import { convertGoogleDoc, validateGoogleDocsUrl } from './google-docs-service';
import { convertPowerPoint, isPowerPointFile } from './powerpoint-service';

/**
 * Convert document based on source type
 * Requirements: 1.3, 1.4
 */
export async function convertDocument(context: ConversionContext): Promise<ConversionResult> {
  const { sourceType, documentId } = context;

  console.log(`Starting conversion for document ${documentId}, type: ${sourceType}`);

  switch (sourceType) {
    case 'google-docs':
      return convertGoogleDoc(context);
    
    case 'powerpoint':
      return convertPowerPoint(context);
    
    default:
      return {
        documentId,
        convertedS3Key: '',
        status: 'failed',
        errorMessage: `Unsupported source type: ${sourceType}`,
      };
  }
}

/**
 * Validate conversion request
 */
export function validateConversionRequest(context: ConversionContext): { isValid: boolean; error?: string } {
  const { sourceType, sourceUrl, s3Key, documentId, organizationId } = context;

  if (!documentId) {
    return { isValid: false, error: 'Document ID is required' };
  }

  if (!organizationId) {
    return { isValid: false, error: 'Organization ID is required' };
  }

  switch (sourceType) {
    case 'google-docs':
      if (!sourceUrl) {
        return { isValid: false, error: 'Source URL is required for Google Docs conversion' };
      }
      return validateGoogleDocsUrl(sourceUrl);

    case 'powerpoint':
      if (!s3Key) {
        return { isValid: false, error: 'S3 key is required for PowerPoint conversion' };
      }
      // Validate file extension from s3Key
      const fileName = s3Key.split('/').pop() || '';
      if (!isPowerPointFile(fileName)) {
        return { isValid: false, error: 'File must be a PowerPoint document (.ppt or .pptx)' };
      }
      return { isValid: true };

    default:
      return { isValid: false, error: `Unsupported source type: ${sourceType}` };
  }
}

export { convertGoogleDoc, validateGoogleDocsUrl } from './google-docs-service';
export { convertPowerPoint, isPowerPointFile, isLibreOfficeAvailable } from './powerpoint-service';
