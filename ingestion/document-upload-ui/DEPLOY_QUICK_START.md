# Quick Start: Deploy to Public Web

## 5-Minute Deployment

### 1. Create S3 Bucket

```bash
export S3_BUCKET_NAME="my-document-upload-$(date +%s)"
export AWS_REGION="us-east-1"

aws s3 mb s3://${S3_BUCKET_NAME} --region ${AWS_REGION}
```

### 2. Create CloudFront Distribution

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name ${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com \
  --default-root-object index.html \
  --query 'Distribution.{ID:Id,Domain:DomainName}' \
  --output table

# Save the Distribution ID
export CLOUDFRONT_DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID_HERE"
```

**Note**: CloudFront distribution takes 15-20 minutes to deploy. Continue with next steps while it deploys.

### 3. Set Your Cognito Configuration

```bash
# Replace with your actual Cognito values
export COGNITO_USER_POOL_ID="us-east-1_YourPoolId"
export COGNITO_CLIENT_ID="YourClientId"
```

### 4. Deploy

```bash
cd document-upload-ui
chmod +x deploy.sh
./deploy.sh production
```

### 5. Access Your App

Your app will be available at:
```
https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net
```

Check CloudFront domain:
```bash
aws cloudfront get-distribution \
  --id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --query 'Distribution.DomainName' \
  --output text
```

## That's It!

Your application is now live on the public web! 🚀

## Next Steps

- Test login with your Cognito user
- Set up custom domain (optional)
- Configure monitoring
- Set up CI/CD (optional)

See `PUBLIC_DEPLOYMENT_GUIDE.md` for detailed instructions.
