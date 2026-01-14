# Test Authentication

## Check What's Being Sent

Open your browser console on https://d2343hx5i26ud3.cloudfront.net and run:

```javascript
// After signing in, check the auth token
const authContext = JSON.parse(localStorage.getItem('authContext') || '{}');
console.log('Auth Token:', authContext.idToken);

// Decode the JWT to see what's inside
const token = authContext.idToken;
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Token Payload:', payload);
  console.log('Token Issuer:', payload.iss);
  console.log('Token Audience:', payload.aud);
}
```

## Expected Values

The token should have:
- **Issuer (iss):** `https://cognito-idp.us-west-2.amazonaws.com/us-west-2_9KCYSeeDQ`
- **Audience (aud):** `5nltqoc258ne9girat9bo244tt`

## If Token is Missing or Wrong

1. Sign out completely
2. Clear browser cache and localStorage
3. Sign in again
4. Try upload again

## Manual Test

You can also test the API directly with curl:

```bash
# Get your ID token from the browser console first
TOKEN="your-id-token-here"

curl -X POST https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents \
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

If this returns 401, the issue is with the Cognito authorizer configuration.
If this works, the issue is with how the frontend is sending the token.
