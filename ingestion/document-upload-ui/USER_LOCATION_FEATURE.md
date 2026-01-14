# User Location Feature - Implementation Complete

## Overview
Users now have a location attribute from Cognito that is displayed in the UI and automatically pre-fills the location field in metadata forms.

## Changes Implemented

### 1. Type Definitions
- Added `location: string` field to `CognitoUser` interface in `src/types/auth.ts`

### 2. Authentication Context
- Updated `AuthContext.tsx` to extract location from Cognito user attributes
- Supports both `custom:location` and `location` attribute names
- Location is retrieved during authentication and stored in user state

### 3. UI Components

#### UploadPage
- Added `getUserLocation()` function to retrieve user's location
- Displays location in header with 📍 icon next to username/email
- Passes `userLocation` prop to MetadataManager component
- Added CSS styling for `.user-location` class

#### MetadataManager
- Accepts `userLocation` prop
- Passes location to both MetadataForm and IndividualMetadataForm components

#### MetadataForm (Bulk Metadata)
- Accepts `userLocation` prop
- Pre-fills location field when user has a location
- Disables location field when pre-filled
- Shows help text: "Location is set by your account"
- Added CSS for `.metadata-form__field-help` class

#### IndividualMetadataForm (Per-File Metadata)
- Accepts `userLocation` prop
- Pre-fills location field when user has a location
- Disables location field when pre-filled
- Shows help text: "Location is set by your account"
- Added CSS for `.individual-metadata-form__field-help` class

## Deployment

**Build**: ✅ Successful (107.91 KB gzipped)
**S3 Upload**: ✅ Complete
**CloudFront**: ✅ Deployed to https://d2343hx5i26ud3.cloudfront.net
**Cache Invalidation**: ✅ Created (ID: IF562QDIUKDC510R5WTGFUBPAI)

## Backend Configuration Required

To use this feature, you need to set location for users in Cognito.

### Quick Setup (Recommended)

Use the provided script to set location for users:

```bash
# Set location for a user
./scripts/quick-set-location.sh alex@test.invalid croydon

# Or use the interactive menu
./scripts/setup-user-location.sh
```

See `scripts/README.md` for detailed documentation.

### Manual Setup

If you prefer to use AWS CLI directly:

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username alex@test.invalid \
  --user-attributes Name=custom:location,Value=croydon \
  --region us-west-2
```

### Valid Location Values

- `croydon`
- `manchester`
- `arun-chichester`

### Notes

- The `custom:location` attribute is automatically created when first set
- No need to modify the User Pool schema
- Location is mutable and can be changed by admins at any time

## User Experience

1. User logs in with Cognito credentials
2. Location is extracted from user attributes
3. Location displays in header: "📍 croydon"
4. When uploading documents:
   - Location field is pre-filled with user's location
   - Field is disabled (cannot be changed)
   - Help text explains location is from account
5. All uploaded documents automatically tagged with user's location

## Testing

To test the feature:
1. Set `custom:location` attribute for a test user in Cognito
2. Log in to the application
3. Verify location appears in header
4. Start document upload
5. Verify location field is pre-filled and disabled in metadata forms

## Files Modified

- `src/types/auth.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/upload/UploadPage.tsx`
- `src/components/upload/UploadPage.css`
- `src/components/upload/MetadataManager.tsx`
- `src/components/upload/MetadataForm.tsx`
- `src/components/upload/MetadataForm.css`
- `src/components/upload/IndividualMetadataForm.tsx`
- `src/components/upload/IndividualMetadataForm.css`
