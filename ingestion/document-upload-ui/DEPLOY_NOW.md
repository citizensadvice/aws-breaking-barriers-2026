# Deploy Now - Simple Steps

Your production build is ready! Follow these steps:

## Step 1: Authenticate with AWS

```bash
aws sso login --profile citizensadvice
```

## Step 2: Deploy

Run one of these commands from the `document-upload-ui` directory:

### Option A: Use the automated script
```bash
./quick-deploy.sh
```

### Option B: Manual deployment (if script fails)
```bash
# Create bucket (if it doesn't exist)
aws s3 mb s3://document-upload-ui-prod --region us-west-2

# Enable website hosting
aws s3 website s3://document-upload-ui-prod \
  --index-document index.html \
  --error-document index.html

# Upload files
aws s3 sync build/ s3://document-upload-ui-prod/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://document-upload-ui-prod/index.html \
  --cache-control "no-cache, no-store, must-revalidate"

# Make bucket public
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
```

## Step 3: Get Your URL

After deployment, your app will be available at:
```
http://document-upload-ui-prod.s3-website-us-west-2.amazonaws.com
```

## Step 4: Configure CORS

Add this URL to your API Gateway CORS settings:
- Origin: `http://document-upload-ui-prod.s3-website-us-west-2.amazonaws.com`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization

See `CORS_FIX_GUIDE.md` for detailed instructions.

## What's Deployed

✅ Location dropdown with: croydon, manchester, arun-chichester
✅ Production environment configured
✅ Authentication with Cognito
✅ API integration with your backend

## Test It

1. Go to the S3 website URL
2. Sign in with: `alex@test.invalid`
3. Set a new password (first time only)
4. Upload a document with location metadata
