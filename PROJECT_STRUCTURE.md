# Simple Full-Stack AWS App with Strands Agents

## Overview
Clean, minimal structure for a full-stack AWS application using Strands Agents.

```
project-root/
├── .kiro/                     # Kiro IDE settings
│   ├── settings/mcp.json
│   └── specs/
│
├── infrastructure/            # AWS CDK + Backend Code
│   ├── stacks/
│   │   ├── app_stack.py          # Main application stack
│   │   └── agent_stack.py        # Agent infrastructure
│   │
│   ├── lambdas/              # Lambda functions
│   │   ├── function-1/
│   │   │   └── index.py
│   │   ├── function-2/
│   │   │   └── index.py
│   │   └── shared/           # Shared code
│   │       └── utils.py
│   │
│   ├── app.py                # CDK app entry point
│   ├── pyproject.toml        # uv project config
│   └── requirements.txt      # Dependencies
│
├── agents/                   # Strands Agents
│   └── chat-agent/          # Main chat agent
│       ├── agent.py
│       ├── tools/
│       ├── requirements.txt
│       └── config.yaml      # Agent configuration
│   │
│   ├── shared/              # Shared utilities
│   │   ├── models.py        # Model configs
│   │   └── tools.py         # Common tools
│   │
│   └── config.yaml          # Agent configuration
│
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Pages
│   │   ├── services/         # API calls
│   │   └── types/            # TypeScript types
│   ├── public/
│   └── package.json
│
├── .gitignore
├── package.json              # Workspace root
└── README.md
```

## Key Components

### Infrastructure (`/infrastructure`)
- **CDK stacks** for AWS resources (Python)
- **Lambda code** co-located with infrastructure
- **uv** for fast Python dependency management
- **Single deployment** for both infra and code

### Agents (`/agents`)
- **Single chat agent** to start with
- **Shared utilities** for models and tools
- **Simple configuration** file

### Frontend (`/frontend`)
- **React with TypeScript**
- **Component-based** architecture
- **API service** layer

## Getting Started

1. **Deploy everything**: `cd infrastructure && uv run cdk deploy`
2. **Start frontend**: `cd frontend && npm run dev`
3. **Test locally**: `npm run test`

## Technology Stack

- **Agents**: Strands Agents (Python)
- **Backend**: Python + Lambda (in infrastructure/)
- **Frontend**: React + TypeScript
- **Infrastructure**: AWS CDK (Python)
- **Package Manager**: uv (Python), npm (Frontend)
- **Database**: DynamoDB
- **Storage**: S3

Simple, focused, and easy to understand!