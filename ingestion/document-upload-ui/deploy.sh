#!/bin/bash

# Document Upload UI Deployment Script
# This script builds and deploys the React application to AWS S3 and CloudFront

set -e

# Configuration
ENVIRONMENT=${1:-production}
S3_BUCKET=${S3_BUCKET_NAME:-"document-upload-ui-${ENVIRONMENT}"}
CLOUDFRONT_DISTRIBUTION_ID=${CLOUDFRONT_DISTRIBUTION_ID:-""}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo "=========================================="
echo "Document Upload UI Deployment"
echo "Environment: $ENVIRONMENT"
echo "S3 Bucket: $S3_BUCKET"
echo "AWS Region: $AWS_REGION"
echo "=========================================="

# Step 1: Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# Step 2: Run tests
echo "Running tests..."
npm test

# Step 3: Build production bundle
echo "Building production bundle..."
npm run build

# Step 4: Upload to S3
echo "Uploading to S3..."
aws s3 sync build/ s3://${S3_BUCKET}/ \
  --delete \
  --region ${AWS_REGION} \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js" \
  --exclude "asset-manifest.json"

# Upload index.html with no-cache to ensure updates are immediate
aws s3 cp build/index.html s3://${S3_BUCKET}/index.html \
  --region ${AWS_REGION} \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

# Step 5: Invalidate CloudFront cache
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache..."
  aws cloudfront create-invalidation \
    --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
    --paths "/*"
  echo "CloudFront invalidation created"
else
  echo "No CloudFront distribution ID provided, skipping cache invalidation"
fi

echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
