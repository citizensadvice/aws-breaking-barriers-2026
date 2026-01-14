#!/bin/bash

# Script to configure Cognito user location attribute
# This script adds the custom:location attribute to users in the Cognito User Pool

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
USER_POOL_ID="${USER_POOL_ID:-us-west-2_9KCYSeeDQ}"
AWS_REGION="${AWS_REGION:-us-west-2}"

# Valid location values
VALID_LOCATIONS=("croydon" "manchester" "arun-chichester")

echo -e "${BLUE}=========================================="
echo "Cognito User Location Setup"
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

# Function to validate location
validate_location() {
    local location=$1
    for valid in "${VALID_LOCATIONS[@]}"; do
        if [ "$location" = "$valid" ]; then
            return 0
        fi
    done
    return 1
}

# Function to set user location
set_user_location() {
    local username=$1
    local location=$2
    
    echo -e "${BLUE}Setting location for user: ${username}${NC}"
    
    if ! validate_location "$location"; then
        echo -e "${RED}❌ Invalid location: ${location}${NC}"
        echo -e "Valid locations: ${VALID_LOCATIONS[*]}"
        return 1
    fi
    
    # Set the custom:location attribute
    if aws cognito-idp admin-update-user-attributes \
        --user-pool-id "$USER_POOL_ID" \
        --username "$username" \
        --user-attributes Name=custom:location,Value="$location" \
        --region "$AWS_REGION" 2>&1; then
        echo -e "${GREEN}✅ Location set to '${location}' for user '${username}'${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to set location for user '${username}'${NC}"
        return 1
    fi
}

# Function to get user's current location
get_user_location() {
    local username=$1
    
    echo -e "${BLUE}Getting location for user: ${username}${NC}"
    
    local user_info=$(aws cognito-idp admin-get-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$username" \
        --region "$AWS_REGION" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ User not found: ${username}${NC}"
        return 1
    fi
    
    local location=$(echo "$user_info" | grep -A 1 '"Name": "custom:location"' | grep "Value" | cut -d'"' -f4)
    
    if [ -z "$location" ]; then
        echo -e "${YELLOW}⚠️  No location set for user '${username}'${NC}"
    else
        echo -e "${GREEN}📍 Current location: ${location}${NC}"
    fi
}

# Function to list all users
list_users() {
    echo -e "${BLUE}Listing all users in pool...${NC}"
    
    local users=$(aws cognito-idp list-users \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" \
        --query 'Users[*].[Username,Attributes[?Name==`email`].Value|[0],Attributes[?Name==`custom:location`].Value|[0]]' \
        --output text)
    
    if [ -z "$users" ]; then
        echo -e "${YELLOW}⚠️  No users found in pool${NC}"
        return
    fi
    
    echo ""
    echo -e "${GREEN}Users in pool:${NC}"
    echo "----------------------------------------"
    printf "%-30s %-35s %-20s\n" "USERNAME" "EMAIL" "LOCATION"
    echo "----------------------------------------"
    
    while IFS=$'\t' read -r username email location; do
        if [ -z "$location" ] || [ "$location" = "None" ]; then
            location="${YELLOW}(not set)${NC}"
        else
            location="${GREEN}${location}${NC}"
        fi
        printf "%-30s %-35s %-20b\n" "$username" "$email" "$location"
    done <<< "$users"
    
    echo "----------------------------------------"
    echo ""
}

# Function to set location for all users
set_all_users_location() {
    local location=$1
    
    if ! validate_location "$location"; then
        echo -e "${RED}❌ Invalid location: ${location}${NC}"
        echo -e "Valid locations: ${VALID_LOCATIONS[*]}"
        return 1
    fi
    
    echo -e "${YELLOW}⚠️  This will set location '${location}' for ALL users${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        return 0
    fi
    
    local usernames=$(aws cognito-idp list-users \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" \
        --query 'Users[*].Username' \
        --output text)
    
    local success_count=0
    local fail_count=0
    
    for username in $usernames; do
        if set_user_location "$username" "$location"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
    done
    
    echo ""
    echo -e "${GREEN}✅ Successfully updated: ${success_count} users${NC}"
    if [ $fail_count -gt 0 ]; then
        echo -e "${RED}❌ Failed to update: ${fail_count} users${NC}"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo -e "${BLUE}What would you like to do?${NC}"
    echo "1) List all users and their locations"
    echo "2) Set location for a specific user"
    echo "3) Get location for a specific user"
    echo "4) Set location for ALL users (bulk update)"
    echo "5) Exit"
    echo ""
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            list_users
            ;;
        2)
            echo ""
            read -p "Enter username: " username
            echo -e "Valid locations: ${GREEN}${VALID_LOCATIONS[*]}${NC}"
            read -p "Enter location: " location
            set_user_location "$username" "$location"
            ;;
        3)
            echo ""
            read -p "Enter username: " username
            get_user_location "$username"
            ;;
        4)
            echo ""
            echo -e "Valid locations: ${GREEN}${VALID_LOCATIONS[*]}${NC}"
            read -p "Enter location to set for ALL users: " location
            set_all_users_location "$location"
            ;;
        5)
            echo -e "${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please enter 1-5.${NC}"
            ;;
    esac
done
