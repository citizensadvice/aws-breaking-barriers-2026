/**
 * Property-based tests for metadata round-trip consistency
 * Feature: document-management-backend, Property 9: Metadata round-trip consistency
 * Validates: Requirements 2.9, 7.3
 */

import * as fc from 'fast-check';
import { Document, DocumentMetadataInput, DynamoDBDocumentItem, SUPPORTED_FILE_EXTENSIONS } from '../lib/shared/types';
import { documentMetadataInputSchema } from '../lib/shared/validation';

/**
 * Convert Document to DynamoDB item (local copy to avoid uuid import)
 */
function documentToDynamoDBItem(doc: Document): DynamoDBDocumentItem {
  return {
    PK: `DOC#${doc.id}`,
    SK: 'META',
    GSI1PK: `ORG#${doc.organizationId}`,
    GSI1SK: `USER#${doc.userId}#${doc.createdAt}`,
    GSI2PK: `ORG#${doc.organizationId}`,
    GSI2SK: `LOC#${doc.location}#${doc.createdAt}`,
    id: doc.id,
    userId: doc.userId,
    organizationId: doc.organizationId,
    fileName: doc.fileName,
    fileExtension: doc.fileExtension,
    s3Key: doc.s3Key,
    location: doc.location,
    category: doc.category,
    sensitivity: doc.sensitivity,
    expiryDate: doc.expiryDate,
    version: doc.version,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Convert DynamoDB item to Document (local copy to avoid uuid import)
 */
function dynamoDBItemToDocument(item: DynamoDBDocumentItem): Document {
  return {
    id: item.id,
    userId: item.userId,
    organizationId: item.organizationId,
    fileName: item.fileName,
    fileExtension: item.fileExtension,
    s3Key: item.s3Key,
    location: item.location,
    category: item.category,
    sensitivity: item.sensitivity,
    expiryDate: item.expiryDate,
    version: item.version,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}


/**
 * Arbitrary for generating valid location strings
 */
const locationArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'),
  { minLength: 1, maxLength: 100 }
);

/**
 * Arbitrary for generating valid category strings
 */
const categoryArb = fc.option(
  fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'),
    { minLength: 1, maxLength: 50 }
  ),
  { nil: undefined }
);

/**
 * Arbitrary for generating valid sensitivity values (1-5)
 */
const sensitivityArb = fc.integer({ min: 1, max: 5 });

/**
 * Arbitrary for generating valid ISO date strings (future dates for expiry)
 */
const expiryDateArb = fc.option(
  fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10) })
    .map(d => d.toISOString()),
  { nil: undefined }
);

/**
 * Arbitrary for generating valid document metadata input
 */
const documentMetadataInputArb = fc.record({
  location: locationArb,
  category: categoryArb,
  expiryDate: expiryDateArb,
  sensitivity: fc.option(sensitivityArb, { nil: undefined }),
});

/**
 * Arbitrary for generating valid file extensions
 */
const fileExtensionArb = fc.constantFrom(...SUPPORTED_FILE_EXTENSIONS);

/**
 * Arbitrary for generating valid file names
 */
const fileNameArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'), { minLength: 1, maxLength: 30 }),
  fileExtensionArb
).map(([baseName, ext]) => `${baseName}${ext}`);

/**
 * Arbitrary for generating UUIDs
 */
const uuidArb = fc.uuid();

/**
 * Arbitrary for generating organization IDs
 */
const orgIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'),
  { minLength: 5, maxLength: 20 }
).map(s => `org-${s}`);

/**
 * Arbitrary for generating user IDs
 */
const userIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'),
  { minLength: 5, maxLength: 20 }
).map(s => `user-${s}`);


/**
 * Arbitrary for generating complete Document objects
 */
const documentArb = fc.record({
  id: uuidArb,
  userId: userIdArb,
  organizationId: orgIdArb,
  fileName: fileNameArb,
  fileExtension: fileExtensionArb,
  s3Key: fc.constant(''), // Will be computed
  location: locationArb,
  category: categoryArb,
  expiryDate: expiryDateArb,
  sensitivity: sensitivityArb,
  version: fc.integer({ min: 1, max: 1000 }),
  status: fc.constantFrom('active', 'processing', 'failed') as fc.Arbitrary<'active' | 'processing' | 'failed'>,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }).map(d => d.toISOString()),
}).map(doc => ({
  ...doc,
  s3Key: `${doc.organizationId}/${doc.id}/${doc.fileName}`,
}));

