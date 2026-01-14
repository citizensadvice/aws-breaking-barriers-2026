# AGENTS.md - AI Coding Agent Guidelines

## Project Overview

AWS Breaking Barriers 2026 - A serverless document management system with:
- **Backend**: AWS CDK/Lambda/DynamoDB/S3/Cognito/Bedrock in `ingestion/`
- **Frontend**: React TypeScript SPA in `ingestion/document-upload-ui/`

## Build, Lint, and Test Commands

### Backend (ingestion/)

```bash
# Install dependencies
cd ingestion && npm install

# Build TypeScript
npm run build

# Lint
npm run lint
npm run lint:fix          # Auto-fix issues

# Run all tests
npm test

# Run single test file
npm test -- path/to/file.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="pattern"

# Watch mode
npm run test:watch

# Smoke tests (requires deployed infrastructure)
npm run smoke:infra       # Infrastructure validation
npm run smoke:api         # API endpoint tests
npm run smoke:all         # All smoke tests

# CDK commands
npm run cdk synth         # Synthesize CloudFormation
npm run cdk deploy        # Deploy stack
npm run cdk diff          # Show changes
```

### Frontend (ingestion/document-upload-ui/)

```bash
cd ingestion/document-upload-ui && npm install

# Development server
npm start

# Build for production
npm run build

# Run all tests
npm test

# Run single test file
npm test -- --testPathPattern="FileDropZone"

# Run tests matching pattern
npm test -- --testNamePattern="renders drop zone"

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2022
- Strict mode enabled (`strict: true`)
- No implicit any (`noImplicitAny: true`)
- No implicit returns (`noImplicitReturns: true`)
- ES module interop enabled

### ESLint Rules

- Parser: `@typescript-eslint/parser`
- Unused vars: warn (underscore prefix `_` ignored)
- No explicit any: warn
- Console statements: warn
- Explicit return types: not required

### Import Organization

Order imports as follows:
1. Node.js built-ins
2. External packages (AWS SDK, React, etc.)
3. Internal absolute imports
4. Relative imports

```typescript
// External packages
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { z } from 'zod';

// Internal imports
import { Document, DocumentMetadataInput } from '../../shared/types';
import { validateFile } from '../../shared/file-validation';
import { UserContext } from './types';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (backend) | kebab-case | `document-service.ts` |
| Files (React components) | PascalCase | `FileDropZone.tsx` |
| Files (hooks) | camelCase with `use` prefix | `useDocumentAPI.ts` |
| Interfaces/Types | PascalCase | `DocumentMetadata`, `UserContext` |
| Functions | camelCase | `createDocument`, `handleUpload` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE_BYTES` |
| React Components | PascalCase | `FileDropZone`, `MetadataForm` |
| Test files | Same as source + `.test.ts(x)` | `FileDropZone.test.tsx` |

### Type Definitions

- Use interfaces for object shapes that may be extended
- Use type aliases for unions, primitives, and utility types
- Export types from dedicated `types.ts` files
- Use Zod schemas for runtime validation

```typescript
// Types file pattern
export interface DocumentMetadata {
  location: string;
  category?: string;
  sensitivity: number;
}

export type DocumentStatus = 'active' | 'processing' | 'failed';
export type UserRole = 'admin' | 'user';

// Zod schema for validation
export const documentMetadataInputSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  category: z.string().optional(),
  sensitivity: z.number().int().min(1).max(5).optional(),
});
```

### Error Handling

- Use structured error responses with error codes
- Wrap async operations in try/catch
- Log errors with context before re-throwing
- Return user-friendly error messages

```typescript
try {
  const result = await someOperation();
  return createSuccessResponse({ data: result });
} catch (error) {
  console.error('Operation failed:', error);
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return createErrorResponse('NOT_FOUND', 'Resource not found', 404);
    }
  }
  return createErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
}
```

### React Component Patterns

- Use functional components with TypeScript interfaces for props
- Prefer `React.FC<Props>` for component typing
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Export with `React.memo` for pure components

```typescript
interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  disabled = false,
  maxFiles,
}) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    // handler logic
  }, [disabled, maxFiles, onFilesSelected]);

  return <div onDrop={handleDrop}>...</div>;
};

export default React.memo(FileDropZone);
```

### Testing Patterns

**Unit Tests**: Use Jest with descriptive test names
```typescript
describe('FileDropZone', () => {
  test('renders drop zone with correct text', () => {
    render(<FileDropZone onFilesSelected={mockFn} />);
    expect(screen.getByText('Drag and drop files here')).toBeInTheDocument();
  });
});
```

**Property-Based Tests**: Use fast-check for invariant testing
```typescript
import * as fc from 'fast-check';

it('should accept all files with supported extensions', () => {
  fc.assert(
    fc.property(supportedFileNameArb, (fileName) => {
      const result = validateFileType(fileName);
      expect(result.isValid).toBe(true);
    }),
    { numRuns: 100 }
  );
});
```

### Documentation

- Add JSDoc comments for exported functions and types
- Include `@param` and `@returns` annotations
- Reference requirements in comments where applicable

```typescript
/**
 * Create a new document
 * Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 2.6, 2.7
 * @param params - Document creation parameters
 * @returns The created document record
 */
export async function createDocument(params: CreateDocumentParams): Promise<Document> {
```

## Project Structure

```
ingestion/
├── bin/                    # CDK app entry point
├── lib/
│   ├── document-management-stack.ts  # Main CDK stack
│   ├── lambda/             # Lambda function code
│   │   ├── document/       # Document CRUD operations
│   │   ├── search/         # Search operations
│   │   └── conversion/     # File conversion services
│   └── shared/             # Shared types and utilities
├── test/                   # Backend tests
├── document-upload-ui/     # React frontend
│   └── src/
│       ├── components/     # React components
│       ├── contexts/       # React contexts
│       ├── hooks/          # Custom hooks
│       ├── services/       # API services
│       └── types/          # TypeScript types
└── docs/                   # Architecture documentation
```

## Key Constants

```typescript
// Supported file types
const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.html'];

// Max file size: 50MB
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Valid locations (organizations)
const VALID_LOCATIONS = ['croydon', 'manchester', 'arun-chichester'];

// Sensitivity range: 1-5 (default: 3)
```

## AWS Services Used

- **Lambda**: Serverless compute for API handlers
- **DynamoDB**: Document metadata storage (on-demand billing)
- **S3**: Document file storage
- **Cognito**: User authentication with JWT tokens
- **API Gateway**: REST API endpoints
- **Bedrock Knowledge Bases**: Semantic search with embeddings
- **OpenSearch Serverless**: Vector storage for search
