# User Location Setup Guide

Complete guide to setting up user locations for the Document Upload UI.

## Overview

Users in the system belong to a physical location (Croydon, Manchester, or Arun-Chichester). This location:
- Is stored in AWS Cognito as a user attribute
- Displays in the UI header when logged in
- Automatically pre-fills the location field in document metadata
- Cannot be changed by users (admin-only)

## Quick Start

### Step 1: Add Location Attribute to User Pool (One-Time)

```bash
./scripts/add-location-attribute.sh
```

This adds the `custom:location` attribute to your Cognito User Pool. Only needs to be done once.

### Step 2: Set Location for Users

```bash
# Set location for a single user
./scripts/quick-set-location.sh alex@test.invalid croydon

# Or use interactive menu for multiple users
./scripts/setup-user-location.sh
```

### Step 3: Test in UI

1. Go to https://d2343hx5i26ud3.cloudfront.net
2. Log in with the user
3. Check that location appears in header (📍 icon)
4. Upload a document and verify location field is pre-filled and disabled

## Valid Locations

- `croydon` - Croydon office
- `manchester` - Manchester office  
- `arun-chichester` - Arun-Chichester office

## Available Scripts

### 1. add-location-attribute.sh
Adds the custom:location attribute to User Pool schema.

**When to use**: First-time setup only

**Command**:
```bash
./scripts/add-location-attribute.sh
```

### 2. quick-set-location.sh
Quick command-line tool to set location for a single user.

**When to use**: Setting location for one user at a time

**Command**:
```bash
./scripts/quick-set-location.sh <username> <location>
```

**Examples**:
```bash
./scripts/quick-set-location.sh alex@test.invalid croydon
./scripts/quick-set-location.sh john.doe manchester
./scripts/quick-set-location.sh jane.smith arun-chichester
```

### 3. setup-user-location.sh
Interactive menu-driven tool with multiple options.

**When to use**: Managing multiple users, viewing current locations, bulk updates

**Command**:
```bash
./scripts/setup-user-location.sh
```

**Features**:
- List all users and their locations
- Set location for specific user (interactive)
- Get location for specific user
- Bulk update all users (with confirmation)

## Common Workflows

### Setting Up New Users

```bash
# 1. Create user in Cognito (via AWS Console or CLI)

# 2. Set their location
./scripts/quick-set-location.sh newuser@example.com manchester

# 3. User can now log in and will see their location
```

### Checking Current Locations

```bash
# Run interactive script
./scripts/setup-user-location.sh

# Select option 1 to list all users
# You'll see a table with usernames, emails, and locations
```

### Changing a User's Location

```bash
# Simply set the new location (overwrites old value)
./scripts/quick-set-location.sh user@example.com arun-chichester
```

### Setting Location for Multiple Users

```bash
# Option 1: Run quick script multiple times
./scripts/quick-set-location.sh user1@example.com croydon
./scripts/quick-set-location.sh user2@example.com croydon
./scripts/quick-set-location.sh user3@example.com manchester

# Option 2: Use interactive script
./scripts/setup-user-location.sh
# Select option 2 for each user

# Option 3: Bulk update (use with caution!)
./scripts/setup-user-location.sh
# Select option 4 to set same location for ALL users
```

## How It Works

### Backend (Cognito)
1. Custom attribute `custom:location` is added to User Pool schema
2. Attribute is set on user objects via AWS CLI
3. Attribute is mutable (can be changed by admins)
4. Attribute is returned during authentication

### Frontend (React UI)
1. AuthContext extracts location from Cognito user attributes
2. Location displays in header with 📍 icon
3. Location is passed to MetadataManager component
4. MetadataForm and IndividualMetadataForm pre-fill location field
5. Location field is disabled when pre-filled
6. Help text explains location is from account

### Document Upload
1. User uploads document
2. Metadata form includes location (pre-filled, disabled)
3. Location is sent to API with document metadata
4. Document is tagged with user's location
5. Location can be used for search/filtering

## Troubleshooting

### "Attribute does not exist in the schema"

**Problem**: The custom:location attribute hasn't been added to the User Pool.

**Solution**: Run the setup script first:
```bash
./scripts/add-location-attribute.sh
```

### "User not found"

**Problem**: Username is incorrect or user doesn't exist.

**Solution**: Check username. List all users:
```bash
./scripts/setup-user-location.sh
# Select option 1
```

### "Access Denied"

**Problem**: Your AWS credentials don't have permission to modify User Pool.

**Solution**: Ensure your IAM user/role has these permissions:
- `cognito-idp:AddCustomAttributes`
- `cognito-idp:AdminUpdateUserAttributes`
- `cognito-idp:AdminGetUser`
- `cognito-idp:ListUsers`
- `cognito-idp:DescribeUserPool`

### Location not showing in UI

**Problem**: User logged in before location was set.

**Solution**: User needs to log out and log back in. The location is fetched during authentication.

### Location field not disabled in UI

**Problem**: Location attribute is empty or not set.

**Solution**: Set the location:
```bash
./scripts/quick-set-location.sh username location
```

## Security Considerations

- Location is stored as a user attribute in Cognito
- Only admins with AWS credentials can modify locations
- Users cannot change their own location through the UI
- Location is included in all document metadata
- Consider using IAM policies to restrict who can modify user attributes

## Testing Checklist

After setting up locations:

- [ ] Run `add-location-attribute.sh` (first time only)
- [ ] Set location for test user
- [ ] Log in to UI
- [ ] Verify location appears in header
- [ ] Start document upload
- [ ] Verify location field is pre-filled
- [ ] Verify location field is disabled
- [ ] Verify help text appears
- [ ] Complete upload
- [ ] Verify document has correct location metadata

## Additional Resources

- Script documentation: `scripts/README.md`
- Feature documentation: `document-upload-ui/USER_LOCATION_FEATURE.md`
- AWS Cognito Custom Attributes: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
