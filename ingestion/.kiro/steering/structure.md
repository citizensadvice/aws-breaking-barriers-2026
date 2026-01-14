# Project Structure

## Current Repository Organization

```
.kiro/
├── specs/                          # Project specifications and planning
│   ├── document-management-backend/ # Backend service specifications
│   │   ├── requirements.md         # Comprehensive backend requirements
│   │   └── design.md              # Backend architecture design (TBD)
│   └── document-upload-ui/         # Frontend specifications
│       ├── requirements.md         # UI requirements and user stories
│       ├── design.md              # Component architecture and interfaces
│       └── tasks.md               # Implementation plan with 16 major tasks
└── steering/                       # AI assistant guidance documents
    ├── product.md                  # Product overview and features
    ├── tech.md                     # Technology stack and patterns
    └── structure.md               # This file - project organization
```

## Planned Implementation Structure

**Backend Structure** (AWS Serverless):
```
backend/
├── src/
│   ├── services/
│   │   ├── document-service/       # Core document operations
│   │   ├── storage-service/        # S3 storage management
│   │   ├── text-extractor/         # Document text extraction
│   │   ├── chunker/               # Text chunking for knowledge base
│   │   ├── knowledge-base-service/ # AWS Bedrock integration
│   │   ├── auth-service/          # Cognito authentication
│   │   └── email-ingestion/       # SES email processing
│   ├── shared/
│   │   ├── models/                # Data models and interfaces
│   │   ├── utils/                 # Common utilities
│   │   └── middleware/            # Lambda middleware
│   └── handlers/                  # Lambda function handlers
├── infrastructure/
│   ├── cloudformation/            # AWS CloudFormation templates
│   └── sam/                       # SAM templates for local development
└── tests/
    ├── unit/                      # Unit tests
    └── integration/               # Integration tests
```

**Frontend Structure** (React TypeScript):
```
frontend/
├── public/                        # Static assets
├── src/
│   ├── components/
│   │   ├── auth/                  # Authentication components
│   │   ├── upload/                # Upload interface components
│   │   ├── metadata/              # Metadata form components
│   │   ├── progress/              # Progress tracking components
│   │   └── common/                # Shared UI components
│   ├── hooks/                     # Custom React hooks
│   ├── contexts/                  # React context providers
│   ├── services/                  # API service layer
│   ├── utils/                     # Utility functions
│   ├── types/                     # TypeScript type definitions
│   └── tests/
│       ├── unit/                  # Unit tests
│       └── property/              # Property-based tests
├── build/                         # Production build output
└── deployment/                    # CloudFront deployment configs
```

## Key Organizational Principles

**Specification-Driven Development**:
- All features start with requirements in `.kiro/specs/`
- Design documents define architecture before implementation
- Task breakdown guides incremental development

**Service Separation**:
- Backend services are loosely coupled with clear interfaces
- Each service has a single responsibility
- Event-driven communication between services

**Component Hierarchy**:
- React components follow a hierarchical structure
- Clear separation between presentation and business logic
- Reusable components in common directory

**Testing Strategy**:
- Unit tests for specific functionality
- Property-based tests for universal behaviors
- Integration tests for service interactions
- 90% minimum code coverage requirement

## File Naming Conventions

**Backend**:
- Services: `kebab-case` (e.g., `document-service`)
- Lambda handlers: `camelCase` (e.g., `uploadHandler.js`)
- Models: `PascalCase` (e.g., `DocumentModel.ts`)

**Frontend**:
- Components: `PascalCase` (e.g., `UploadInterface.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useFileUpload.ts`)
- Utilities: `camelCase` (e.g., `fileValidator.ts`)
- Types: `PascalCase` with descriptive suffixes (e.g., `UploadState.ts`)

## Configuration Management

**Environment-Specific Configs**:
- Development, staging, and production environments
- AWS resource names and endpoints per environment
- Feature flags for gradual rollout

**Security Considerations**:
- No hardcoded credentials in source code
- AWS IAM roles for service-to-service communication
- Environment variables for sensitive configuration