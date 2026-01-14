# Fix CORS Now - Quick Guide

Your app is deployed at: **https://d2343hx5i26ud3.cloudfront.net**

The CORS error means your API Gateway needs to allow requests from this CloudFront URL.

## 🚀 Quick Fix (AWS Console - 2 minutes)

1. **Go to API Gateway Console:**
   https://us-west-2.console.aws.amazon.com/apigateway/main/apis?region=us-west-2

2. **Find your API:**
   - Look for API ID: `y4ddrug6ih`
   - Click on it

3. **Enable CORS:**
   - Click on **Resources** in left sidebar
   - Find the `/documents` resource
   - Click **Actions** → **Enable CORS**

4. **Configure CORS:**
   - **Access-Control-Allow-Origin:** `https://d2343hx5i26ud3.cloudfront.net`
   - **Access-Control-Allow-Methods:** `GET,POST,PUT,DELETE,OPTIONS`
   - **Access-Control-Allow-Headers:** `Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token`
   - Click **Enable CORS and replace existing CORS headers**

5. **Deploy API:**
   - Click **Actions** → **Deploy API**
   - Stage: **prod**
   - Click **Deploy**

6. **Test:**
   - Go back to https://d2343hx5i26ud3.cloudfront.net
   - Try uploading a document
   - Should work now!

---

## 🔧 Alternative: AWS CLI

If you prefer CLI, run these commands:

```bash
# Get the resource ID for /documents
aws apigateway get-resources \
  --rest-api-id y4ddrug6ih \
  --region us-west-2 \
  --query 'items[?path==`/documents`].id' \
  --output text

# Save the resource ID from above, then update CORS
# Replace RESOURCE_ID with the actual ID from above
RESOURCE_ID="your-resource-id-here"

# Update the OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id y4ddrug6ih \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --region us-west-2 \
  --response-parameters \
    "method.response.header.Access-Control-Allow-Origin=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Headers=true"

# Update integration response
aws apigateway put-integration-response \
  --rest-api-id y4ddrug6ih \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --region us-west-2 \
  --response-parameters \
    '{"method.response.header.Access-Control-Allow-Origin":"'"'"'https://d2343hx5i26ud3.cloudfront.net'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"'"'"}'

# Deploy to prod
aws apigateway create-deployment \
  --rest-api-id y4ddrug6ih \
  --stage-name prod \
  --region us-west-2
```

---

## 📋 What You're Configuring

**Origin:** `https://d2343hx5i26ud3.cloudfront.net`
- This tells the API to accept requests from your CloudFront distribution

**Methods:** `GET,POST,PUT,DELETE,OPTIONS`
- These are the HTTP methods your app uses

**Headers:** `Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token`
- These are the headers your app sends with requests

---

## ✅ After CORS is Fixed

Your app will be fully functional:
- ✅ Authentication works
- ✅ File uploads work
- ✅ Location dropdown (croydon, manchester, arun-chichester)
- ✅ Metadata submission works

---

## 🎯 Summary

1. **Your app:** https://d2343hx5i26ud3.cloudfront.net
2. **Your API:** https://y4ddrug6ih.execute-api.us-west-2.amazonaws.com/prod
3. **Fix needed:** Enable CORS on API Gateway
4. **Time:** 2 minutes via AWS Console

**Recommended:** Use the AWS Console method above - it's the quickest!
