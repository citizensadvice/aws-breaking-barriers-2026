# Metadata Fields Update - API Alignment

## Summary

Updated the UI components to match the metadata fields defined in the OpenAPI specification (`docs/openapi.yaml`).

## Changes Made

### Removed Field
- **`title`** - This field was present in the UI but not defined in the API spec

### Added Field
- **`sensitivity`** - Integer field (1-5) for document sensitivity ranking
  - 1 = Low sensitivity
  - 2 = Below medium
  - 3 = Medium (default)
  - 4 = Above medium
  - 5 = High sensitivity

## Files Modified

### 1. Type Definitions
- **`document-upload-ui/src/types/metadata.ts`**
  - Removed `title?: string` from `DocumentMetadata` interface
  - Updated `sensitivity` field comment to include default value
  - Added validation for sensitivity range (1-5)

### 2. Form Components
- **`document-upload-ui/src/components/upload/MetadataForm.tsx`**
  - Removed title input field
  - Added sensitivity dropdown with 5 levels
  - Updated default metadata to include `sensitivity: 3`
  - Added help icon with explanation for sensitivity field

- **`document-upload-ui/src/components/upload/IndividualMetadataForm.tsx`**
  - Removed title input field
  - Added sensitivity dropdown with 5 levels
  - Updated default metadata to include `sensitivity: 3`
  - Removed automatic title generation from filename

### 3. Manager Components
- **`document-upload-ui/src/components/upload/MetadataManager.tsx`**
  - Updated bulk metadata initialization to use `sensitivity: 3`
  - Updated individual metadata initialization to use `sensitivity: 3`
  - Removed title field from metadata initialization

### 4. Page Components
- **`document-upload-ui/src/components/upload/UploadPage.tsx`**
  - Updated metadata state initialization to use `sensitivity: 3`
  - Removed title field from Google Docs metadata
  - Updated metadata reset to include `sensitivity: 3`

### 5. API Service
- **`document-upload-ui/src/services/api.ts`**
  - Updated `uploadFile` method to send `sensitivity` instead of `title`
  - Updated `uploadGoogleDoc` method to send `sensitivity` instead of `title`
  - Updated `resumeFileUpload` method to send `sensitivity` instead of `title`

## API Compliance

The UI now sends metadata that exactly matches the OpenAPI spec:

```typescript
{
  location: string;        // Required
  category?: string;       // Optional
  expiryDate?: string;     // Optional (ISO 8601 date format)
  sensitivity?: number;    // Optional (1-5, default: 3)
}
```

## Testing

Build completed successfully with no TypeScript errors:
```bash
npm run build --prefix document-upload-ui
```

## Next Steps

1. Test the updated forms in the browser
2. Verify that uploads send the correct metadata structure to the API
3. Update any documentation that referenced the `title` field
4. Consider updating the spec documents if they still reference the `title` field
