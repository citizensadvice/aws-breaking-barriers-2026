# Deployment Instructions for Document Upload UI

## Current Status

✅ **Production build completed successfully!**
- Build location: `document-upload-ui/build/`
- Environment variables configured for production
- Location dropdown implemented with: croydon, manchester, arun-chichester

## Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended)

You'll need to authenticate with AWS first:

```bash
# Authenticate with AWS SSO
aws sso login --profile citizensadvice

# Or configure AWS credentials
aws configure
```

Then create the infrastructure:

```bash
# 1. Create S3 bucket
aws s3 mb s3://document-upload-ui-prod --region us-west-2

# 2. Enable static website hosting
aws s3 website s3://document-upload-ui-prod \
  --index-document index.html \
  --error-document index.html

# 3. Upload the build
cd document-upload-ui
aws s3 sync build/ s3://document-upload-ui-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html separately with no-cache
aws s3 cp build/index.html s3://document-upload-ui-prod/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# 4. Make bucket public (for website hosting)
aws s3api put-bucket-policy --bucket document-upload-ui-prod --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::document-upload-ui-prod/*"
  }]
}'

# 5. Create CloudFront distribution (optional but recommended)
aws cloudfront create-distribution \
  --origin-domain-name document-upload-ui-prod.s3-website-us-west-2.amazonaws.com \
  --default-root-object index.html
```

After CloudFront creation, you'll get a distribution URL like:
`https://d1234567890abc.cloudfront.net`

### Option 2: Quick S3 Website (No CloudFront)

If you just want a quick deployment without CloudFront:

```bash
# After steps 1-4 above, your website will be available at:
http://document-upload-ui-prod.s3-website-us-west-2.amazonaws.com
```

### Option 3: Use Existing Infrastructure

If you already have S3 bucket and CloudFront distribution:

```bash
# Set environment variables
export S3_BUCKET_NAME="your-existing-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="your-distribution-id"

# Run the deployment script
cd document-upload-ui
chmod +x deploy.sh
./deploy.sh production
```

## CORS Configuration Required

⚠️ **Important**: The backend API needs CORS configuration to allow requests from your CloudFront/S3 domain.

Add your deployment URL to the API Gateway CORS settings:
- Origin: `https://your-cloudfront-domain.cloudfront.net` or `http://your-bucket.s3-website-us-west-2.amazonaws.com`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token

See `CORS_FIX_GUIDE.md` for detailed instructions.

## Testing After Deployment

1. Navigate to your CloudFront URL
2. Sign in with credentials:
   - Username: `alex@test.invalid`
   - You'll be prompted to set a new password on first login
3. Test file upload with the location dropdown
4. Verify files are uploaded to the backend API

## Configuration Summary

**Production Environment:**
- User Pool ID: `us-west-2_9KCYSeeDQ`
- Client ID: `5nltqoc258ne9girat9bo244tt`
- Region: `us-west-2`
- API Endpoint: `https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod`

**Location Options:**
- croydon
- manchester
- arun-chichester

## Next Steps

1. Authenticate with AWS
2. Choose a deployment option above
3. Deploy the build folder
4. Configure CORS on the backend
5. Test the application
6. Share the CloudFront URL with users

## Troubleshooting

**AWS SSO Token Error:**
```bash
aws sso login --profile citizensadvice
```

**CORS Errors:**
- See `CORS_FIX_GUIDE.md`
- Ensure your deployment domain is added to API Gateway CORS settings

**Authentication Issues:**
- First-time users need to set a new password
- See `NEW_PASSWORD_FLOW.md` for details
