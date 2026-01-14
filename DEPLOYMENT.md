# Citizens Advice Agent - Deployment Guide

Complete guide for deploying the Citizens Advice Agent.

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with credentials
- Docker installed and running

## Quick Start

```bash
# Install dependencies
npm install

# Deploy everything
npm run deploy

# Start local development
npm run dev
```

## Deployment Steps

### 1. Deploy Amplify Backend

```bash
npm run deploy:amplify
```

Creates:
- Cognito User Pool for authentication
- DynamoDB tables (UserProfile, Notes, LocalBureau, etc.)
- GraphQL API

### 2. Deploy MCP Servers

```bash
npm run deploy:mcp
```

Deploys:
- **NotesStack** - Notes management MCP server

### 3. Deploy Agent Stack

```bash
npm run deploy:agent
```

Deploys:
- Supervisor agent runtime
- AgentCore Gateway
- Memory resource
- OAuth2 credential provider

### 4. Deploy Frontend (Optional)

```bash
npm run deploy:frontend
```

Deploys React web UI to Amplify Hosting.

## Configuration

### deployment-config.json

```json
{
  "deploymentId": "citizens-advice",
  "deploymentName": "Citizens Advice Agent"
}
```

The `deploymentId` is used for:
- CloudFormation stack naming
- SSM parameter paths
- Resource tagging

## Available Scripts

| Command | Description | Time |
|---------|-------------|------|
| `npm run deploy` | Deploy everything | ~10 min |
| `npm run deploy:amplify` | Deploy Amplify backend | ~3 min |
| `npm run deploy:mcp` | Deploy MCP servers | ~2 min |
| `npm run deploy:agent` | Deploy agent stack | ~4 min |
| `npm run deploy:frontend` | Deploy web UI | ~3 min |
| `npm run dev` | Start local dev server | - |
| `npm run clean` | Delete all resources | ~5 min |

## Cleanup

```bash
# Delete everything
npm run clean

# Or delete individually
npm run clean:frontend
npm run clean:agent
npm run clean:mcp
npm run clean:amplify
```

## Troubleshooting

### CloudFormation Export Not Found

```bash
# Verify Amplify exports exist
aws cloudformation list-exports --query "Exports[?contains(Name, 'ConciergeAgent')]"
```

Solution: Run `npm run deploy:amplify` first.

### Gateway Connection Issues

```bash
# Check gateway URL
aws ssm get-parameter --name /citizens-advice-agent/citizens-advice/gateway-url

# Check agent stack status
aws cloudformation describe-stacks --stack-name AgentStack-citizens-advice
```

### Docker Build Failures

- Ensure Docker is running: `docker ps`
- Check Dockerfile in `concierge_agent/*/`
- Verify `requirements.txt` dependencies

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Web UI        │────▶│  Cognito Auth    │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Supervisor Agent│────▶│  AgentCore       │
│                 │     │  Memory          │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ AgentCore       │────▶│  Notes MCP       │
│ Gateway         │     │  Server          │
└─────────────────┘     └──────────────────┘
```

## Local Development

```bash
# Start web UI dev server
npm run dev

# Access at http://localhost:5173
```

The dev server connects to deployed AWS resources.
