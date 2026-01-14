# Public Web Deployment Guide

This guide will help you deploy the Document Upload UI to the public web using AWS S3 and CloudFront.

## Prerequisites

Before deploying, ensure you have:

- [ ] AWS CLI installed and configured with appropriate credentials
- [ ] AWS account with permissions for S3, CloudFront, and Cognito
- [ ] Node.js 16+ installed
- [ ] Your Cognito User Pool already created
- [ ] Domain name (optional, but recommended for production)

## Quick Deployment (5 Steps)

### Step 1: Create S3 Bucket

Create an S3 bucket to host your application:

```bash
# Set your bucket name (must be globally unique)
export S3_BUCKET_NAME="my-document-upload-ui"
export AWS_REGION="us-east-1"

# Create the bucket
aws s3 mb s3://${S3_BUCKET_NAME} --region ${AWS_REGION}

# Enable static website hosting
aws s3 website s3://${S3_BUCKET_NAME}/ \
  --index-document index.html \
  --error-document index.html
```

### Step 2: Create CloudFront Distribution

Create a CloudFront distribution for global CDN delivery:

```bash
# Create distribution (this takes 15-20 minutes)
aws cloudfront create-distribution \
  --origin-domain-name ${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com \
  --default-root-object index.html

# Note the Distribution ID from the output
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
```

Or use the AWS Console:
1. Go to CloudFront → Create Distribution
2. Origin Domain: Select your S3 bucket
3. Origin Access: Origin Access Control (recommended)
4. Default Root Object: `index.html`
5. Error Pages: Add custom error response for 404 → /index.html (for React Router)
6. Create Distribution
7. Note the Distribution ID and Domain Name

### Step 3: Set Environment Variables

Set your production environment variables:

```bash
# AWS Cognito Configuration (from your Cognito User Pool)
export COGNITO_USER_POOL_ID="us-east-1_YourPoolId"
export COGNITO_CLIENT_ID="YourClientId"
export AWS_REGION="us-east-1"

# Backend API (if you have one)
export API_ENDPOINT="https://api.yourdomain.com"

# CloudFront Distribution ID (from Step 2)
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"

# S3 Bucket Name (from Step 1)
export S3_BUCKET_NAME="my-document-upload-ui"
```

### Step 4: Build and Deploy

Run the deployment script:

```bash
cd document-upload-ui

# Make deploy script executable
chmod +x deploy.sh

# Deploy to production
./deploy.sh production
```

The script will:
1. Install dependencies
2. Run tests
3. Build production bundle
4. Upload to S3
5. Invalidate CloudFront cache

### Step 5: Access Your Application

Your application is now live!

**CloudFront URL**: `https://d1234567890abc.cloudfront.net`
(Replace with your actual CloudFront domain from Step 2)

