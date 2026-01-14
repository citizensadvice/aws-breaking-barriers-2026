# CORS Error Fix Guide

## The Problem

You're seeing this error:
```
Access to fetch at 'https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This means the backend API Gateway is not configured to allow requests from your local development environment (`http://localhost:3000`).

## What is CORS?

CORS (Cross-Origin Resource Sharing) is a security feature that prevents web pages from making requests to a different domain than the one serving the page. Your browser blocks these requests unless the server explicitly allows them.

## Solution: Configure API Gateway CORS

You need to configure your AWS API Gateway to allow requests from `http://localhost:3000` (and eventually your production domain).

### Option 1: AWS Console (Easiest)

1. **Go to API Gateway Console**:
   - Open AWS Console
   - Navigate to API Gateway
   - Find your API: `y4ddrug6ih`

2. **Enable CORS**:
   - Click on your API
   - Select the `/documents` resource
   - Click "Actions" → "Enable CORS"

3. **Configure CORS Settings**:
   ```
   Access-Control-Allow-Origin: http://localhost:3000,https://your-production-domain.com
   Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
   Access-Control-Allow-Methods: POST,OPTIONS,GET,PUT,DELETE
   ```

4. **Deploy API**:
   - Click "Actions" → "Deploy API"
   - Select stage: `prod`
   - Click "Deploy"

### Option 2: AWS CLI

```bash
# Get your API ID
API_ID="y4ddrug6ih"
REGION="us-west-2"

# Update CORS configuration
aws apigatewayv2 update-api \
  --api-id $API_ID \
  --cors-configuration AllowOrigins="http://localhost:3000,https://your-domain.com",AllowHeaders="content-type,authorization",AllowMethods="GET,POST,PUT,DELETE,OPTIONS" \
  --region $REGION
```

### Option 3: CloudFormation/SAM Template

If you're using Infrastructure as Code, add CORS configuration to your template:

```yaml
Resources:
  DocumentApi:
    Type: AWS::Serverless::Api
    Properties:
      StageName: prod
      Cors:
        AllowOrigin: "'http://localhost:3000'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowCredentials: true
```

### Option 4: Lambda Function Response Headers

If CORS is handled in your Lambda function, ensure it returns these headers:

```python
# Python Lambda
return {
    'statusCode': 200,
    'headers': {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    },
    'body': json.dumps(response_data)
}
```

```javascript
// Node.js Lambda
return {
    statusCode: 200,
    headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    },
    body: JSON.stringify(responseData)
};
```

## Required CORS Headers

Your API must return these headers:

### For Preflight (OPTIONS) Requests:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### For Actual Requests:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
```

## Testing CORS Configuration

### 1. Test with curl

```bash
# Test preflight request
curl -X OPTIONS \
  https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Should return:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: POST, OPTIONS, ...
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
```

### 2. Test with Browser

After configuring CORS:
1. Restart your React dev server
2. Try uploading a file
3. Check Network tab in DevTools
4. Look for:
   - OPTIONS request (preflight) - should return 200
   - POST request - should succeed

## Common CORS Mistakes

### ❌ Wildcard with Credentials
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```
This doesn't work! You must specify exact origins when using credentials.

### ❌ Missing OPTIONS Method
API Gateway must handle OPTIONS requests for preflight checks.

### ❌ Wrong Origin Format
```
Access-Control-Allow-Origin: localhost:3000  ❌
Access-Control-Allow-Origin: http://localhost:3000  ✅
```

### ❌ Missing Authorization Header
```
Access-Control-Allow-Headers: Content-Type  ❌
Access-Control-Allow-Headers: Content-Type,Authorization  ✅
```

## Production Configuration

For production, update CORS to allow your CloudFront domain:

```
Access-Control-Allow-Origin: https://d1234567890abc.cloudfront.net
```

Or if using a custom domain:
```
Access-Control-Allow-Origin: https://upload.yourdomain.com
```

## Multiple Origins

If you need to allow multiple origins (dev + prod):

### Option 1: Comma-separated (API Gateway v2)
```
Access-Control-Allow-Origin: http://localhost:3000,https://your-domain.com
```

### Option 2: Dynamic in Lambda
```python
def get_cors_origin(event):
    origin = event.get('headers', {}).get('origin', '')
    allowed_origins = [
        'http://localhost:3000',
        'https://your-domain.com'
    ]
    return origin if origin in allowed_origins else allowed_origins[0]

# In response:
'Access-Control-Allow-Origin': get_cors_origin(event)
```

## Verification Checklist

After configuring CORS, verify:

- [ ] OPTIONS request returns 200 OK
- [ ] OPTIONS response includes `Access-Control-Allow-Origin`
- [ ] OPTIONS response includes `Access-Control-Allow-Methods`
- [ ] OPTIONS response includes `Access-Control-Allow-Headers`
- [ ] POST request succeeds
- [ ] POST response includes `Access-Control-Allow-Origin`
- [ ] No CORS errors in browser console

## Temporary Workaround (Development Only)

While waiting for backend CORS configuration, you can use a CORS proxy for testing:

### Option 1: Browser Extension
Install a CORS browser extension (Chrome/Firefox):
- "CORS Unblock" or "Allow CORS"
- Enable it temporarily for testing
- **⚠️ Only for development! Disable after testing!**

### Option 2: Proxy in package.json
Add a proxy to your React app (only works for same-domain requests):

```json
// package.json
{
  "proxy": "https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com"
}
```

Then change API calls to use relative URLs:
```typescript
// Instead of: https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents
// Use: /prod/documents
```

**Note**: This only works in development and won't work in production.

## Next Steps

1. **Configure CORS** on your API Gateway (use Option 1 - AWS Console)
2. **Deploy the API** to the `prod` stage
3. **Test the upload** - CORS error should be gone
4. **Add production domain** to CORS when deploying to CloudFront

## Need Help?

If you don't have access to configure the API Gateway:
1. Contact your AWS administrator
2. Provide them with this required CORS configuration:
   ```
   Allow-Origin: http://localhost:3000
   Allow-Headers: Content-Type, Authorization
   Allow-Methods: POST, GET, PUT, DELETE, OPTIONS
   ```

## Summary

**The Issue**: API Gateway doesn't allow requests from `http://localhost:3000`

**The Fix**: Configure CORS in API Gateway to allow your origin

**Quick Fix**: AWS Console → API Gateway → Enable CORS → Deploy

Once CORS is configured, your uploads will work! 🎉
