# Login Testing Guide

## Latest Fix (v3 - Retry Logic)

The authentication flow now includes retry logic to handle the delay between sign-in completion and session establishment.

## Changes Made

1. **AuthContext.tsx**: 
   - Initial 2-second wait after sign-in for session establishment
   - Retry logic: attempts to get current user up to 5 times with 500ms delays
   - Better error messages and logging
   - Handles the timing gap between SRP flow completion and session availability

2. **LoginPage.tsx**: 
   - Uses `useEffect` to watch `isAuthenticated` state
   - Automatic navigation when authentication succeeds

## How It Works Now

1. User submits login form
2. `signIn()` is called - SRP flow completes in background
3. Wait 2 seconds for initial session establishment
4. Retry up to 5 times (with 500ms delays) to get current user
5. Once user is retrieved, `checkAuthState()` gets full session
6. Auth state updates to `isAuthenticated: true`
7. `useEffect` in LoginPage navigates to `/upload`

## Why The Retries?

The AWS Cognito SRP (Secure Remote Password) authentication flow completes asynchronously. The `signIn()` function returns before the session is fully established in the browser. The retry logic ensures we wait for the session to be available before proceeding.

## Testing the Login

### 1. Start the Development Server

```bash
cd document-upload-ui
npm start
```

### 2. Open Browser Console

Open your browser's developer console (F12) to see authentication logs.

### 3. Navigate to Login

Go to `http://localhost:3000` - you should be redirected to `/login`

### 4. Enter Credentials

Enter your AWS Cognito user credentials:
- Username/Email: Your Cognito user email or username
- Password: Your Cognito user password

### 5. Watch Console Logs

After clicking "Sign In", you should see console logs like:

```
Sign in result: { isSignedIn: false, nextStep: { signInStep: 'DONE' } }
Is signed in: false
Waiting for session establishment...
Attempt 1 to get current user...
User retrieved successfully: 08e13330-f001-70e6-892d-6e9daeac64b0
Auth check - User: { username: "08e13330-f001-70e6-892d-6e9daeac64b0", ... }
Auth check - Session tokens present: true
Setting authenticated user: 08e13330-f001-70e6-892d-6e9daeac64b0
User authenticated, navigating to: /upload
```

**Key things to look for:**
- `Is signed in: false` - normal for SRP flow
- `Waiting for session establishment...` - initial 2-second wait
- `Attempt X to get current user...` - retry attempts (should succeed on attempt 1-3)
- `User retrieved successfully:` - session is now available
- `Setting authenticated user:` - auth state is being updated
- `User authenticated, navigating to:` - navigation is triggered

**If you see multiple retry attempts:**
- This is normal - the session takes time to establish
- Up to 5 attempts will be made
- Each attempt waits 500ms
- If all 5 attempts fail, you'll see an error

### 6. Successful Login

If authentication succeeds:
- You should be redirected to `/upload` page
- The upload interface should be visible
- Your user information should be displayed (if implemented in the UI)

## Troubleshooting

### Login Stays on Same Page

**Symptoms**: After entering credentials, the page doesn't redirect

**Check**:
1. Open browser console - look for error messages
2. Check if you see "Auth check - User: undefined" - this means authentication failed
3. Verify your Cognito credentials are correct
4. Check `.env.development` has correct Cognito configuration

### Error: "Authentication failed - user not found after sign in"

**Cause**: The sign-in completed but user session wasn't established

**Solutions**:
1. Check Cognito User Pool settings - ensure user is confirmed
2. Verify user is not in "FORCE_CHANGE_PASSWORD" status
3. Check if MFA is required but not configured

### Console Shows "Auth check error"

**Cause**: Session or user retrieval failed

**Solutions**:
1. Clear browser cache and cookies
2. Check network tab for failed API calls to Cognito
3. Verify Cognito User Pool ID and Client ID are correct
4. Ensure user exists in the Cognito User Pool

### User Needs to Change Password

If your Cognito user is in "FORCE_CHANGE_PASSWORD" status:

1. The current implementation doesn't handle password change flow
2. You can either:
   - Reset the user password in AWS Console and set it to permanent
   - Or implement the password change challenge handler

To set permanent password in AWS CLI:
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_POOL_ID \
  --username YOUR_USERNAME \
  --password YOUR_NEW_PASSWORD \
  --permanent
```

## Expected Console Output (Success)

```
Sign in result: { isSignedIn: false, nextStep: { signInStep: 'DONE' } }
Auth check - User: { username: "08e13330-f001-70e6-892d-6e9daeac64b0", ... }
Auth check - Session tokens present: true
Setting authenticated user: 08e13330-f001-70e6-892d-6e9daeac64b0
```

Then navigation to `/upload` should occur.

## Expected Console Output (Failure)

```
Sign in result: { isSignedIn: false, ... }
Auth check - User: undefined
Auth check error: Error: ...
Login failed: Error: Authentication failed - user not found after sign in
```

## Next Steps After Successful Login

Once you can successfully log in and reach the upload page:
1. Test file upload functionality
2. Test metadata forms
3. Test file validation
4. Test progress tracking

## Additional Notes

- The SRP authentication flow is handled automatically by AWS Amplify
- The `PASSWORD_VERIFIER` challenge you saw is part of the normal SRP flow
- The authentication should complete successfully even though `isSignedIn` may initially be `false`
- Console logs will help you understand what's happening during the authentication process
