#!/bin/bash

# CloudFront deployment script - works with S3 Block Public Access enabled
# Uses CloudFront Origin Access Control (OAC) instead of public bucket policy

set -e

echo "=========================================="
echo "Document Upload UI - CloudFront Deploy"
echo "=========================================="

# Check environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "❌ Error: AWS credentials not found in environment"
  exit 1
fi

echo "✅ AWS credentials found in environment"

# Configuration
BUCKET_NAME="document-upload-ui-prod"
AWS_REGION="${AWS_DEFAULT_REGION:-us-west-2}"
STACK_NAME="document-upload-ui-cloudfront"

# Check if build exists
if [ ! -d "build" ]; then
  echo "❌ Error: build/ directory not found"
  echo "Please run 'npm run build' first"
  exit 1
fi

echo "📦 Build folder found"
echo "🪣 Target S3 bucket: $BUCKET_NAME"

# Create bucket if it doesn't exist
echo "Creating S3 bucket (if needed)..."
aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null || echo "Bucket already exists"

# Upload files to S3 (private bucket)
echo "📤 Uploading files to S3..."

# Upload all files except index.html with long cache
aws s3 sync build/ "s3://$BUCKET_NAME/" \
  --delete \
  --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "service-worker.js" \
  --exclude "asset-manifest.json"

# Upload index.html with no-cache
aws s3 cp build/index.html "s3://$BUCKET_NAME/index.html" \
  --region "$AWS_REGION" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --metadata-directive REPLACE

echo "✅ Files uploaded to S3"

# Create CloudFormation template
echo "Creating CloudFormation template..."
cat > /tmp/cloudfront-stack.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Description: 'CloudFront distribution for Document Upload UI'

Parameters:
  BucketName:
    Type: String
    Description: S3 bucket name

Resources:
  CloudFrontOriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: !Sub '${BucketName}-OAC'
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Origins:
          - Id: S3Origin
            DomainName: !Sub '${BucketName}.s3.${AWS::Region}.amazonaws.com'
            S3OriginConfig:
              OriginAccessIdentity: ''
            OriginAccessControlId: !GetAtt CloudFrontOriginAccessControl.Id
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          ForwardedValues:
            QueryString: false
            Cookies:
              Forward: none
          MinTTL: 0
          DefaultTTL: 86400
          MaxTTL: 31536000
        CustomErrorResponses:
          - ErrorCode: 403
            ResponseCode: 200
            ResponsePagePath: /index.html
            ErrorCachingMinTTL: 300
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html
            ErrorCachingMinTTL: 300
        PriceClass: PriceClass_100
        ViewerCertificate:
          CloudFrontDefaultCertificate: true
          MinimumProtocolVersion: TLSv1.2_2021
        HttpVersion: http2

  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref BucketName
      PolicyDocument:
        Statement:
          - Sid: AllowCloudFrontServicePrincipal
            Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource: !Sub 'arn:aws:s3:::${BucketName}/*'
            Condition:
              StringEquals:
                AWS:SourceArn: !Sub 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${CloudFrontDistribution}'

Outputs:
  CloudFrontURL:
    Description: CloudFront Distribution URL
    Value: !GetAtt CloudFrontDistribution.DomainName
  DistributionId:
    Description: CloudFront Distribution ID
    Value: !Ref CloudFrontDistribution
EOF

# Deploy CloudFormation stack
echo "Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file /tmp/cloudfront-stack.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides BucketName="$BUCKET_NAME" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_IAM

# Get CloudFront URL
echo "Getting CloudFront URL..."
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$AWS_REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "🌐 Your application is live at:"
echo "   https://$CLOUDFRONT_URL"
echo ""
echo "📋 Distribution ID: $DISTRIBUTION_ID"
echo ""
echo "⏳ Note: CloudFront distribution may take 5-10 minutes to fully deploy"
echo ""
echo "📋 Next steps:"
echo "1. Wait for CloudFront to deploy (check status in AWS Console)"
echo "2. Configure CORS on API Gateway to allow: https://$CLOUDFRONT_URL"
echo "3. Test the application at the URL above"
echo "4. Sign in with: alex@test.invalid"
echo ""
echo "For CORS configuration, see: CORS_FIX_GUIDE.md"
