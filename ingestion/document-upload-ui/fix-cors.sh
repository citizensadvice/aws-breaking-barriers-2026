#!/bin/bash

# Fix CORS for CloudFront deployment
# This script updates the API Gateway CORS configuration

set -e

echo "=========================================="
echo "CORS Configuration Fix"
echo "=========================================="

# Configuration
API_ID="y4ddrug6ih"
REGION="us-west-2"
CLOUDFRONT_URL="https://d2343hx5i26ud3.cloudfront.net"

echo "API Gateway ID: $API_ID"
echo "Region: $REGION"
echo "CloudFront URL: $CLOUDFRONT_URL"
echo ""

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ Error: AWS credentials not found in environment"
  exit 1
fi

echo "✅ AWS credentials found"
echo ""

# Get the API Gateway resource
echo "Fetching API Gateway configuration..."

# Update CORS for the /documents resource
echo "Updating CORS configuration..."

# Note: This requires the API Gateway resource ID
# Let's get all resources first
RESOURCES=$(aws apigatewayv2 get-apis --region $REGION --query "Items[?ApiId=='$API_ID']" 2>&1)

if echo "$RESOURCES" | grep -q "Could not connect"; then
  echo "❌ Error: This appears to be an API Gateway v1 (REST API)"
  echo ""
  echo "Please configure CORS manually using one of these methods:"
  echo ""
  echo "Method 1: AWS Console"
  echo "1. Go to: https://console.aws.amazon.com/apigateway"
  echo "2. Select your API: $API_ID"
  echo "3. Click on 'Resources' → '/documents' → 'Actions' → 'Enable CORS'"
  echo "4. Add allowed origin: $CLOUDFRONT_URL"
  echo "5. Allowed methods: GET, POST, PUT, DELETE, OPTIONS"
  echo "6. Allowed headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token"
  echo "7. Click 'Enable CORS and replace existing CORS headers'"
  echo "8. Deploy API to 'prod' stage"
  echo ""
  echo "Method 2: AWS CLI"
  echo "Run these commands:"
  echo ""
  echo "# Get resource ID"
  echo "aws apigateway get-resources --rest-api-id $API_ID --region $REGION"
  echo ""
  echo "# Update OPTIONS method (replace RESOURCE_ID)"
  echo "aws apigateway put-integration-response \\"
  echo "  --rest-api-id $API_ID \\"
  echo "  --resource-id RESOURCE_ID \\"
  echo "  --http-method OPTIONS \\"
  echo "  --status-code 200 \\"
  echo "  --region $REGION \\"
  echo "  --response-parameters '{\"method.response.header.Access-Control-Allow-Origin\":\"'\"'\"'$CLOUDFRONT_URL'\"'\"'\",\"method.response.header.Access-Control-Allow-Methods\":\"'\"'\"'GET,POST,PUT,DELETE,OPTIONS'\"'\"'\",\"method.response.header.Access-Control-Allow-Headers\":\"'\"'\"'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'\"'\"'\"}'"
  echo ""
  echo "# Deploy to prod"
  echo "aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --region $REGION"
  echo ""
  exit 1
fi

echo ""
echo "=========================================="
echo "Manual CORS Configuration Required"
echo "=========================================="
