#!/bin/bash

# Quick Deployment Script for Document Upload UI
# This script deploys the pre-built application to S3 and optionally CloudFront

set -e

echo "=========================================="
echo "Document Upload UI - Quick Deploy"
echo "=========================================="

# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-document-upload-ui-prod}"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLOUDFRONT_DIST_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

# Check if build exists
if [ ! -d "build" ]; then
  echo "❌ Error: build/ directory not found"
  echo "Please run 'npm run build' first"
  exit 1
fi

echo "📦 Build folder found"
echo "🪣 Target S3 bucket: $BUCKET_NAME"
echo "🌍 AWS Region: $AWS_REGION"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
  echo "❌ Error: AWS credentials not configured"
  echo "Please run: aws sso login --profile citizensadvice"
  echo "Or configure credentials with: aws configure"
  exit 1
fi

echo "✅ AWS credentials verified"

# Check if bucket exists
if ! aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
  echo "🆕 Bucket doesn't exist. Creating..."
  aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
  
  # Enable static website hosting
  aws s3 website "s3://$BUCKET_NAME" \
    --index-document index.html \
    --error-document index.html
  
  # Make bucket public
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
  
  echo "✅ Bucket created and configured"
else
  echo "✅ Bucket exists"
fi

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

echo "✅ Files uploaded successfully"

# Get S3 website URL
S3_WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
echo ""
echo "🌐 S3 Website URL: $S3_WEBSITE_URL"

# CloudFront invalidation if distribution ID provided
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  echo "🔄 Invalidating CloudFront cache..."
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DIST_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)
  
  echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
  
  # Get CloudFront domain
  CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
    --id "$CLOUDFRONT_DIST_ID" \
    --query 'Distribution.DomainName' \
    --output text)
  
  echo "🌐 CloudFront URL: https://$CLOUDFRONT_DOMAIN"
else
  echo ""
  echo "ℹ️  No CloudFront distribution ID provided"
  echo "   Set CLOUDFRONT_DISTRIBUTION_ID environment variable to enable CloudFront deployment"
fi

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure CORS on API Gateway to allow: $S3_WEBSITE_URL"
echo "2. Test the application at the URL above"
echo "3. Sign in with: alex@test.invalid (you'll set a new password)"
echo ""
echo "For CORS configuration, see: CORS_FIX_GUIDE.md"
