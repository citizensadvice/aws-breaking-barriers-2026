#!/bin/bash

# Deployment script that uses environment variables
# Run this from your terminal where AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, 
# AWS_SESSION_TOKEN, and AWS_DEFAULT_REGION are set

set -e

echo "=========================================="
echo "Document Upload UI - Deploy with ENV vars"
echo "=========================================="

# Check environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ Error: AWS credentials not found in environment"
  echo "Please ensure these are set:"
  echo "  - AWS_ACCESS_KEY_ID"
  echo "  - AWS_SECRET_ACCESS_KEY"
  echo "  - AWS_SESSION_TOKEN (if using temporary credentials)"
  echo "  - AWS_DEFAULT_REGION"
  exit 1
fi

echo "✅ AWS credentials found in environment"
echo "Region: ${AWS_DEFAULT_REGION:-us-west-2}"

# Configuration
BUCKET_NAME="document-upload-ui-prod"
AWS_REGION="${AWS_DEFAULT_REGION:-us-west-2}"

# Check if build exists
if [ ! -d "build" ]; then
  echo "❌ Error: build/ directory not found"
  echo "Please run 'npm run build' first"
  exit 1
fi

echo "📦 Build folder found"
echo "🪣 Target S3 bucket: $BUCKET_NAME"

# Create bucket if it doesn't exist
echo "Creating S3 bucket (if needed)..."
aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null || echo "Bucket already exists"

# Enable static website hosting
echo "Configuring static website hosting..."
aws s3 website "s3://$BUCKET_NAME" \
  --index-document index.html \
  --error-document index.html

# Upload files
echo "📤 Uploading files to S3..."

# Upload all files except index.html with long cache
aws s3 sync build/ "s3://$BUCKET_NAME/" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js" \
  --exclude "asset-manifest.json"

# Upload index.html with no-cache
aws s3 cp build/index.html "s3://$BUCKET_NAME/index.html" \
  --region "$AWS_REGION" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

# Make bucket public
echo "Making bucket public..."
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
  }]
}"

echo "✅ Files uploaded successfully"

# Get S3 website URL
S3_WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "🌐 Your application is live at:"
echo "   $S3_WEBSITE_URL"
echo ""
echo "📋 Next steps:"
echo "1. Configure CORS on API Gateway to allow: $S3_WEBSITE_URL"
echo "2. Test the application at the URL above"
echo "3. Sign in with: alex@test.invalid"
echo ""
echo "For CORS configuration, see: CORS_FIX_GUIDE.md"
