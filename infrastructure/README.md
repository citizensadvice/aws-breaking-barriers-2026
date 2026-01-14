# Agent Infrastructure

CDK infrastructure for deploying the Citizens Advice Agent with AWS Bedrock AgentCore.

## Infrastructure Components

### 1. MCP Servers (`mcp-servers/`)

MCP runtime stacks:
- **NotesStack** - Notes management tools for tracking user cases

### 2. Agent Stack (`agent-stack/`)

Main supervisor agent infrastructure:
- **AgentCore Runtime** - Supervisor agent with JWT authentication
- **Memory Resource** - Conversation persistence
- **AgentCore Gateway** - MCP protocol gateway
- **OAuth2 Credential Provider** - M2M authentication
- **IAM Roles** - DynamoDB, Bedrock, Memory, Gateway permissions
- **SSM Parameters** - Gateway URL configuration

### 3. Frontend Stack (`frontend-stack/`)

Web UI hosting:
- **Amplify Hosting App** - React web UI deployment

## Prerequisites

1. **AWS CLI Configured**
2. **Amplify Backend Deployed** from project root:
   ```bash
   npm run deploy:amplify
   ```
3. **Node.js 18+** and npm
4. **Docker** installed and running

## Deployment

```bash
cd ..
npm run deploy:mcp    # Deploy MCP servers
npm run deploy:agent  # Deploy main agent
npm run deploy:frontend  # Deploy web UI (optional)
```

## Project Structure

```
infrastructure/
├── agent-stack/              # Main supervisor agent
│   ├── lib/
│   │   ├── agent-stack.ts
│   │   └── constructs/
│   │       └── gateway-construct.ts
│   └── lambdas/
│       └── oauth-provider/
├── mcp-servers/              # MCP runtime stacks
│   └── lib/
│       ├── base-mcp-stack.ts
│       └── notes-stack.ts
└── frontend-stack/           # Amplify Hosting
```

## Stack Outputs

### MCP Stacks
- `NotesStack-{deploymentId}-RuntimeArn`
- `NotesStack-{deploymentId}-RuntimeId`

### Agent Stack
- `MainRuntimeArn`, `MainRuntimeId`
- `MemoryId`
- `GatewayUrl`, `GatewayId`

## Troubleshooting

### CloudFormation Export Not Found
Deploy Amplify backend first:
```bash
cd .. && npm run deploy:amplify
```

### Gateway Connection Errors
Check gateway URL in SSM:
```bash
aws ssm get-parameter --name /citizens-advice-agent/{deploymentId}/gateway-url
```

## Cleanup

```bash
cd ..
npm run clean:frontend
npm run clean:agent
npm run clean:mcp
```
