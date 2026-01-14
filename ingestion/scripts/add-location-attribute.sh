#!/bin/bash

# Script to add custom:location attribute to Cognito User Pool
# This only needs to be run ONCE per User Pool

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
USER_POOL_ID="${USER_POOL_ID:-us-west-2_9KCYSeeDQ}"
AWS_REGION="${AWS_REGION:-us-west-2}"

echo -e "${BLUE}=========================================="
echo "Add Location Attribute to User Pool"
echo -e "==========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Please configure AWS credentials using 'aws configure'"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials found${NC}"
echo -e "📋 User Pool ID: ${USER_POOL_ID}"
echo -e "🌍 Region: ${AWS_REGION}"
echo ""

# Check if attribute already exists
echo -e "${BLUE}Checking if custom:location attribute already exists...${NC}"

POOL_INFO=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$AWS_REGION" 2>&1)

if echo "$POOL_INFO" | grep -q '"Name": "location"'; then
    echo -e "${GREEN}✅ Attribute 'custom:location' already exists in the User Pool${NC}"
    echo ""
    echo "You can now use the location setup scripts:"
    echo "  ./scripts/quick-set-location.sh <username> <location>"
    echo "  ./scripts/setup-user-location.sh"
    exit 0
fi

echo -e "${YELLOW}⚠️  Attribute does not exist. Adding it now...${NC}"
echo ""

# Add the custom attribute
echo -e "${BLUE}Adding custom:location attribute to User Pool...${NC}"

if aws cognito-idp add-custom-attributes \
    --user-pool-id "$USER_POOL_ID" \
    --custom-attributes \
        Name=location,AttributeDataType=String,Mutable=true \
    --region "$AWS_REGION" 2>&1; then
    
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✅ Success!"
    echo -e "==========================================${NC}"
    echo ""
    echo "The custom:location attribute has been added to the User Pool."
    echo ""
    echo "Next steps:"
    echo "1. Set location for users:"
    echo "   ./scripts/quick-set-location.sh alex@test.invalid croydon"
    echo ""
    echo "2. Or use the interactive menu:"
    echo "   ./scripts/setup-user-location.sh"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Failed to add attribute${NC}"
    echo ""
    echo "Possible reasons:"
    echo "- You don't have permission to modify the User Pool"
    echo "- The User Pool ID is incorrect"
    echo "- The attribute already exists with a different configuration"
    echo ""
    echo "Please check your IAM permissions and try again."
    exit 1
fi
