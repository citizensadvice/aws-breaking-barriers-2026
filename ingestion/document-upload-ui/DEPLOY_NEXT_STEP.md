# Next Step: Deploy with CloudFront

## The Issue

Your AWS account has S3 Block Public Access enabled, which prevents making buckets publicly accessible. This is a security best practice!

## The Solution

Use CloudFront with Origin Access Control (OAC) to serve your app securely.

## Run This Command

```bash
cd document-upload-ui
./deploy-cloudfront.sh
```

## What It Does

1. ✅ Uploads your build to S3 (keeps bucket private)
2. ✅ Creates CloudFront distribution with OAC
3. ✅ Configures proper S3 bucket policy for CloudFront
4. ✅ Gives you an HTTPS URL

## Timeline

- Upload: ~30 seconds
- CloudFront deployment: 5-10 minutes
- Total: ~10 minutes

## Your URL

You'll get a CloudFront URL like:
```
https://d1234567890abc.cloudfront.net
```

## After Deployment

1. **Wait** for CloudFront to finish deploying (check AWS Console)
2. **Configure CORS** on API Gateway with your CloudFront URL
3. **Test** the application
4. **Sign in** with `alex@test.invalid`

## Why CloudFront?

- ✅ Works with S3 Block Public Access
- ✅ HTTPS by default (more secure)
- ✅ Global CDN (faster for users)
- ✅ Better for production

---

**Ready?** Run: `./deploy-cloudfront.sh`
