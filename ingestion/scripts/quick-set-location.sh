#!/bin/bash

# Quick script to set location for a user
# Usage: ./quick-set-location.sh <username> <location>
# Example: ./quick-set-location.sh alex@test.invalid croydon

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

# Valid locations
VALID_LOCATIONS=("croydon" "manchester" "arun-chichester")

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <username> <location>${NC}"
    echo ""
    echo "Valid locations: ${VALID_LOCATIONS[*]}"
    echo ""
    echo "Examples:"
    echo "  $0 alex@test.invalid croydon"
    echo "  $0 john.doe manchester"
    echo "  $0 jane.smith arun-chichester"
    exit 1
fi

USERNAME=$1
LOCATION=$2

# Validate location
valid=false
for loc in "${VALID_LOCATIONS[@]}"; do
    if [ "$LOCATION" = "$loc" ]; then
        valid=true
        break
    fi
done

if [ "$valid" = false ]; then
    echo -e "${RED}❌ Invalid location: ${LOCATION}${NC}"
    echo -e "Valid locations: ${VALID_LOCATIONS[*]}"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

# Check credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    exit 1
fi

echo -e "${BLUE}Setting location for user...${NC}"
echo -e "User: ${GREEN}${USERNAME}${NC}"
echo -e "Location: ${GREEN}${LOCATION}${NC}"
echo -e "User Pool: ${USER_POOL_ID}"
echo ""

# Set the location
if aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --user-attributes Name=custom:location,Value="$LOCATION" \
    --region "$AWS_REGION" 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Success! Location set to '${LOCATION}' for user '${USERNAME}'${NC}"
    echo ""
    echo "The user will see this location in the UI after their next login."
else
    echo ""
    echo -e "${RED}❌ Failed to set location${NC}"
    echo "Please check that the user exists and you have the correct permissions."
    exit 1
fi
