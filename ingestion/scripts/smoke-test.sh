#!/bin/bash

set -e

echo "🔍 Running Document Management Smoke Tests"
echo "=========================================="

# Configuration
export STACK_NAME="${STACK_NAME:-DocumentManagementStack}"
export AWS_REGION="${AWS_REGION:-us-west-2}"

echo ""
echo "Configuration:"
echo "  Stack Name: $STACK_NAME"
echo "  Region: $AWS_REGION"
echo ""

# Check if stack exists
echo "📦 Checking if stack exists..."
if ! aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text &> /dev/null; then
  echo "❌ Stack '$STACK_NAME' not found in region '$AWS_REGION'"
  exit 1
fi

STACK_STATUS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].StackStatus' \
  --output text)

echo "✅ Stack found with status: $STACK_STATUS"

if [[ "$STACK_STATUS" != "CREATE_COMPLETE" && "$STACK_STATUS" != "UPDATE_COMPLETE" ]]; then
  echo "⚠️  Warning: Stack is in $STACK_STATUS state"
fi

echo ""
echo "📦 Fetching stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs' \
  --output json)

export API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiGatewayUrl") | .OutputValue')
export USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
export CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')

if [[ -z "$API_URL" || -z "$USER_POOL_ID" || -z "$CLIENT_ID" ]]; then
  echo "❌ Failed to retrieve required stack outputs"
  exit 1
fi

echo "✅ Stack outputs retrieved:"
echo "  API URL: $API_URL"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"

# Navigate to ingestion directory
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦 Installing dependencies..."
  npm install
fi

# Run infrastructure smoke tests
echo ""
echo "🏗️  Running Infrastructure Smoke Tests..."
echo "=========================================="
npm run smoke:infra

# Run API smoke tests
echo ""
echo "🌐 Running API Smoke Tests..."
echo "=========================================="
npm run smoke:api

echo ""
echo "✅ All smoke tests passed!"
echo ""
