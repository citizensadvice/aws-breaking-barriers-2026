# API Integration Guide

## Overview

The Document Upload UI is now configured to upload files to the backend API at:

**Production Endpoint**: `https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod`

## API Endpoint

### POST /documents

Uploads a document with metadata to the backend.

**Request Format** (JSON):
```json
{
  "fileName": "contract.pdf",
  "fileContent": "JVBERi0xLjQK...",  // Base64-encoded file
  "metadata": {
    "location": "New York",           // Required
    "category": "Legal",              // Optional
    "expiryDate": "2025-12-31",      // Optional (ISO 8601 date)
    "sensitivity": 3                  // Optional (1-5)
  }
}
```

**Response** (201 Created):
```json
{
  "document": {
    "id": "uuid",
    "fileName": "contract.pdf",
    "location": "New York",
    "status": "processing",
    "createdAt": "2026-01-14T10:00:00Z"
  }
}
```

## Authentication

All API requests include the Cognito JWT token in the Authorization header:

```
Authorization: Bearer <cognito-jwt-token>
```

The token is automatically obtained from the AuthContext after successful login.

## How It Works

### 1. File Upload Flow

```
User selects file
    ↓
File is read and converted to base64
    ↓
JSON request body is created with:
  - fileName
  - fileContent (base64)
  - metadata
    ↓
POST request to /documents with JWT token
    ↓
Backend processes and stores document
    ↓
Response with document ID and status
    ↓
UI shows success message
```

### 2. Google Docs Upload Flow

```
User enters Google Docs URL
    ↓
JSON request body is created with:
  - fileName (extracted from URL)
  - googleDocsUrl
  - metadata
    ↓
POST request to /documents with JWT token
    ↓
Backend fetches and processes Google Doc
    ↓
Response with document ID and status
    ↓
UI shows success message
```

## Implementation Details

### API Client (`src/services/api.ts`)

The `DocumentAPIClient` class handles all API communication:

```typescript
const client = new DocumentAPIClient(authToken);

// Upload a file
await client.uploadFile(file, metadata, fileId, onProgress);

// Upload Google Docs
await client.uploadGoogleDoc(url, metadata);

// Cancel upload
client.cancelUpload(fileId);
```

### Key Methods

**`uploadFile()`**:
- Converts file to base64
- Creates JSON request body per OpenAPI spec
- Sends POST to `/documents`
- Returns upload response

**`uploadGoogleDoc()`**:
- Extracts filename from URL
- Creates JSON request body with `googleDocsUrl`
- Sends POST to `/documents`
- Returns upload response

**`fileToBase64()`**:
- Reads file using FileReader API
- Converts to base64 string
- Removes data URL prefix

## Configuration

### Environment Variables

Set the API endpoint in your environment:

**Development** (`.env.development`):
```env
REACT_APP_API_ENDPOINT=https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod
REACT_APP_USER_POOL_ID=us-west-2_yourpoolid
REACT_APP_USER_POOL_CLIENT_ID=yourclientid
REACT_APP_AWS_REGION=us-west-2
```

**Production** (`.env.production`):
```env
REACT_APP_API_ENDPOINT=${API_ENDPOINT}
REACT_APP_USER_POOL_ID=${COGNITO_USER_POOL_ID}
REACT_APP_USER_POOL_CLIENT_ID=${COGNITO_CLIENT_ID}
REACT_APP_AWS_REGION=${AWS_REGION}
```

### Default Endpoint

If `REACT_APP_API_ENDPOINT` is not set, the default is:
```
https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod
```

## Metadata Fields

### Required Fields

- **location** (string): Geographic location where document applies
  - Example: "New York", "California", "London"

### Optional Fields

- **category** (string): Document category for organization
  - Example: "Legal", "Policy", "Contract"
  - Predefined options available in UI

- **expiryDate** (string): ISO 8601 date (YYYY-MM-DD)
  - Example: "2025-12-31"
  - Must be in the future

- **sensitivity** (number): Sensitivity ranking 1-5
  - 1 = Low sensitivity
  - 3 = Medium sensitivity (default)
  - 5 = High sensitivity

- **title** (string): Custom document title
  - Optional override for display name

## Supported File Types

According to the OpenAPI spec, the backend supports:

- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft PowerPoint (`.ppt`, `.pptx`)

