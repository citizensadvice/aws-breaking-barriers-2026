# Citizens Advice Agent

AI-powered agent providing guidance on everyday issues for UK residents, built with AWS Bedrock AgentCore, Amplify, and React.

The Citizens Advice assistant helps with benefits, housing, employment rights, consumer rights, debt management, and immigration queries.

### Use case details
| Information         | Details                                                                |
|---------------------|------------------------------------------------------------------------|
| Use case type       | Advisory Agent                                                         |
| Agent type          | Multi-agent                                                            |
| Use case components | Tools (MCP-based), observability (logs, metrics)                       |
| Use case vertical   | Public Services                                                        |
| Example complexity  | Advanced                                                               |
| SDK used            | Strands, MCP                                                           |

## Features

- **Benefits Guidance** - Help with Universal Credit, PIP, housing benefit queries
- **Housing Advice** - Tenancy rights, eviction guidance, repairs issues
- **Employment Rights** - Workplace issues, redundancy, discrimination
- **Consumer Rights** - Refunds, faulty goods, contract disputes
- **Debt Management** - Priority debts, budgeting, debt solutions
- **Conversation Memory** - Persistent chat history across sessions
- **Real-time Streaming** - Live agent responses

## Quick Start

```bash
# Install dependencies
npm install

# Deploy everything (backend + agent)
npm run deploy

# Start local development server
npm run dev
```

For complete deployment instructions, see the **[Deployment Guide](DEPLOYMENT.md)**.

## Project Structure

```
citizens-advice-agent/
├── amplify/                    # AWS Amplify backend (Cognito, DynamoDB, GraphQL)
├── concierge_agent/           # Agent code and Docker container
│   ├── Dockerfile
│   └── supervisor_agent/      # Python agent implementation
├── infrastructure/            # CDK infrastructure for agent deployment
├── web-ui/                    # React frontend application
└── scripts/                   # Deployment and setup scripts
```

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with credentials
- Docker (for building agent containers)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy everything (Amplify + Agent) |
| `npm run deploy:amplify` | Deploy Amplify backend only |
| `npm run deploy:agent` | Deploy agent infrastructure only |
| `npm run dev` | Start web UI development server |
| `npm run clean` | Delete all AWS resources |

## Cleanup

To remove all deployed AWS resources:

```bash
npm run clean
```

> [!NOTE]
> This project is provided as a sample implementation for educational purposes.
