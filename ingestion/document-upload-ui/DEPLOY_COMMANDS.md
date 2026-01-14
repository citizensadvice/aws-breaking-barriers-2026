# Deploy Commands - Copy & Paste

Since you have AWS credentials in your terminal environment variables, run these commands directly from your terminal:

## Quick Deploy (Recommended)

```bash
cd document-upload-ui
./deploy-with-env-vars.sh
```

## Manual Deploy (If script doesn't work)

Copy and paste these commands one by one:

```bash
# Navigate to the project
cd document-upload-ui

# Set variables
BUCKET_NAME="document-upload-ui-prod"
AWS_REGION="${AWS_DEFAULT_REGION:-us-west-2}"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region $AWS_REGION

# Enable website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html

# Upload files (except index.html)
aws s3 sync build/ s3://$BUCKET_NAME/ \
  --delete \
  --region $AWS_REGION \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# Upload index.html with no-cache
aws s3 cp build/index.html s3://$BUCKET_NAME/index.html \
  --region $AWS_REGION \
  --cache-control "no-cache, no-store, must-revalidate"

# Make bucket public
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::document-upload-ui-prod/*"
  }]
}'

# Get your URL
echo "Your app is live at: http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
```

## Your Application URL

After deployment, your app will be at:
```
http://document-upload-ui-prod.s3-website-us-west-2.amazonaws.com
```

(Or replace `us-west-2` with your `$AWS_DEFAULT_REGION` value)

## Next: Configure CORS

Add this URL to your API Gateway CORS settings:
- Origin: `http://document-upload-ui-prod.s3-website-us-west-2.amazonaws.com`
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization

See `CORS_FIX_GUIDE.md` for instructions.

## Test Your Deployment

1. Open the S3 website URL in your browser
2. Sign in with: `alex@test.invalid`
3. Set a new password (first time only)
4. Upload a document
5. Select location: croydon, manchester, or arun-chichester
6. Verify upload works

---

**Note:** The deployment script (`deploy-with-env-vars.sh`) will use your environment variables automatically. Just run it from your terminal where the AWS variables are set.
