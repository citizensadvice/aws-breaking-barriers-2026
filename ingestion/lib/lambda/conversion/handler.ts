/**
 * Conversion Lambda Handler
 * Requirements: 1.3, 1.4
 */

import { Context } from 'aws-lambda';
import { 
  ConversionLambdaPayload, 
  ConversionLambdaResponse,
  ConversionContext,
  ConversionResult 
} from './types';
import { convertDocument, validateConversionRequest } from './conversion-service';

// Maximum retry attempts
const MAX_RETRIES = 3;

/**
 * Main handler for conversion operations
 * This Lambda is invoked by the Document Lambda for Google Docs and PowerPoint conversions
 */
export async function handler(
  event: ConversionLambdaPayload,
  context: Context
): Promise<ConversionLambdaResponse> {
  console.log('Conversion Lambda invoked:', JSON.stringify(event, null, 2));

  try {
    const { conversionRequest, retryCount = 0 } = event;

    // Validate request
    const validation = validateConversionRequest(conversionRequest);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        body: {
          documentId: conversionRequest.documentId,
          convertedS3Key: '',
          status: 'failed',
          errorMessage: validation.error || 'Invalid conversion request',
        },
      };
    }

    // Perform conversion
    const result = await convertDocument(conversionRequest);

    // Handle retry logic for retryable failures
    if (result.status === 'failed' && retryCount < MAX_RETRIES) {
      const isRetryable = isRetryableError(result.errorMessage);
      
      if (isRetryable) {
        console.log(`Conversion failed with retryable error, attempt ${retryCount + 1}/${MAX_RETRIES}`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry
        return handler(
          { conversionRequest, retryCount: retryCount + 1 },
          context
        );
      }
    }

    return {
      statusCode: result.status === 'completed' ? 200 : 500,
      body: result,
    };
  } catch (error) {
    console.error('Conversion handler error:', error);

    return {
      statusCode: 500,
      body: {
        error: {
          type: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          retryable: false,
        },
      },
    };
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(errorMessage?: string): boolean {
  if (!errorMessage) return false;

  const nonRetryablePatterns = [
    'ACCESS_DENIED',
    'NOT_FOUND',
    'INVALID_URL',
    'Invalid',
    'required',
  ];

  return !nonRetryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Synchronous conversion handler for direct invocation
 * Used when the Document Lambda needs to wait for conversion result
 */
export async function handleSyncConversion(
  conversionRequest: ConversionContext
): Promise<ConversionResult> {
  const validation = validateConversionRequest(conversionRequest);
  
  if (!validation.isValid) {
    return {
      documentId: conversionRequest.documentId,
      convertedS3Key: '',
      status: 'failed',
      errorMessage: validation.error || 'Invalid conversion request',
    };
  }

  return convertDocument(conversionRequest);
}
