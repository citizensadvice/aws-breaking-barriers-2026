# Deployment Options

Your AWS account has S3 Block Public Access enabled, which prevents public bucket policies. Here are your options:

## ✅ Option 1: CloudFront with OAC (Recommended)

This uses CloudFront Origin Access Control to serve your app securely without making the S3 bucket public.

```bash
cd document-upload-ui
./deploy-cloudfront.sh
```

**Pros:**
- ✅ Works with S3 Block Public Access
- ✅ HTTPS by default
- ✅ Global CDN (faster)
- ✅ More secure

**Cons:**
- ⏳ Takes 5-10 minutes to deploy
- 💰 Slightly higher cost (but minimal for low traffic)

**Your URL will be:** `https://d1234567890abc.cloudfront.net`

---

## Option 2: Use Existing Infrastructure

If you already have a CloudFront distribution or want to use an existing setup, manually upload the build folder:

```bash
# Upload to your existing S3 bucket
aws s3 sync build/ s3://your-existing-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

## Option 3: Request Public Access Permissions

If you need a public S3 website (not recommended for production), you'll need to:

1. Disable S3 Block Public Access on the bucket
2. Add a public bucket policy

This requires elevated AWS permissions that your current role doesn't have.

---

## 🎯 Recommended: Use Option 1

Run this command:

```bash
cd document-upload-ui
./deploy-cloudfront.sh
```

This will:
1. Upload your build to S3 (private)
2. Create a CloudFormation stack
3. Set up CloudFront with Origin Access Control
4. Give you an HTTPS URL

**After deployment:**
- Wait 5-10 minutes for CloudFront to propagate
- Configure CORS on your API Gateway with the CloudFront URL
- Test your application

---

## What's Already Done

✅ Production build created
✅ Location dropdown implemented (croydon, manchester, arun-chichester)
✅ Environment variables configured
✅ Files uploaded to S3

**Just need:** CloudFront distribution to serve the files securely