**S3 Website URL**: `http://my-document-upload-ui.s3-website-us-east-1.amazonaws.com`
(Use CloudFront URL for production - it's faster and supports HTTPS)

## Manual Deployment (Alternative)

If you prefer manual deployment:

### 1. Build the Application

```bash
cd document-upload-ui

# Set environment variables
export REACT_APP_USER_POOL_ID="us-east-1_YourPoolId"
export REACT_APP_USER_POOL_CLIENT_ID="YourClientId"
export REACT_APP_AWS_REGION="us-east-1"

# Install and build
npm ci
npm run build
```

### 2. Upload to S3

```bash
# Upload all files with long cache
aws s3 sync build/ s3://${S3_BUCKET_NAME}/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no cache
aws s3 cp build/index.html s3://${S3_BUCKET_NAME}/index.html \
  --cache-control "no-cache, no-store, must-revalidate"
```

### 3. Invalidate CloudFront

```bash
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

## Setting Up Custom Domain (Optional)

To use your own domain (e.g., `upload.yourdomain.com`):

### 1. Request SSL Certificate

```bash
# Request certificate in us-east-1 (required for CloudFront)
aws acm request-certificate \
  --domain-name upload.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Validate Certificate

Follow the DNS validation instructions in the AWS Console or CLI output.

### 3. Update CloudFront Distribution

1. Go to CloudFront → Your Distribution → Edit
2. Alternate Domain Names (CNAMEs): Add `upload.yourdomain.com`
3. SSL Certificate: Select your ACM certificate
4. Save changes

### 4. Update DNS

Add a CNAME record in your DNS provider:

```
Type: CNAME
Name: upload
Value: d1234567890abc.cloudfront.net
TTL: 300
```

Wait for DNS propagation (5-30 minutes), then access: `https://upload.yourdomain.com`

## Environment-Specific Deployments

### Staging Environment

```bash
export S3_BUCKET_NAME="document-upload-ui-staging"
export CLOUDFRONT_DISTRIBUTION_ID="E_STAGING_ID"
./deploy.sh staging
```

### Production Environment

```bash
export S3_BUCKET_NAME="document-upload-ui-production"
export CLOUDFRONT_DISTRIBUTION_ID="E_PRODUCTION_ID"
./deploy.sh production
```

## Updating the Application

To deploy updates:

```bash
# Make your code changes
# Then deploy
./deploy.sh production
```

The deployment script will:
- Build the new version
- Upload to S3
- Invalidate CloudFront cache
- Users will see the update within minutes

## Troubleshooting

### Application doesn't load

**Check**:
1. CloudFront distribution status is "Deployed" (not "In Progress")
2. S3 bucket policy allows CloudFront access
3. Browser console for errors

**Solution**:
```bash
# Check CloudFront status
aws cloudfront get-distribution --id ${CLOUDFRONT_DISTRIBUTION_ID}

# Verify S3 files
aws s3 ls s3://${S3_BUCKET_NAME}/
```

### 404 errors on page refresh

**Cause**: CloudFront doesn't have error page configuration for React Router

**Solution**: Add custom error response in CloudFront:
1. Go to CloudFront → Your Distribution → Error Pages
2. Create Custom Error Response:
   - HTTP Error Code: 404
   - Customize Error Response: Yes
   - Response Page Path: /index.html
   - HTTP Response Code: 200

### Authentication not working

**Check**:
1. Environment variables are set correctly
2. Cognito User Pool ID and Client ID are correct
3. Browser console for Cognito errors

**Solution**:
```bash
# Verify environment variables in build
cat build/static/js/main.*.js | grep -o "us-east-1_[a-zA-Z0-9]*"
```

### Changes not appearing

**Cause**: CloudFront cache or browser cache

**Solution**:
```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"

# Or hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Security Best Practices

### 1. Enable CloudFront HTTPS Only

In CloudFront distribution settings:
- Viewer Protocol Policy: Redirect HTTP to HTTPS

### 2. Set S3 Bucket Policy

Only allow CloudFront to access your S3 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-document-upload-ui/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### 3. Enable CloudFront Access Logs

Track who's accessing your application:
1. Create S3 bucket for logs
2. Enable logging in CloudFront distribution settings

### 4. Set Security Headers

Add security headers in CloudFront:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

## Cost Estimation

Approximate monthly costs for moderate usage:

- **S3 Storage**: $0.023/GB (~$0.50 for 20GB)
- **S3 Requests**: $0.0004/1000 requests (~$2 for 5M requests)
- **CloudFront Data Transfer**: $0.085/GB (~$8.50 for 100GB)
- **CloudFront Requests**: $0.0075/10,000 requests (~$3.75 for 5M requests)

**Total**: ~$15-20/month for moderate traffic

## Monitoring

### CloudWatch Metrics

Monitor your application:
1. Go to CloudWatch → Metrics → CloudFront
2. Key metrics:
   - Requests
   - BytesDownloaded
   - 4xxErrorRate
   - 5xxErrorRate

### Set Up Alarms

```bash
# Create alarm for 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name document-upload-5xx-errors \
  --alarm-description "Alert on 5xx errors" \
  --metric-name 5xxErrorRate \
  --namespace AWS/CloudFront \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## CI/CD Integration (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

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
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm ci
        working-directory: document-upload-ui
      
      - name: Run tests
        run: npm test
        working-directory: document-upload-ui
      
      - name: Build
        run: npm run build
        working-directory: document-upload-ui
        env:
          REACT_APP_USER_POOL_ID: ${{ secrets.COGNITO_USER_POOL_ID }}
          REACT_APP_USER_POOL_CLIENT_ID: ${{ secrets.COGNITO_CLIENT_ID }}
          REACT_APP_AWS_REGION: us-east-1
      
      - name: Deploy to S3
        run: |
          aws s3 sync build/ s3://${{ secrets.S3_BUCKET_NAME }}/ --delete
        working-directory: document-upload-ui
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Next Steps

After deployment:

1. ✅ Test authentication with your Cognito users
2. ✅ Test file upload functionality
3. ✅ Test on different browsers and devices
4. ✅ Set up monitoring and alerts
5. ✅ Configure custom domain (optional)
6. ✅ Set up CI/CD pipeline (optional)
7. ✅ Enable CloudFront access logs
8. ✅ Review and optimize costs

## Support

For issues or questions:
- Check CloudWatch logs for errors
- Review CloudFront access logs
- Check browser console for client-side errors
- Verify Cognito configuration

Your application is now live on the public web! 🎉
