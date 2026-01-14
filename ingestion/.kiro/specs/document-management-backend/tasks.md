# Implementation Plan: Document Management Backend

## Overview

This implementation plan covers building a serverless document management backend using AWS CDK with TypeScript. The system includes document upload, metadata management, Bedrock Knowledge Base integration, and search functionality.

## Tasks

- [x] 1. Set up project structure and AWS CDK infrastructure
  - [x] 1.1 Initialize CDK project with TypeScript
    - Create CDK app with standard project structure
    - Configure TypeScript, ESLint, and testing framework (Jest + fast-check)
    - _Requirements: 8.2_
  - [x] 1.2 Define core infrastructure stack
    - Create S3 bucket for documents with lifecycle policies
    - Create DynamoDB table with GSIs for document metadata
    - Configure IAM roles and policies
    - _Requirements: 8.1, 8.4_
  - [x] 1.3 Set up Cognito User Pool
    - Create User Pool with custom attributes (organizationId, role)
    - Configure app client for JWT authentication
    - _Requirements: 5.5_

- [x] 2. Implement document validation and metadata models
  - [x] 2.1 Create shared types and interfaces
    - Define Document, DocumentMetadata, User interfaces
    - Create validation schemas using zod
    - _Requirements: 2.1, 2.2, 2.5_
  - [ ]* 2.2 Write property tests for validation logic
    - **Property 2: Unsupported file types are rejected**
    - **Property 3: Location metadata is required**
    - **Property 5: Sensitivity must be between 1 and 5**
    - **Validates: Requirements 1.5, 2.1, 2.5**
  - [x] 2.3 Implement file type validation
    - Validate supported extensions (.pdf, .doc, .docx, .ppt, .pptx)
    - Validate file size limits
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_
  - [x] 2.4 Write property test for file type validation
    - **Property 1: Supported file types are accepted**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Checkpoint - Ensure validation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Document Lambda
  - [x] 4.1 Create document upload handler
    - Handle file upload to S3
    - Generate document ID and S3 key
    - Store metadata in DynamoDB with version 1
    - Create metadata.json file for Bedrock KB
    - _Requirements: 1.1, 1.2, 2.2, 2.5, 2.6, 2.7_
  - [ ]* 4.2 Write property tests for document creation
    - **Property 4: File extension is automatically captured**
    - **Property 6: Sensitivity defaults to 3**
    - **Property 7: New documents start at version 1**
    - **Validates: Requirements 2.2, 2.6, 2.7**
  - [x] 4.3 Create document retrieval handler
    - Get document by ID with authorization check
    - Return document metadata and presigned URL for download
    - _Requirements: 7.1_
  - [x] 4.4 Create document update handler
    - Replace file in S3
    - Increment version number
    - Update metadata in DynamoDB
    - _Requirements: 2.8, 7.2, 7.3_
  - [ ]* 4.5 Write property test for version increment
    - **Property 8: Document updates increment version**
    - **Validates: Requirements 2.8, 7.2**
  - [x] 4.6 Create document delete handler
    - Remove file from S3
    - Remove metadata from DynamoDB
    - _Requirements: 7.4_
  - [ ]* 4.7 Write property test for deletion
    - **Property 10: Deleted documents are removed from storage**
    - **Validates: Requirements 3.3, 7.4**
  - [x] 4.8 Create document list handler
    - List documents with pagination
    - Filter by metadata fields
    - _Requirements: 7.5, 7.6_

- [x] 5. Checkpoint - Ensure document operations tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement authorization middleware
  - [x] 6.1 Create JWT validation middleware
    - Verify Cognito JWT tokens
    - Extract user claims (userId, organizationId, role)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [ ]* 6.2 Write property test for authentication
    - **Property 16: Unauthenticated requests are rejected**
    - **Validates: Requirements 5.1, 5.3**
  - [x] 6.3 Create authorization helper functions
    - Check document ownership
    - Check organization membership
    - Check admin role
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 6.4 Write property tests for authorization
    - **Property 11: Search returns only authorized documents**
    - **Property 12: Cross-organization access is denied**
    - **Property 13: Non-owner modification requires admin role**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 7. Checkpoint - Ensure authorization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Conversion Lambda
  - [x] 8.1 Create Google Docs conversion handler
    - Fetch document via Google Docs API
    - Export as PDF
    - Store in S3
    - _Requirements: 1.4_
  - [x] 8.2 Create PowerPoint conversion handler
    - Convert .pptx to PDF using LibreOffice Lambda layer
    - Store converted file in S3
    - _Requirements: 1.3_

- [x] 9. Implement Search Lambda
  - [x] 9.1 Create metadata search handler
    - Query DynamoDB with filters
    - Support pagination
    - Apply authorization filtering
    - _Requirements: 4.2, 4.4, 4.5_
  - [ ]* 9.2 Write property tests for metadata search
    - **Property 14: Metadata filter accuracy**
    - **Property 15: Pagination consistency**
    - **Validates: Requirements 4.2, 4.4**
  - [x] 9.3 Create semantic search handler
    - Query Bedrock Knowledge Base
    - Return document references and text passages
    - Apply authorization filtering
    - _Requirements: 4.1, 4.3, 4.5_

- [x] 10. Checkpoint - Ensure search tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Set up Bedrock Knowledge Base infrastructure
  - [x] 11.1 Create OpenSearch Serverless collection
    - Configure vector search collection
    - Set up access policies
    - _Requirements: 3.5, 8.3_
  - [x] 11.2 Create Bedrock Knowledge Base
    - Configure S3 data source
    - Set up embedding model (Titan Embeddings V2)
    - Configure metadata indexing
    - _Requirements: 3.1, 3.2_

- [x] 12. Implement API Gateway and wire components
  - [x] 12.1 Create API Gateway REST API
    - Define all endpoints
    - Configure Cognito authorizer
    - Set up request/response mappings
    - _Requirements: 5.1_
  - [x] 12.2 Connect Lambda functions to API Gateway
    - Wire Document Lambda to CRUD endpoints
    - Wire Search Lambda to search endpoints
    - Configure CORS
    - _Requirements: 4.1, 4.2, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 13. Implement metadata round-trip test
  - [x] 13.1 Write property test for metadata consistency
    - **Property 9: Metadata round-trip consistency**
    - **Validates: Requirements 2.9, 7.3**

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Use fast-check library for property-based testing in TypeScript
