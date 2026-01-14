# Technology Stack

## Backend (Document Management)

**Cloud Platform**: AWS (primary infrastructure)
- **Compute**: AWS Lambda (serverless functions)
- **Storage**: AWS S3 with S3 Standard-Infrequent Access for cost optimization
- **Database**: DynamoDB with on-demand capacity mode
- **Authentication**: AWS Cognito User Pools with JWT tokens
- **Search**: AWS Bedrock Knowledge Bases + Amazon OpenSearch Serverless
- **Email Processing**: Amazon SES for inbound document ingestion
- **Text Extraction**: Custom service supporting PDF, Word, PowerPoint, Google Docs

**Architecture Pattern**: Microservices with event-driven processing

## Frontend (Document Upload UI)

**Framework**: React with TypeScript support
- **Hosting**: AWS CloudFront (CDN for global delivery)
- **Authentication**: AWS Cognito User Pool integration
- **Testing**: Jest, React Testing Library, fast-check (property-based testing)
- **Browser Support**: Chrome, Firefox, Safari, Edge with graceful degradation

**Supported File Types**: PDF, DOC, DOCX, HTML, TXT, PPTX, Google Docs links

## Development Patterns

**Backend Patterns**:
- Service-oriented architecture with separate services for Documents, Storage, Text Extraction, Knowledge Base, Auth, Email Ingestion
- Event-driven processing: Upload → Storage → Text Extraction → Chunking → Knowledge Base Indexing
- Role-based access control (Admin/User) with organization isolation
- Document versioning with automatic increment on updates

**Frontend Patterns**:
- React Context API for authentication state management
- Component composition with hierarchical structure
- Controlled components with validation
- Error boundaries for graceful error handling
- Dual testing strategy: Unit tests + Property-based testing

## Common Commands

*Note: Project is currently in specification phase. These commands will be relevant once implementation begins.*

**Frontend Development** (Future):
```bash
# Project setup
npm create react-app document-upload-ui --template typescript
npm install @aws-amplify/ui-react aws-amplify

# Development
npm start                 # Start development server
npm test                  # Run tests
npm run build            # Build for production
npm run test:coverage    # Run tests with coverage

# Property-based testing
npm test -- --testNamePattern="property"
```

**Backend Development** (Future):
```bash
# AWS deployment
aws cloudformation deploy --template-file template.yaml --stack-name doc-management
aws lambda update-function-code --function-name DocumentService

# Local testing
sam local start-api      # Start local API Gateway
sam local invoke         # Test Lambda functions locally
```

## Cost Optimization Strategy

- **Serverless-first**: Lambda functions minimize idle costs
- **Storage tiering**: S3 Infrequent Access for documents not accessed within 30 days
- **On-demand pricing**: DynamoDB and OpenSearch Serverless
- **Request throttling**: Prevent cost spikes from excessive API calls