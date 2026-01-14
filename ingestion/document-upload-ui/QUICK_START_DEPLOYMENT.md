# Quick Start Deployment Guide

## Prerequisites Checklist

- [ ] AWS CLI installed and configured
- [ ] Node.js 16+ installed
- [ ] AWS Cognito User Pool created
- [ ] S3 bucket created for hosting
- [ ] CloudFront distribution created (optional but recommended)

## 5-Minute Deployment

### Step 1: Set Environment Variables (1 min)

```bash
# Required variables
export COGNITO_USER_POOL_ID="us-east-1_xxxxxxxxx"
export COGNITO_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"
export AWS_REGION="us-east-1"
export API_ENDPOINT="https://api.example.com"
export S3_BUCKET_NAME="document-upload-ui-production"

# Optional (for CloudFront cache invalidation)
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
```

### Step 2: Run Deployment Script (3-4 min)

```bash
cd document-upload-ui
./deploy.sh production
```

The script will:
1. Install dependencies
2. Run tests
3. Build production bundle
4. Upload to S3
5. Invalidate CloudFront cache (if configured)

### Step 3: Verify Deployment (1 min)

1. Open your CloudFront URL or S3 website endpoint
2. Verify the application loads
3. Test login functionality
4. Try uploading a file

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Build
npm ci
npm test
npm run build

# Deploy to S3
aws s3 sync build/ s3://${S3_BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp build/index.html s3://${S3_BUCKET_NAME}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Invalidate CloudFront (if using)
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

## Troubleshooting

**Build fails:**
- Check Node.js version (requires 16+)
- Run `npm ci` to clean install dependencies

**Tests fail:**
- Review test output for specific failures
- Ensure all dependencies are installed

**S3 upload fails:**
- Verify AWS credentials are configured
- Check S3 bucket exists and you have write permissions
- Verify bucket name is correct

**Application doesn't load:**
- Check CloudFront distribution status (must be "Deployed")
- Verify S3 bucket policy allows CloudFront access
- Check browser console for errors

**Environment variables not working:**
- Ensure variables are set before running build
- Variables must start with `REACT_APP_` to be included in build
- Rebuild after changing environment variables

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] Login page accessible
- [ ] Authentication works
- [ ] File upload works
- [ ] Metadata form functions correctly
- [ ] Progress tracking displays
- [ ] Error messages display properly
- [ ] Tested on Chrome, Firefox, Safari, Edge

## Rollback

If deployment causes issues:

```bash
# List previous S3 versions (if versioning enabled)
aws s3api list-object-versions --bucket ${S3_BUCKET_NAME}

# Restore previous version
aws s3api copy-object \
  --copy-source ${S3_BUCKET_NAME}/index.html?versionId=VERSION_ID \
  --bucket ${S3_BUCKET_NAME} \
  --key index.html

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

## Support

For detailed documentation, see:
- `DEPLOYMENT.md` - Complete deployment guide
- `BROWSER_COMPATIBILITY.md` - Browser support details
- `PRODUCTION_READY.md` - Production readiness summary

## Common Commands

```bash
# Development
npm start                    # Start dev server
npm test                     # Run tests
npm run test:watch          # Run tests in watch mode

# Production
npm run build               # Build for production
npm run build:analyze       # Build with bundle analysis
npm run deploy              # Deploy to production
npm run deploy:staging      # Deploy to staging

# Testing
npm run test:coverage       # Run tests with coverage
```

## Environment-Specific Deployments

**Staging:**
```bash
export S3_BUCKET_NAME="document-upload-ui-staging"
export CLOUDFRONT_DISTRIBUTION_ID="E_STAGING_ID"
./deploy.sh staging
```

**Production:**
```bash
export S3_BUCKET_NAME="document-upload-ui-production"
export CLOUDFRONT_DISTRIBUTION_ID="E_PRODUCTION_ID"
./deploy.sh production
```

## Security Notes

- Never commit `.env` files with real credentials
- Use IAM roles for automated deployments
- Enable S3 bucket versioning for rollback capability
- Use HTTPS only (enforced by CloudFront)
- Regularly update dependencies for security patches

## Performance Tips

- Monitor CloudFront cache hit ratio (target: >80%)
- Use CloudFront PriceClass_100 for US/Europe only
- Enable compression in CloudFront
- Set appropriate cache TTLs
- Monitor bundle sizes after updates

## Next Steps

After successful deployment:
1. Set up monitoring and alerts
2. Configure custom domain (if needed)
3. Set up CI/CD pipeline
4. Enable CloudWatch logging
5. Configure backup strategy
