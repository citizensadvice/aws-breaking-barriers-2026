# AWS Breaking Barriers 2026

Multi-agent system for UK Citizens Advice using AWS Bedrock AgentCore, Knowledge Bases, and OpenSearch Serverless.

## Architecture

- **Parser Agent**: Coordinates requests and routes to specialized agents
- **National Agent**: Handles GOV.UK API queries for national advice
- **Local Agent**: Uses Bedrock Knowledge Bases for local council information
- **Infrastructure**: Two-stack CDK deployment with OpenSearch Serverless

## Quick Start

### Prerequisites
- Python 3.13+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager
- AWS CLI configured with appropriate permissions
- Node.js (for CDK)

### Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd aws-breaking-barriers-2026
   ```

2. **Install Dependencies**
   ```bash
   # Infrastructure dependencies
   cd infrastructure
   uv sync
   
   # Agent dependencies
   cd ../agents/caddy
   uv sync
   
   # Frontend dependencies
   cd ../../frontend
   npm install
   ```

3. **Deploy Infrastructure**
   ```bash
   cd ../infrastructure
   
   # Synthesize to check for errors
   uv run cdk synth
   
   # Deploy all three stacks
   uv run cdk deploy --all
   ```
   This deploys:
   - **OpenSearchStack**: Collections, indexes, IAM roles (deploys first)
   - **KnowledgeBaseStack**: S3 buckets, Knowledge Bases, data sources
   - **AgentStack**: AgentCore runtime with environment variables

4. **Upload Documents**
   - Upload national documents to `NationalDataBucket`
   - Upload local council documents to `LocalDataBucket`
   - Sync data sources in Bedrock console

5. **Deploy Agent**
Per [reference](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-get-started-code-deploy.html)
   ```bash
   cd ../agents/caddy
   
   # Update agent.py with KB IDs from KnowledgeBaseStack outputs
   # Get KB IDs from: uv run cdk deploy --outputs-file outputs.json
   
   # Create deployment package for AgentCore
   uv pip install \
     --python-platform aarch64-manylinux2014 \
     --python-version 3.13 \
     --target=deployment_package \
     --only-binary=:all: \
     -r pyproject.toml
   
   # Package for deployment
   cd deployment_package
   zip -r ../deployment_package.zip .
   cd ..
   zip deployment_package.zip agent.py
   
   # Upload to deployment bucket (get bucket name from stack outputs)
   aws s3 cp deployment_package.zip s3://YOUR_DEPLOYMENT_BUCKET_NAME/
   ```

## Updating Agent Code

Whenever you make changes to `agents/caddy/agent.py`, you must rebuild and redeploy:

```bash
cd agents/caddy

# Rebuild deployment package with updated agent.py
cd deployment_package && zip -r ../deployment_package.zip . && cd ..
zip deployment_package.zip agent.py

# Upload to S3 deployment bucket
aws s3 cp deployment_package.zip s3://knowledgebasestack-deploymentbucketc91a09da-uee2lk6l86hw/deployment_package.zip

# Update the AgentCore runtime via CLI
aws bedrock-agentcore-control update-agent-runtime \
  --agent-runtime-id <YOUR_RUNTIME_ID> \
  --agent-runtime-artifact '{
    "codeConfiguration": {
      "code": {
        "s3": {
          "bucket": "<YOUR_DEPLOYMENT_BUCKET>",
          "prefix": "deployment_package.zip"
        }
      },
      "runtime": "PYTHON_3_13",
      "entryPoint": ["agent.py"]
    }
  }' \
  --role-arn <YOUR_ROLE_ARN> \
  --network-configuration '{"networkMode": "PUBLIC"}' \
  --environment-variables '{
    "LOCAL_KB_ID": "<YOUR_LOCAL_KB_ID>",
    "NATIONAL_KB_ID": "<YOUR_NATIONAL_KB_ID>",
    "REGION": "us-west-2"
  }'
```

**Note**: Replace bucket name, runtime ID, and role ARN with your actual values from CloudFormation outputs.

## Frontend Deployment

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Update Configuration Files

After deploying FrontendStack, update the configuration files with CloudFormation outputs:

**Update `frontend/src/config.ts`:**
```typescript
export const awsConfig = {
  region: 'us-west-2',
  userPoolId: 'YOUR_USER_POOL_ID',           // From FrontendStack.UserPoolId
  userPoolClientId: 'YOUR_CLIENT_ID',        // From FrontendStack.UserPoolClientId
  identityPoolId: 'YOUR_IDENTITY_POOL_ID',   // From FrontendStack.IdentityPoolId
  apiEndpoint: 'YOUR_API_ENDPOINT',          // From FrontendStack.InvokeEndpoint
  eventApiEndpoint: 'YOUR_EVENT_ENDPOINT',   // From FrontendStack.EventApiHttpEndpoint
};
```

**Update `frontend/deploy-config.json`:**
```json
{
  "frontendBucket": "YOUR_FRONTEND_BUCKET",           // From FrontendStack.FrontendBucketName
  "cloudFrontDistributionId": "YOUR_DISTRIBUTION_ID", // From FrontendStack.CloudFrontDistributionId
  "cloudFrontUrl": "YOUR_CLOUDFRONT_URL"              // From FrontendStack.CloudFrontUrl
}
```

### 3. Build and Test Locally
```bash
# Build the frontend
npm run build

# Test locally (optional)
npm run dev
```

### 4. Deploy to S3 and CloudFront
```bash
# Make deploy script executable (first time only)
chmod +x deploy.sh

# Deploy (reads from deploy-config.json automatically)
./deploy.sh
```

The deploy script will:
- Build the frontend
- Upload to S3 bucket
- Invalidate CloudFront cache

### 5. Access Application
Open the CloudFront URL from `FrontendStack.CloudFrontUrl` in your browser.

## Project Structure

```
├── infrastructure/          # CDK stacks
│   ├── stacks/
│   │   ├── opensearch_stack.py      # OpenSearch collections & indexes
│   │   ├── knowledge_base_stack.py  # S3 buckets & Knowledge Bases
│   │   └── agent_stack.py           # AgentCore runtime
│   └── app.py              # Three-stack deployment
├── agents/caddy/           # AgentCore agent
├── frontend/               # React frontend
└── tests/                  # Test suites
```