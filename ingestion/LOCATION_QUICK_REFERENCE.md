# User Location - Quick Reference Card

## Valid Locations
- `croydon`
- `manchester`
- `arun-chichester`

## Common Commands

### Set location for a user
```bash
./scripts/quick-set-location.sh username@example.com croydon
```

### View all users and their locations
```bash
./scripts/setup-user-location.sh
# Then select option 1
```

### Check a specific user's location
```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username alex@test.invalid \
  --region us-west-2 \
  --query 'UserAttributes[?Name==`custom:location`].Value' \
  --output text
```

## First-Time Setup (One-Time Only)
```bash
./scripts/add-location-attribute.sh
```

## Test Application
**URL**: https://d2343hx5i26ud3.cloudfront.net
**Test User**: alex@test.invalid (location: croydon)

## What Users See
1. Location in header: "📍 croydon"
2. Location field pre-filled in metadata forms
3. Location field disabled (cannot change)
4. Help text: "Location is set by your account"

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Attribute does not exist" | Run `./scripts/add-location-attribute.sh` |
| Location not showing in UI | User needs to log out and log back in |
| "User not found" | Check username with option 1 in interactive script |
| "Access Denied" | Check IAM permissions for Cognito operations |

## Documentation
- Full setup guide: `SETUP_USER_LOCATIONS.md`
- Script docs: `scripts/README.md`
- Feature docs: `document-upload-ui/USER_LOCATION_FEATURE.md`