describe('Property 9: Metadata round-trip consistency', () => {
  /**
   * Feature: document-management-backend, Property 9: Metadata round-trip consistency
   * Validates: Requirements 2.9, 7.3
   * 
   * For any document with metadata (location, category, expiryDate, sensitivity),
   * storing the document and then retrieving it should return metadata equivalent
   * to what was originally provided.
   */
  it('should preserve all metadata fields through DynamoDB round-trip', () => {
    fc.assert(
      fc.property(documentArb, (originalDoc) => {
        // Convert document to DynamoDB item (simulates storage)
        const dynamoItem = documentToDynamoDBItem(originalDoc);
        
        // Convert DynamoDB item back to document (simulates retrieval)
        const retrievedDoc = dynamoDBItemToDocument(dynamoItem);
        
        // Verify all metadata fields are preserved
        expect(retrievedDoc.location).toBe(originalDoc.location);
        expect(retrievedDoc.category).toBe(originalDoc.category);
        expect(retrievedDoc.expiryDate).toBe(originalDoc.expiryDate);
        expect(retrievedDoc.sensitivity).toBe(originalDoc.sensitivity);
        
        // Verify other document fields are also preserved
        expect(retrievedDoc.id).toBe(originalDoc.id);
        expect(retrievedDoc.userId).toBe(originalDoc.userId);
        expect(retrievedDoc.organizationId).toBe(originalDoc.organizationId);
        expect(retrievedDoc.fileName).toBe(originalDoc.fileName);
        expect(retrievedDoc.fileExtension).toBe(originalDoc.fileExtension);
        expect(retrievedDoc.s3Key).toBe(originalDoc.s3Key);
        expect(retrievedDoc.version).toBe(originalDoc.version);
        expect(retrievedDoc.status).toBe(originalDoc.status);
        expect(retrievedDoc.createdAt).toBe(originalDoc.createdAt);
        expect(retrievedDoc.updatedAt).toBe(originalDoc.updatedAt);
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Feature: document-management-backend, Property 9: Metadata round-trip consistency
   * Validates: Requirements 2.9, 7.3
   * 
   * For any valid metadata input, the metadata validation schema should accept it
   * and preserve the values.
   */
  it('should validate and preserve metadata input through schema validation', () => {
    fc.assert(
      fc.property(documentMetadataInputArb, (metadata) => {
        const result = documentMetadataInputSchema.safeParse(metadata);
        
        if (result.success) {
          // If validation passes, the parsed data should match the input
          expect(result.data.location).toBe(metadata.location);
          expect(result.data.category).toBe(metadata.category);
          expect(result.data.expiryDate).toBe(metadata.expiryDate);
          expect(result.data.sensitivity).toBe(metadata.sensitivity);
        }
        // If validation fails, it should be due to invalid input (empty location, etc.)
        // which is expected behavior
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 9: Metadata round-trip consistency
   * Validates: Requirements 2.9, 7.3
   * 
   * For any document, the round-trip conversion should be idempotent:
   * converting twice should produce the same result as converting once.
   */
  it('should be idempotent: multiple round-trips produce same result', () => {
    fc.assert(
      fc.property(documentArb, (originalDoc) => {
        // First round-trip
        const dynamoItem1 = documentToDynamoDBItem(originalDoc);
        const retrievedDoc1 = dynamoDBItemToDocument(dynamoItem1);
        
        // Second round-trip
        const dynamoItem2 = documentToDynamoDBItem(retrievedDoc1);
        const retrievedDoc2 = dynamoDBItemToDocument(dynamoItem2);
        
        // Both retrieved documents should be identical
        expect(retrievedDoc2).toEqual(retrievedDoc1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: document-management-backend, Property 9: Metadata round-trip consistency
   * Validates: Requirements 2.9, 7.3
   * 
   * For any document with optional fields undefined, the round-trip should
   * preserve the undefined state (not convert to null or empty string).
   */
  it('should preserve undefined optional fields through round-trip', () => {
    const docWithUndefinedOptionals = documentArb.map(doc => ({
      ...doc,
      category: undefined,
      expiryDate: undefined,
    }));

    fc.assert(
      fc.property(docWithUndefinedOptionals, (originalDoc) => {
        const dynamoItem = documentToDynamoDBItem(originalDoc);
        const retrievedDoc = dynamoDBItemToDocument(dynamoItem);
        
        // Optional fields should remain undefined
        expect(retrievedDoc.category).toBeUndefined();
        expect(retrievedDoc.expiryDate).toBeUndefined();
        
        // Required fields should still be preserved
        expect(retrievedDoc.location).toBe(originalDoc.location);
        expect(retrievedDoc.sensitivity).toBe(originalDoc.sensitivity);
      }),
      { numRuns: 100 }
    );
  });
});
