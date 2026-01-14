/**
 * Property-based tests for file type validation
 * Feature: document-management-backend, Property 1: Supported file types are accepted
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import * as fc from 'fast-check';
import {
  validateFileType,
  hasSupportedExtension,
  isSupportedFileExtension,
  extractFileExtension,
} from '../lib/shared/file-validation';
import { SUPPORTED_FILE_EXTENSIONS, SupportedFileExtension } from '../lib/shared/types';

/**
 * Arbitrary for generating valid file names with supported extensions
 * Requirements: 1.1, 1.2, 1.3
 */
const supportedFileNameArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'), { minLength: 1, maxLength: 50 }),
  fc.constantFrom(...SUPPORTED_FILE_EXTENSIONS)
).map(([baseName, ext]) => `${baseName}${ext}`);

/**
 * Arbitrary for generating supported extensions
 */
const supportedExtensionArb = fc.constantFrom(...SUPPORTED_FILE_EXTENSIONS);

describe('Property 1: Supported file types are accepted', () => {
  /**
   * Feature: document-management-backend, Property 1: Supported file types are accepted
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4
   * 
   * For any valid document file with extension in {.pdf, .doc, .docx, .ppt, .pptx},
   * the file validation should accept the file.
   */
  it('should accept all files with supported extensions', () => {
    fc.assert(
      fc.property(supportedFileNameArb, (fileName) => {
        const result = validateFileType(fileName);
        
        // The file should be valid
        expect(result.isValid).toBe(true);
        
        // The file name should be preserved
        expect(result.fileName).toBe(fileName);
        
        // The extension should be extracted and be one of the supported types
        expect(result.fileExtension).toBeDefined();
        expect(SUPPORTED_FILE_EXTENSIONS).toContain(result.fileExtension);
        
        // No error should be present
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 1: Supported file types are accepted
   * Validates: Requirements 1.1, 1.2, 1.3
   * 
   * For any supported extension, isSupportedFileExtension should return true.
   */
  it('should recognize all supported extensions via isSupportedFileExtension', () => {
    fc.assert(
      fc.property(supportedExtensionArb, (extension) => {
        expect(isSupportedFileExtension(extension)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 1: Supported file types are accepted
   * Validates: Requirements 1.1, 1.2, 1.3
   * 
   * For any file name with a supported extension, hasSupportedExtension should return true.
   */
  it('should return true for hasSupportedExtension with valid file names', () => {
    fc.assert(
      fc.property(supportedFileNameArb, (fileName) => {
        expect(hasSupportedExtension(fileName)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 1: Supported file types are accepted
   * Validates: Requirements 1.1, 1.2, 1.3
   * 
   * For any file name with a supported extension, extractFileExtension should return
   * the correct extension in lowercase.
   */
  it('should correctly extract supported extensions from file names', () => {
    fc.assert(
      fc.property(supportedFileNameArb, (fileName) => {
        const extracted = extractFileExtension(fileName);
        
        // Extension should be extracted
        expect(extracted).not.toBeNull();
        
        // Extension should be lowercase
        expect(extracted).toBe(extracted?.toLowerCase());
        
        // Extension should be one of the supported types
        expect(SUPPORTED_FILE_EXTENSIONS).toContain(extracted as SupportedFileExtension);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 1: Supported file types are accepted
   * Validates: Requirements 1.1, 1.2, 1.3
   * 
   * Case insensitivity: For any supported extension in any case variation,
   * the validation should accept the file.
   */
  it('should accept supported extensions regardless of case', () => {
    const caseVariationArb = fc.tuple(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 20 }),
      fc.constantFrom(...SUPPORTED_FILE_EXTENSIONS),
      fc.boolean()
    ).map(([baseName, ext, upperCase]) => {
      const caseExt = upperCase ? ext.toUpperCase() : ext;
      return `${baseName}${caseExt}`;
    });

    fc.assert(
      fc.property(caseVariationArb, (fileName) => {
        const result = validateFileType(fileName);
        expect(result.isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
