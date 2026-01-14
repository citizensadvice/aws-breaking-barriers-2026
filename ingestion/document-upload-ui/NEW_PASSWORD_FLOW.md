# New Password Required Flow

## The Issue

Your Cognito user has a status that requires a password change before full authentication. This is indicated by the `NEW_PASSWORD_REQUIRED` challenge in the API response.

This commonly happens when:
- A user is created with a temporary password
- An admin creates a user and sets "User must change password at next sign-in"
- Password reset flow requires a new password

## The Solution

The application now handles the `NEW_PASSWORD_REQUIRED` challenge automatically.

### How It Works

1. **User enters credentials** on the login page
2. **Cognito returns NEW_PASSWORD_REQUIRED challenge**
3. **UI automatically switches** to "Set New Password" form
4. **User enters new password** (must be at least 8 characters)
5. **User confirms password** (must match)
6. **Password is set** via `confirmSignIn()`
7. **User is authenticated** and redirected to upload page

### User Experience

**Step 1: Login Page**
```
┌─────────────────────────────┐
│  Document Upload System     │
│  Sign In                    │
│                             │
│  Email or Username:         │
│  [________________]         │
│                             │
│  Password:                  │
│  [________________]         │
│                             │
│  [    Sign In    ]          │
└─────────────────────────────┘
```

**Step 2: New Password Required (automatic)**
```
┌─────────────────────────────┐
│  Document Upload System     │
│  Set New Password           │
│                             │
│  You need to set a new      │
│  password before continuing.│
│                             │
│  New Password:              │
│  [________________]         │
│  At least 8 characters      │
│                             │
│  Confirm Password:          │
│  [________________]         │
│  Re-enter password          │
│                             │
│  [ Set New Password ]       │
└─────────────────────────────┘
```

**Step 3: Authenticated & Redirected**
```
→ Redirects to /upload page
```

## Testing the Flow

### 1. Start the Application

```bash
cd document-upload-ui
npm start
```

### 2. Navigate to Login

Go to `http://localhost:3000` - you'll be redirected to `/login`

### 3. Enter Your Credentials

- Username/Email: Your Cognito user email
- Password: Your current (temporary) password

### 4. Watch Console Logs

You should see:

```
Sign in result: { isSignedIn: false, nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' } }
New password required for user
```

### 5. Set New Password

The UI will automatically show the "Set New Password" form:
- Enter a new password (at least 8 characters)
- Confirm the password
- Click "Set New Password"

### 6. Success!

After setting the password, you should see:

```
Completing new password challenge...
New password result: { isSignedIn: true }
Password changed and signed in successfully
Auth check - User: { username: "...", ... }
Setting authenticated user: ...
User authenticated, navigating to: /upload
```

Then you'll be redirected to the upload page.

## Password Requirements

The new password must:
- Be at least 8 characters long
- Match the confirmation field
- Meet any additional Cognito User Pool password policy requirements (uppercase, lowercase, numbers, special characters, etc.)

## Troubleshooting

### "Passwords do not match"

**Cause**: The new password and confirm password fields don't match

**Solution**: Ensure both fields have the exact same value

### "Password must be at least 8 characters long"

**Cause**: Password is too short

**Solution**: Enter a password with 8 or more characters

### Password change fails with Cognito error

**Cause**: Password doesn't meet Cognito User Pool password policy

**Solution**: Check your Cognito User Pool password policy settings and ensure your password meets all requirements (e.g., uppercase, lowercase, numbers, special characters)

### Still shows login form after setting password

**Cause**: Password change succeeded but authentication didn't complete

**Solution**: 
1. Check browser console for errors
2. Try logging in again with your new password
3. Clear browser cache and cookies

## After First Login

Once you've successfully set your new password:
- Future logins will use the normal login flow (no password change required)
- You can log in with your email/username and the new password you set
- The "Set New Password" form will only appear if Cognito requires another password change

## For Administrators

If you want to avoid the password change flow for test users, you can set a permanent password using AWS CLI:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_POOL_ID \
  --username YOUR_USERNAME \
  --password YOUR_PASSWORD \
  --permanent
```

This sets the password as permanent, so users won't be prompted to change it on first login.

## Technical Details

### Auth Context Changes

- Added `requiresNewPassword` state to track if password change is needed
- Added `completeNewPassword()` function to handle the challenge
- Modified `login()` to detect `CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED` step

### Login Page Changes

- Added new password form fields (newPassword, confirmPassword)
- Conditional rendering: shows password change form when `requiresNewPassword` is true
- Password validation before submission
- Automatic transition between login and password change forms

### API Flow

```
signIn(username, password)
    ↓
Cognito returns: { nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' } }
    ↓
UI shows "Set New Password" form
    ↓
User enters new password
    ↓
confirmSignIn({ challengeResponse: newPassword })
    ↓
Cognito returns: { isSignedIn: true }
    ↓
checkAuthState() retrieves user & session
    ↓
Navigate to /upload
```

## Next Steps

After successfully logging in with your new password:
1. Test the file upload functionality
2. Test metadata forms
3. Test file validation
4. Test progress tracking

Your authentication is now fully set up and working!
