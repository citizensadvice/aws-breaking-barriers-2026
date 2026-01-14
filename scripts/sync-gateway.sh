#!/bin/bash
# Synchronize gateway targets after MCP deployment
set -e

# Set default region if not set
export AWS_REGION=${AWS_REGION:-us-west-2}
DEPLOYMENT_ID=$(node -p "require('./deployment-config.json').deploymentId")

echo "🔄 Synchronizing gateway targets for deployment: $DEPLOYMENT_ID"

# Get gateway ID dynamically based on deployment ID
GATEWAY_ID=$(aws bedrock-agentcore-control list-gateways \
  --query "items[?contains(name, 'agentstack-${DEPLOYMENT_ID}')].gatewayId | [0]" \
  --output text)

if [ -z "$GATEWAY_ID" ] || [ "$GATEWAY_ID" == "None" ]; then
  echo "❌ No gateway found for deployment: $DEPLOYMENT_ID"
  exit 1
fi

echo "Found gateway: $GATEWAY_ID"

# Get all target IDs
TARGET_IDS=$(aws bedrock-agentcore-control list-gateway-targets \
  --gateway-identifier "$GATEWAY_ID" \
  --query 'items[].targetId' \
  --output text)

echo "Found targets: $TARGET_IDS"

# Gateway targets are automatically synced on deployment
# Just verify they exist
if [ -n "$TARGET_IDS" ]; then
  echo "✅ Gateway configured with targets: $TARGET_IDS"
  echo "✅ Targets will sync automatically"
else
  echo "⚠️ No targets found for gateway"
fi

exit 0
