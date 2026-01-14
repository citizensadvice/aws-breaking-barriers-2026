# User Location Setup Scripts

Scripts to configure user location attributes in AWS Cognito for the Document Upload UI.

## Prerequisites

- AWS CLI installed and configured
- Appropriate IAM permissions for Cognito User Pool operations
- User Pool ID: `us-west-2_9KCYSeeDQ`

## First-Time Setup

**IMPORTANT**: Before setting user locations, you must add the custom attribute to the User Pool (only needs to be done once):

```bash
./scripts/add-location-attribute.sh
```

This adds the `custom:location` attribute to the User Pool schema.

## Valid Locations

- `croydon`
- `manchester`
- `arun-chichester`

## Scripts

### 0. Add Location Attribute (First-Time Setup)

**File**: `add-location-attribute.sh`

**MUST BE RUN FIRST** - Adds the `custom:location` attribute to the User Pool schema.

**Usage**:
```bash
./scripts/add-location-attribute.sh
```

This only needs to be run once per User Pool. The script will check if the attribute already exists and skip if it does.

### 1. Quick Set Location (Recommended for single users)

**File**: `quick-set-location.sh`

Set location for a single user quickly.

**Usage**:
```bash
./scripts/quick-set-location.sh <username> <location>
```

**Examples**:
```bash
# Set location for alex@test.invalid
./scripts/quick-set-location.sh alex@test.invalid croydon

# Set location for another user
./scripts/quick-set-location.sh john.doe manchester
```

### 2. Interactive Setup (Full-featured)

**File**: `setup-user-location.sh`

Interactive menu-driven script with multiple options.

**Usage**:
```bash
./scripts/setup-user-location.sh
```

**Features**:
1. **List all users** - View all users and their current locations
2. **Set location for specific user** - Interactive prompts to set location
3. **Get user location** - Check current location for a user
4. **Bulk update** - Set location for ALL users at once
5. **Exit**

**Example Session**:
```
What would you like to do?
1) List all users and their locations
2) Set location for a specific user
3) Get location for a specific user
4) Set location for ALL users (bulk update)
5) Exit

Enter your choice (1-5): 1

Users in pool:
----------------------------------------
USERNAME                       EMAIL                               LOCATION
----------------------------------------
alex@test.invalid             alex@test.invalid                   croydon
john.doe                      john.doe@example.com                (not set)
----------------------------------------
```

## Environment Variables

You can override the default configuration:

```bash
# Set custom user pool ID
export USER_POOL_ID=your-pool-id

# Set custom region
export AWS_REGION=us-east-1

# Then run the script
./scripts/quick-set-location.sh username location
```

## Common Tasks

### Set location for test user
```bash
./scripts/quick-set-location.sh alex@test.invalid croydon
```

### Check all users and their locations
```bash
./scripts/setup-user-location.sh
# Then select option 1
```

### Set location for multiple users
```bash
# Option 1: Run quick script multiple times
./scripts/quick-set-location.sh user1@example.com croydon
./scripts/quick-set-location.sh user2@example.com manchester
./scripts/quick-set-location.sh user3@example.com arun-chichester

# Option 2: Use interactive script with bulk update
./scripts/setup-user-location.sh
# Then select option 4 (use with caution!)
```

## Troubleshooting

### "AWS CLI is not installed"
Install AWS CLI: https://aws.amazon.com/cli/

### "AWS credentials not configured"
Run `aws configure` and enter your credentials.

### "User not found"
Check that the username is correct. Use the interactive script's "List all users" option to see available users.

### "Invalid location"
Only these locations are valid:
- croydon
- manchester
- arun-chichester

### "Access Denied"
Ensure your IAM user/role has these permissions:
- `cognito-idp:AdminUpdateUserAttributes`
- `cognito-idp:AdminGetUser`
- `cognito-idp:ListUsers`

## How It Works

1. Scripts use AWS CLI to call Cognito API
2. Location is stored as `custom:location` attribute on user
3. UI reads this attribute during authentication
4. Location is displayed in header and pre-fills metadata forms
5. Users cannot change their location in the UI

## Testing

After setting a location:

1. Log in to the application: https://d2343hx5i26ud3.cloudfront.net
2. Check that location appears in header (📍 icon)
3. Start uploading a document
4. Verify location field is pre-filled and disabled
5. Upload should succeed with location metadata

## Security Notes

- Location attribute is mutable (can be changed by admins)
- Users cannot modify their own location through the UI
- Location is included in all document metadata
- Consider using IAM policies to restrict who can modify user attributes
