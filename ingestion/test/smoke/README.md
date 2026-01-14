# Smoke Tests

Smoke tests validate that the deployed infrastructure and API are functioning correctly after deployment.

## Test Suites

### 1. Infrastructure Smoke Tests (`infrastructure.smoke.test.ts`)
Validates AWS resources are deployed and accessible:
- CloudFormation stack status
- S3 bucket accessibility
- DynamoDB table and GSIs
- Cognito User Pool
- Lambda functions
- API Gateway
- Bedrock Knowledge Base
- OpenSearch Serverless collection
- IAM roles

**Tests:** 10 tests

### 2. API Smoke Tests (`api.smoke.test.ts`)
Tests critical API endpoints end-to-end with comprehensive document type coverage:

**Authentication & Authorization:**
- Authentication flow
- Unauthenticated request rejection

**Document Upload (All Supported Types):**
- PDF upload
- DOCX upload
- DOC upload
- PPTX upload
- PPT upload
- Web URL (PDF) upload
- Web URL (HTML) upload

**Document Operations:**
- Document listing with pagination
- Document retrieval with presigned URLs
- Metadata updates
- Document deletion with verification

**Search Capabilities:**
- Metadata search
- Filtered search
- Semantic search endpoint

**Error Handling:**
- Invalid document ID (404 responses)

**Cleanup:**
- Automatic deletion of all test documents
- Automatic deletion of test users

**Tests:** 18 tests

**Note:** API tests require the Cognito User Pool Client to have `ALLOW_ADMIN_USER_PASSWORD_AUTH` enabled.

## Running Tests

### Prerequisites
- AWS credentials configured
- Stack deployed to AWS
- `jq` installed (for shell script)
- For API tests: Cognito client must have ADMIN_NO_SRP_AUTH flow enabled

### Run All Smoke Tests
```bash
cd ingestion
npm run smoke:all
```

### Run Individual Test Suites
```bash
# Infrastructure tests only (10 tests)
npm run smoke:infra

# API tests only (18 tests)
npm run smoke:api
```

### Using the Shell Script
```bash
cd ingestion
./scripts/smoke-test.sh
```

### Environment Variables
- `STACK_NAME` - CloudFormation stack name (default: `DocumentManagementStack`)
- `AWS_REGION` - AWS region (default: `us-west-2`)
- `TEST_USER_EMAIL` - Test user email (auto-generated if not provided)
- `TEST_USER_PASSWORD` - Test user password (default: `SmokeTest123!@#`)

### CI/CD Integration
```bash
npm run smoke:ci
```

## Test Output

Tests provide detailed console output showing:
- ✓ Successful validations
- Resource identifiers
- API response statuses
- Document IDs created during tests
- Cleanup confirmation for all test documents

## Document Types Tested

The API smoke tests validate all supported document formats:

1. **PDF** - Portable Document Format
2. **DOCX** - Microsoft Word (Office Open XML)
3. **DOC** - Microsoft Word (Legacy format)
4. **PPTX** - Microsoft PowerPoint (Office Open XML)
5. **PPT** - Microsoft PowerPoint (Legacy format)
6. **Web URL (PDF)** - Remote PDF file download
7. **Web URL (HTML)** - Remote HTML page conversion

Each document type is:
- Uploaded with unique metadata
- Tracked for cleanup
- Automatically deleted after tests complete
- Verified for successful deletion

## Cleanup

API smoke tests automatically clean up:
- **All test documents** (7 documents across all supported types)
- **Test user** deleted after tests complete
- **Verification** of successful deletion for each document

The cleanup happens in two phases:
1. During the test suite (explicit deletion test)
2. In the `afterAll` hook (safety cleanup)

## Troubleshooting

### "Auth flow not enabled for this client"
The Cognito User Pool Client needs to have the `ALLOW_ADMIN_USER_PASSWORD_AUTH` auth flow enabled. You can enable this by:

1. **Via AWS Console:**
   - Go to Cognito → User Pools → Your Pool → App clients
   - Edit the client and enable "ALLOW_ADMIN_USER_PASSWORD_AUTH"

2. **Via CDK (recommended):** Update the User Pool Client in `document-management-stack.ts`:
   ```typescript
   this.userPoolClient = this.userPool.addClient('DocumentManagementAppClient', {
     authFlows: {
       userPassword: true,
       userSrp: true,
       adminUserPassword: true  // Add this line
     },
     // ... rest of config
   });
   ```

3. **Via AWS CLI:**
   ```bash
   aws cognito-idp update-user-pool-client \
     --user-pool-id <USER_POOL_ID> \
     --client-id <CLIENT_ID> \
     --explicit-auth-flows ALLOW_ADMIN_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_PASSWORD_AUTH
   ```

### "Attributes did not conform to the schema"
Custom attributes must be defined in the User Pool. The smoke tests use only standard attributes (email) to avoid this issue.

### Web URL uploads failing
Web URL uploads require external network access from Lambda functions. Ensure:
- Lambda functions have internet access (via NAT Gateway or VPC endpoints)
- Target URLs are publicly accessible
- Lambda timeout is sufficient for download operations

