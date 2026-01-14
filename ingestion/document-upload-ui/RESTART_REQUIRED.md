# ⚠️ Restart Required

## Environment Variable Changed

The API endpoint has been updated in `.env.development`:

**Old**: `http://localhost:3001`  
**New**: `https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod`

## Action Required

**You must restart your development server** for this change to take effect.

### Steps:

1. **Stop the current dev server**:
   - Press `Ctrl+C` in the terminal where `npm start` is running

2. **Start it again**:
   ```bash
   cd document-upload-ui
   npm start
   ```

3. **Verify the change**:
   - Open browser DevTools → Console
   - Try uploading a file
   - Check Network tab - the request should go to:
     ```
     https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod/documents
     ```

## Why Restart is Needed

React's environment variables are embedded into the JavaScript bundle at build time. Changes to `.env` files require restarting the development server to rebuild with the new values.

## Verification

After restarting, you can verify the endpoint is correct by:

1. Opening browser console
2. Running:
   ```javascript
   console.log(process.env.REACT_APP_API_ENDPOINT)
   ```
3. Should output: `https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod`

## Alternative: Set Environment Variable

Instead of editing `.env.development`, you can also set it when starting:

```bash
REACT_APP_API_ENDPOINT=https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod npm start
```

This overrides the `.env` file without modifying it.
