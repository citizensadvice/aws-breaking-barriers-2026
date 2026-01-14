/**
 * Conversion Lambda exports
 * Requirements: 1.3, 1.4
 */

export { handler, handleSyncConversion } from './handler';
export { 
  convertDocument, 
  validateConversionRequest,
  convertGoogleDoc,
  validateGoogleDocsUrl,
  convertPowerPoint,
  isPowerPointFile,
  isLibreOfficeAvailable 
} from './conversion-service';
export { extractGoogleDocId, getGoogleDocType } from './google-docs-service';
export * from './types';
