# Deployment Guide

## Overview

This document provides instructions for deploying the Document Upload UI to AWS CloudFront and S3.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials
- Node.js 16+ and npm installed
- AWS S3 bucket created for hosting
- AWS CloudFront distribution configured (optional but recommended)
- AWS Cognito User Pool configured

## Environment Variables

### Required Environment Variables

The following environment variables must be set before deployment:

```bash
# AWS Cognito Configuration
export COGNITO_USER_POOL_ID="us-east-1_xxxxxxxxx"
export COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
export AWS_REGION="us-east-1"

# Backend API Configuration
export API_ENDPOINT="https://api.example.com"

# Deployment Configuration
export S3_BUCKET_NAME="document-upload-ui-production"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # Optional
```

### Optional Environment Variables

```bash
# Cognito Domain (for hosted UI)
export COGNITO_DOMAIN="your-domain.auth.us-east-1.amazoncognito.com"
```

## Build Configuration

### Code Splitting

The application uses React lazy loading for route-based code splitting:
- Login page is loaded on demand
- Upload page is loaded on demand
- Reduces initial bundle size and improves load time

### Bundle Optimization

React Scripts (Create React App) automatically optimizes the production build:
- Minification of JavaScript and CSS
- Tree shaking to remove unused code
- Asset optimization and compression
- Source map generation (disabled in production)

## Deployment Methods

### Method 1: Automated Deployment Script

Use the provided deployment script for automated deployment:

```bash
# Deploy to production
./deploy.sh production

# Deploy to staging
./deploy.sh staging
```

The script performs the following steps:
1. Installs dependencies
2. Runs tests
3. Builds production bundle
4. Uploads to S3 with appropriate cache headers
5. Invalidates CloudFront cache (if configured)

### Method 2: Manual Deployment

#### Step 1: Build the Application

```bash
# Install dependencies
npm ci

# Run tests
npm test

# Build production bundle
npm run build
```

#### Step 2: Upload to S3

```bash
# Sync build directory to S3 (with long cache for static assets)
aws s3 sync build/ s3://${S3_BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://${S3_BUCKET_NAME}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

#### Step 3: Invalidate CloudFront Cache

```bash
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

## CloudFront Configuration

### Initial Setup

1. Create an S3 bucket for hosting
2. Create a CloudFront Origin Access Identity (OAI)
3. Configure S3 bucket policy to allow CloudFront access
4. Create CloudFront distribution using `cloudfront-config.json` as reference

### Key Configuration Points

**Origin Settings:**
- Origin Domain: S3 bucket domain
- Origin Access: Use Origin Access Identity
- Origin Protocol Policy: HTTPS only

**Cache Behavior:**
- Viewer Protocol Policy: Redirect HTTP to HTTPS
- Allowed HTTP Methods: GET, HEAD
- Compress Objects: Yes
- Cache Policy: Optimized for static content

**Error Pages:**
- 403 and 404 errors redirect to `/index.html` for SPA routing support

**Security:**
- Minimum TLS version: TLSv1.2_2021
- HTTP/2 enabled

## Cache Strategy

### Static Assets (JS, CSS, Images)
- Cache-Control: `public, max-age=31536000, immutable`
- Long-term caching with content hashing in filenames
- CloudFront TTL: 1 year

### HTML Files
- Cache-Control: `no-cache, no-store, must-revalidate`
- Always fetch fresh from origin
- Ensures users get latest version

## Rollback Procedure

If a deployment causes issues:

1. **Revert S3 content:**
   ```bash
   # List previous versions
   aws s3api list-object-versions --bucket ${S3_BUCKET_NAME}
   
   # Restore previous version (if versioning enabled)
   aws s3api copy-object \
     --copy-source ${S3_BUCKET_NAME}/index.html?versionId=VERSION_ID \
     --bucket ${S3_BUCKET_NAME} \
     --key index.html
   ```

2. **Invalidate CloudFront cache:**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
     --paths "/*"
   ```

## Monitoring and Validation

### Post-Deployment Checks

1. **Verify CloudFront distribution:**
   ```bash
   aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID}
   ```

2. **Test application access:**
   - Open CloudFront URL in browser
   - Verify login functionality
   - Test file upload flow
   - Check browser console for errors

3. **Monitor CloudFront metrics:**
   - Requests
   - Error rates (4xx, 5xx)
   - Cache hit ratio

### Health Checks

- Application should load within 2 seconds
- All routes should be accessible
- Authentication should work correctly
- File upload should function properly

## Troubleshooting

### Issue: 403 Forbidden Error

**Cause:** S3 bucket policy doesn't allow CloudFront access

**Solution:** Update S3 bucket policy to allow CloudFront OAI

### Issue: Stale Content After Deployment

**Cause:** CloudFront cache not invalidated

**Solution:** Create CloudFront invalidation for `/*`

### Issue: Environment Variables Not Applied

**Cause:** Environment variables not set during build

**Solution:** Ensure all `REACT_APP_*` variables are set before running `npm run build`

### Issue: SPA Routes Return 404

**Cause:** CloudFront not configured to redirect to index.html

**Solution:** Configure custom error responses in CloudFront (see cloudfront-config.json)

## Security Considerations

1. **Never commit sensitive credentials** to version control
2. **Use IAM roles** for deployment automation
3. **Enable S3 bucket versioning** for rollback capability
4. **Use HTTPS only** - enforce via CloudFront
5. **Implement Content Security Policy** headers
6. **Regular security updates** for dependencies

## Cost Optimization

- Use CloudFront PriceClass_100 for US/Europe only (adjust as needed)
- Enable compression to reduce data transfer
- Set appropriate cache TTLs to minimize origin requests
- Monitor CloudFront usage and adjust as needed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy
        env:
          COGNITO_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}
          COGNITO_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}
          API_ENDPOINT: ${{ secrets.API_ENDPOINT }}
          S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
          CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
        run: ./deploy.sh production
```

## Support

For deployment issues or questions, refer to:
- AWS CloudFront documentation
- AWS S3 documentation
- React deployment documentation
