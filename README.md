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
   uv run cdk deploy --all
   ```
   This deploys:
   - OpenSearchStack: Collections, indexes, IAM roles
   - KnowledgeBaseStack: S3 buckets, Knowledge Bases, data sources

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

## Project Structure

```
├── infrastructure/          # CDK stacks
│   ├── stacks/
│   │   ├── opensearch_stack.py      # OpenSearch collections & indexes
│   │   └── knowledge_base_stack.py  # S3 buckets & Knowledge Bases
│   └── app.py              # Two-stack deployment
├── agents/caddy/           # AgentCore agent
├── frontend/               # React frontend
└── tests/                  # Test suites
```