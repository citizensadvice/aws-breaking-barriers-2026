# Deployment Summary - Metadata Fields Update

## Deployment Date
January 14, 2026

## Changes Deployed

### Metadata Fields Update
- **Removed**: `title` field (not in API spec)
- **Added**: `sensitivity` field (1-5 ranking, default: 3)

### Files Updated
- Type definitions (`metadata.ts`)
- Form components (`MetadataForm.tsx`, `IndividualMetadataForm.tsx`)
- Manager components (`MetadataManager.tsx`)
- Page components (`UploadPage.tsx`)
- API service (`api.ts`)

## Deployment Details

### Build Status
✅ Build completed successfully
- Main bundle: 107.88 KB (gzipped)
- No TypeScript errors
- Only minor ESLint warnings (unused variables)

### Deployment Method
- **Script**: `deploy-cloudfront.sh`
- **Target**: AWS CloudFront + S3
- **Region**: us-west-2
- **Bucket**: document-upload-ui-prod

### CloudFront Distribution
- **Distribution ID**: E1S7BS90TLNOYV
- **URL**: https://d2343hx5i26ud3.cloudfront.net
- **Cache Invalidation**: IBSS0I07CQCMDKHLS0KXR1KVLL

### Deployment Steps Completed
1. ✅ Built production bundle with updated metadata fields
2. ✅ Uploaded files to S3 with proper cache headers
3. ✅ Updated CloudFormation stack (no changes needed)
4. ✅ Created CloudFront cache invalidation

## Application Status

### Live URL
🌐 **https://d2343hx5i26ud3.cloudfront.net**

### API Endpoint
🔗 **https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod**

### Authentication
- User Pool ID: us-west-2_9KCYSeeDQ
- Client ID: 5nltqoc258ne9girat9bo244tt
- Test User: alex@test.invalid

## New Metadata Form Fields

Users will now see:
1. **Location** (required) - Dropdown with predefined locations
2. **Category** (optional) - Dropdown with predefined categories + custom option
3. **Expiry Date** (optional) - Date picker
4. **Sensitivity Level** (optional) - Dropdown with 5 levels:
   - 1 - Low Sensitivity
   - 2 - Below Medium
   - 3 - Medium (Default)
   - 4 - Above Medium
   - 5 - High Sensitivity

## Testing Checklist

- [ ] Verify application loads at CloudFront URL
- [ ] Test login with alex@test.invalid
- [ ] Upload a document with metadata
- [ ] Verify sensitivity field appears in form
- [ ] Verify title field is removed
- [ ] Check that API receives correct metadata structure
- [ ] Test bulk metadata application
- [ ] Test individual metadata per file

## CORS Configuration

If you encounter CORS errors, ensure the API Gateway allows:
- Origin: `https://d2343hx5i26ud3.cloudfront.net`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Authorization, Content-Type

See `CORS_FIX_GUIDE.md` for detailed instructions.

## Rollback Instructions

If needed, rollback to previous version:
```bash
# Get previous version from S3
aws s3 ls s3://document-upload-ui-prod/static/js/ | grep main

# Or redeploy from git
git checkout <previous-commit>
cd document-upload-ui
npm run build
./deploy-cloudfront.sh
```

## Notes

- CloudFront cache invalidation may take 5-10 minutes to propagate globally
- Old cached content will be replaced as users access the site
- The sensitivity field defaults to 3 (Medium) if not specified
- All existing functionality remains unchanged except for the metadata fields

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check CloudWatch logs for backend errors
4. Review CORS configuration if seeing 401/403 errors
