# Troubleshooting 401 Unauthorized Error

## Current Status

- ✅ Frontend deployed to CloudFront
- ✅ Backend configured with correct User Pool (`us-west-2_9KCYSeeDQ`)
- ✅ CORS configured
- ❌ Getting 401 Unauthorized on upload

## Most Likely Causes

### 1. User Missing Custom Attributes

The backend Lambda expects these custom attributes in the JWT token:
- `custom:organizationId`
- `custom:role`

**Check if your user has these attributes:**

```bash
aws cognito-idp admin-get-user \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username YOUR_USERNAME
```

**If missing, add them:**

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username YOUR_USERNAME \
  --user-attributes \
    Name=custom:organizationId,Value=your-org-id \
    Name=custom:role,Value=user
```

### 2. Token Not Being Sent

**Check in browser console:**

1. Open https://d2343hx5i26ud3.cloudfront.net
2. Sign in
3. Open Developer Tools → Console
4. Run:

```javascript
// Check if token exists
const session = await Auth.currentSession();
console.log('ID Token:', session.getIdToken().getJwtToken());

// Or check localStorage
console.log('Auth State:', localStorage.getItem('authContext'));
```

### 3. Wrong Token Type

The API expects the **ID Token**, not the Access Token.

**Verify the API client is using the ID token:**
- Check `document-upload-ui/src/services/api.ts`
- Should use `idToken` not `accessToken`

### 4. Token Expired

Tokens expire after 1 hour. Try:
1. Sign out
2. Sign in again
3. Try upload immediately

## Quick Fix Steps

### Step 1: Update Your User

```bash
# Replace YOUR_USERNAME with your actual username
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username YOUR_USERNAME \
  --user-attributes \
    Name=custom:organizationId,Value=test-org \
    Name=custom:role,Value=user
```

### Step 2: Sign Out and Back In

1. Go to https://d2343hx5i26ud3.cloudfront.net
2. Sign out completely
3. Clear browser cache (Ctrl+Shift+Delete)
4. Sign in again
5. Try upload

### Step 3: Test with curl

Get your ID token from browser console, then test:

```bash
# Get token from browser console first
TOKEN="paste-your-id-token-here"

# Test API
curl -v -X POST https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.txt",
    "fileContent": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "location": "croydon"
    }
  }'
```

**If curl works but browser doesn't:**
- Issue is in the frontend code

**If curl also returns 401:**
- Issue is with the token or user attributes

## Check AuthContext Code

The frontend should be getting the ID token like this:

```typescript
// In AuthContext.tsx
const session = await user.getSignInUserSession();
const idToken = session?.getIdToken().getJwtToken();
```

Make sure it's using `getIdToken()` not `getAccessToken()`.

## Alternative: Create New Test User

If all else fails, create a fresh test user with all required attributes:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username testuser@example.com \
  --user-attributes \
    Name=email,Value=testuser@example.com \
    Name=email_verified,Value=true \
    Name=custom:organizationId,Value=test-org \
    Name=custom:role,Value=user \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-west-2_9KCYSeeDQ \
  --username testuser@example.com \
  --password YourPassword123! \
  --permanent
```

Then sign in with:
- Username: `testuser@example.com`
- Password: `YourPassword123!`

## Summary

The most common cause is **missing custom attributes** on the user. Run the update command above and try again!