The UI validates these file types before upload.

## Error Handling

### Common Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "MISSING_LOCATION",
  "message": "Location metadata is required"
}
```

**400 Bad Request** - Unsupported file type:
```json
{
  "error": "UNSUPPORTED_FILE_TYPE",
  "message": "File type .txt is not supported"
}
```

**401 Unauthorized** - Missing or invalid token:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### Error Handling in UI

The API client automatically:
1. Catches errors from fetch responses
2. Parses error JSON
3. Creates `UploadError` objects
4. Displays user-friendly error messages

## Testing the Integration

### 1. Set Environment Variables

```bash
export REACT_APP_API_ENDPOINT="https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod"
export REACT_APP_USER_POOL_ID="us-west-2_yourpoolid"
export REACT_APP_USER_POOL_CLIENT_ID="yourclientid"
export REACT_APP_AWS_REGION="us-west-2"
```

### 2. Start Development Server

```bash
cd document-upload-ui
npm start
```

### 3. Test Upload

1. Log in with your Cognito credentials
2. Select a PDF, Word, or PowerPoint file
3. Fill in required metadata (location)
4. Click upload
5. Check browser console for API request/response
6. Verify success message

### 4. Monitor API Calls

Open browser DevTools → Network tab:
- Look for POST request to `/documents`
- Check request headers (Authorization token)
- Check request payload (JSON with base64 content)
- Check response status and body

## Troubleshooting

### Upload fails with 401 Unauthorized

**Cause**: Missing or expired JWT token

**Solution**:
1. Ensure you're logged in
2. Check browser console for auth errors
3. Try logging out and back in
4. Verify Cognito configuration

### Upload fails with 400 Bad Request

**Cause**: Invalid request format or missing required fields

**Solution**:
1. Check that location is filled in
2. Verify file type is supported
3. Check browser console for error details
4. Verify API endpoint is correct

### Upload fails with CORS error

**Cause**: API doesn't allow requests from your origin

**Solution**:
1. Verify API Gateway CORS configuration
2. Check that your domain is whitelisted
3. For local development, ensure `localhost:3000` is allowed

### File upload succeeds but no response

**Cause**: Network timeout or large file

**Solution**:
1. Check file size (may need to increase timeout)
2. Check network tab for response
3. Verify API is processing the request
4. Check CloudWatch logs on backend

## API Response Handling

### Success Response

```typescript
{
  document: {
    id: string;
    fileName: string;
    location: string;
    category?: string;
    status: 'active' | 'processing' | 'failed';
    createdAt: string;
    updatedAt: string;
  }
}
```

### Progress Tracking

Note: Since we're using JSON with base64 encoding, true upload progress tracking is limited. The UI simulates progress by:
1. Showing indeterminate progress during base64 conversion
2. Showing 100% when upload completes

For large files, consider implementing chunked uploads or multipart upload in the future.

## Future Enhancements

Potential improvements to the API integration:

1. **Chunked Uploads**: Split large files into chunks for better progress tracking
2. **Resumable Uploads**: Save upload state and resume interrupted uploads
3. **Multipart Upload**: Use S3 multipart upload for files >5MB
4. **Compression**: Compress files before base64 encoding to reduce payload size
5. **Streaming**: Stream file content instead of loading entire file into memory

## Security Considerations

1. **JWT Token**: Always included in Authorization header
2. **HTTPS Only**: All API calls use HTTPS
3. **Token Refresh**: Automatically handled by AuthContext
4. **No Credentials in Code**: API endpoint from environment variables
5. **Base64 Encoding**: Files are base64-encoded for JSON transport

## Support

For API-related issues:
- Check CloudWatch logs for backend errors
- Verify API Gateway configuration
- Check Cognito User Pool settings
- Review Lambda function logs
- Test API directly with curl or Postman

## Example curl Request

Test the API directly:

```bash
# Get JWT token from Cognito
TOKEN="your-jwt-token-here"

# Upload a document
curl -X POST https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.pdf",
    "fileContent": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PD4+Pj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDY0IDAwMDAwIG4gCjAwMDAwMDAxMTMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgoxOTYKJSVFT0YK",
    "metadata": {
      "location": "New York",
      "category": "Test",
      "sensitivity": 3
    }
  }'
```

Your Document Upload UI is now fully integrated with the backend API! 🎉
