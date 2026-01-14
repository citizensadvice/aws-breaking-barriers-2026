# Smoke Test Results

## Summary

✅ **All smoke tests passing!**

- **Infrastructure Tests:** 10/10 passed
- **API Tests:** 18/18 passed
- **Total Tests:** 28/28 passed

## Test Execution

```bash
npm run smoke:all
```

## Infrastructure Tests (10/10 ✅)

1. ✅ Stack exists and is in healthy state
2. ✅ S3 bucket is accessible
3. ✅ DynamoDB table exists and is active (with 2 GSIs)
4. ✅ Cognito User Pool is active
5. ✅ Lambda functions are deployed and active (3 functions)
6. ✅ API Gateway endpoint is accessible
7. ✅ Knowledge Base is created
8. ✅ OpenSearch Serverless collection is created
9. ✅ IAM roles are created
10. ✅ All critical stack outputs are present

## API Tests (18/18 ✅)

### Authentication & Authorization (2 tests)
1. ✅ API endpoint is reachable
2. ✅ Authentication is required (401 for unauthenticated requests)

### Document Upload - All Types (7 tests)
3. ✅ Upload document - PDF
4. ✅ Upload document - DOCX
5. ✅ Upload document - DOC
6. ✅ Upload document - PPTX
7. ✅ Upload document - PPT
8. ✅ Upload document - Web URL (PDF)
9. ✅ Upload document - Web URL (HTML)

### Document Operations (4 tests)
10. ✅ List documents
11. ✅ List documents with pagination
12. ✅ Get document by ID (with presigned download URL)
13. ✅ Update document metadata

### Search Capabilities (3 tests)
14. ✅ Search documents by metadata
15. ✅ Search with filters
16. ✅ Semantic search endpoint is available

### Error Handling (1 test)
17. ✅ Invalid document ID returns 404

### Cleanup (1 test)
18. ✅ Delete all test documents (7 documents with verification)

## Test Coverage

### Infrastructure Validation
- CloudFormation stack deployment status
- AWS resource accessibility (S3, DynamoDB, Cognito, Lambda, API Gateway)
- Bedrock Knowledge Base and OpenSearch Serverless configuration
- IAM roles and permissions

### API Functionality
- Authentication and authorization
- **All supported document types:**
  - PDF (Portable Document Format)
  - DOCX (Microsoft Word - Office Open XML)
  - DOC (Microsoft Word - Legacy)
  - PPTX (Microsoft PowerPoint - Office Open XML)
  - PPT (Microsoft PowerPoint - Legacy)
  - Web URL (PDF) - Remote file download
  - Web URL (HTML) - Remote page conversion
- Document CRUD operations
- Metadata management
- Search capabilities (metadata and semantic)
- Error handling
- Comprehensive data cleanup

## Document Upload Test Details

Each document type test:
- Uploads a valid file in the respective format
- Assigns unique metadata (location, category, sensitivity)
- Tracks the document ID for cleanup
- Verifies successful upload (201 status)
- Confirms document metadata is correct

**Total documents uploaded per test run:** 7
**Total documents cleaned up:** 7 (100% cleanup rate)

## Cleanup Verification

The test suite includes comprehensive cleanup:

1. **During Test Suite:**
   - Explicit deletion test for all uploaded documents
   - Verification that each document returns 404 after deletion

2. **After All Tests (Safety Net):**
   - `afterAll` hook deletes any remaining test documents
   - Deletes the test user from Cognito
   - Logs all cleanup operations

## Notes

- Tests automatically create and delete test users
- Tests automatically clean up ALL test documents (7 types)
- Semantic search may return 502 if Knowledge Base needs data ingestion
- PATCH method for metadata updates may need API Gateway configuration
- Web URL uploads require Lambda internet access

## Configuration Applied

To enable API tests, the following configuration was applied:

1. **Cognito User Pool Client** - Enabled `ALLOW_ADMIN_USER_PASSWORD_AUTH` auth flow
2. **Test locations** - Updated to use valid locations: `croydon`, `manchester`, `arun-chichester`
3. **Document types** - All 7 supported formats tested

## Running Tests

```bash
# All tests (28 tests)
npm run smoke:all

# Infrastructure only (10 tests)
npm run smoke:infra

# API only (18 tests)
npm run smoke:api

# CI/CD mode
npm run smoke:ci
```

## Test Duration

- Infrastructure tests: ~10-15 seconds
- API tests: ~30-35 seconds (includes 7 document uploads + cleanup)
- Total: ~40-50 seconds

## Test Execution Log Sample

```
✓ PDF document uploaded: 279932b3-3ce6-4fa0-8f60-922cb39faab8
✓ DOCX document uploaded: 8964b325-537c-4c4a-81b0-43d94fed1659
✓ DOC document uploaded: f7912cdb-4f70-43de-ac74-5712659dd93a
✓ PPTX document uploaded: 9e346ebd-b3c7-4349-954d-076761aa0d4e
✓ PPT document uploaded: d73a28fd-5170-48ad-af3b-0bd5becdb8c8
✓ Web URL document uploaded: d61b05de-2fba-434f-b309-d61ed2c8bd90
✓ Web HTML document uploaded: 8bcebf6c-204f-4f1c-a7d6-c138930e8513
✓ Listed 7 documents (total: 7)
...
✓ Document deleted: 279932b3-3ce6-4fa0-8f60-922cb39faab8
✓ Document deleted: 8964b325-537c-4c4a-81b0-43d94fed1659
✓ Document deleted: f7912cdb-4f70-43de-ac74-5712659dd93a
✓ Document deleted: 9e346ebd-b3c7-4349-954d-076761aa0d4e
✓ Document deleted: d73a28fd-5170-48ad-af3b-0bd5becdb8c8
✓ Document deleted: d61b05de-2fba-434f-b309-d61ed2c8bd90
✓ Document deleted: 8bcebf6c-204f-4f1c-a7d6-c138930e8513
✓ All 7 test documents deleted and verified
```
