#!/bin/bash

# Frontend deployment script for Citizens Advice Assistant
# This script builds the frontend, uploads to S3, and invalidates CloudFront cache

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load configuration from deploy-config.json
if [ ! -f "deploy-config.json" ]; then
    echo -e "${RED}Error: deploy-config.json not found${NC}"
    exit 1
fi

FRONTEND_BUCKET=$(cat deploy-config.json | grep -o '"frontendBucket": "[^"]*' | cut -d'"' -f4)
CLOUDFRONT_DISTRIBUTION_ID=$(cat deploy-config.json | grep -o '"cloudFrontDistributionId": "[^"]*' | cut -d'"' -f4)

if [ -z "$FRONTEND_BUCKET" ] || [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${RED}Error: Could not read configuration from deploy-config.json${NC}"
    exit 1
fi

echo -e "${GREEN}Starting frontend deployment...${NC}"

# Build the frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build

# Upload to S3
echo -e "${YELLOW}Uploading to S3 bucket: $FRONTEND_BUCKET${NC}"
aws s3 sync dist/ s3://$FRONTEND_BUCKET/ --delete

# Invalidate CloudFront cache
echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "Frontend URL: https://$(aws cloudfront get-distribution --id $CLOUDFRONT_DISTRIBUTION_ID --query 'Distribution.DomainName' --output text)"
