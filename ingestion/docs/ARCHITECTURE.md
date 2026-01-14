# Document Management System - Architecture

## System Overview

This document provides comprehensive architecture diagrams for the Document Management System, showing how the frontend, backend, and AWS services interact to provide document upload, storage, and semantic search capabilities.

## High-Level System Architecture

```mermaid
flowchart TB
    subgraph "User Layer"
        User[End User]
        Browser[Web Browser]
    end

    subgraph "Frontend - AWS CloudFront"
        CDN[CloudFront Distribution]
        ReactApp[React Application<br/>TypeScript]
    end

    subgraph "API Layer"
        APIGW[API Gateway<br/>REST API]
        Cognito[Amazon Cognito<br/>User Pool]
    end

    subgraph "Compute Layer - AWS Lambda"
        DocLambda[Document Lambda<br/>CRUD Operations]
        SearchLambda[Search Lambda<br/>Metadata & Semantic]
        ConvertLambda[Conversion Lambda<br/>Google Docs & PPTX]
    end

    subgraph "Storage Layer"
        S3[Amazon S3<br/>Document Storage]
        DynamoDB[DynamoDB<br/>Metadata Store]
    end

    subgraph "AI/Search Layer"
        BedrockKB[AWS Bedrock<br/>Knowledge Base]
        OpenSearch[OpenSearch Serverless<br/>Vector Store]
    end

    User --> Browser
    Browser --> CDN
    CDN --> ReactApp
    ReactApp --> APIGW
    APIGW --> Cognito
    
    Cognito -.JWT Token.-> APIGW
    
    APIGW --> DocLambda
    APIGW --> SearchLambda
    
    DocLambda --> S3
    DocLambda --> DynamoDB
    DocLambda --> ConvertLambda
    
    ConvertLambda --> S3
    
    SearchLambda --> BedrockKB
    SearchLambda --> DynamoDB
    
    S3 -.Auto Sync.-> BedrockKB
    BedrockKB --> OpenSearch
    
    style ReactApp fill:#61dafb
    style Cognito fill:#ff9900
    style S3 fill:#569a31
    style DynamoDB fill:#527fff
    style BedrockKB fill:#ff9900
    style OpenSearch fill:#005eb8
```

## Frontend Architecture

```mermaid
flowchart TB
    subgraph "React Application Structure"
        App[App Component<br/>Router & Auth Provider]
        
        subgraph "Authentication"
            Login[Login Page]
            AuthGuard[Auth Guard<br/>Protected Routes]
            AuthContext[Auth Context<br/>Cognito Integration]
        end
        
        subgraph "Upload Interface"
            UploadPage[Upload Page]
            FileDropZone[File Drop Zone<br/>Drag & Drop]
            FileValidator[File Validator<br/>Type & Size]
            MetadataForm[Metadata Form<br/>Location, Category, etc.]
            ProgressTracker[Progress Tracker<br/>Real-time Updates]
            GoogleDocs[Google Docs Input<br/>URL Handler]
        end
        
        subgraph "Services"
            APIClient[API Client<br/>Axios/Fetch]
            AuthService[Auth Service<br/>Token Management]
        end
        
        subgraph "State Management"
            UploadState[Upload State<br/>Files & Progress]
            NotificationState[Notification State<br/>Success/Error]
        end
    end
    
    App --> Login
    App --> AuthGuard
    AuthGuard --> UploadPage
    
    Login --> AuthContext
    AuthContext --> AuthService
    
    UploadPage --> FileDropZone
    UploadPage --> FileValidator
    UploadPage --> MetadataForm
    UploadPage --> ProgressTracker
    UploadPage --> GoogleDocs
    
    FileDropZone --> UploadState
    MetadataForm --> UploadState
    ProgressTracker --> UploadState
    
    UploadState --> APIClient
    AuthService --> APIClient
    
    APIClient -.HTTP/HTTPS.-> APIGW[API Gateway]
    
    style App fill:#61dafb
    style AuthContext fill:#ffd700
    style APIClient fill:#ff6b6b
```

## Backend Service Architecture

```mermaid
flowchart TB
    subgraph "API Gateway Layer"
        APIGW[API Gateway]
        Auth[Cognito Authorizer]
    end
    
    subgraph "Document Service"
        DocHandler[Document Handler]
        DocService[Document Service]
        FileValidation[File Validation]
        MetadataValidation[Metadata Validation]
    end
    
    subgraph "Search Service"
        SearchHandler[Search Handler]
        SearchService[Search Service]
        MetadataSearch[Metadata Search]
        SemanticSearch[Semantic Search]
    end
    
    subgraph "Conversion Service"
        ConvertHandler[Conversion Handler]
        GoogleDocsService[Google Docs Service<br/>API Integration]
        PowerPointService[PowerPoint Service<br/>LibreOffice Layer]
    end
    
    subgraph "Data Access Layer"
        S3Client[S3 Client]
        DynamoClient[DynamoDB Client]
        BedrockClient[Bedrock KB Client]
    end
    
    APIGW --> Auth
    Auth --> DocHandler
    Auth --> SearchHandler
    
    DocHandler --> DocService
    DocService --> FileValidation
    DocService --> MetadataValidation
    DocService --> ConvertHandler
    
    SearchHandler --> SearchService
    SearchService --> MetadataSearch
    SearchService --> SemanticSearch
    
    ConvertHandler --> GoogleDocsService
    ConvertHandler --> PowerPointService
    
    DocService --> S3Client
    DocService --> DynamoClient
    SearchService --> DynamoClient
    SearchService --> BedrockClient
    ConvertHandler --> S3Client
    
    S3Client --> S3[(S3 Bucket)]
    DynamoClient --> DDB[(DynamoDB)]
    BedrockClient --> KB[Bedrock KB]
    
    style DocService fill:#ff9900
    style SearchService fill:#ff9900
    style ConvertHandler fill:#ff9900
```

## Document Upload Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React App
    participant CDN as CloudFront
    participant APIGW as API Gateway
    participant Cognito
    participant DocLambda as Document Lambda
    participant ConvertLambda as Conversion Lambda
    participant S3
    participant DynamoDB
    participant BedrockKB as Bedrock KB
    
    User->>React: Select/Drop Files
    React->>React: Validate File Type & Size
    React->>User: Show Metadata Form
    User->>React: Enter Metadata (Location, etc.)
    
    React->>Cognito: Authenticate
    Cognito-->>React: JWT Token
    
    React->>APIGW: POST /documents<br/>(File + Metadata + Token)
    APIGW->>Cognito: Validate Token
    Cognito-->>APIGW: Token Valid
    
    APIGW->>DocLambda: Invoke with Request
    
    alt PowerPoint File
        DocLambda->>ConvertLambda: Convert PPTX to PDF
        ConvertLambda->>S3: Upload Original
        ConvertLambda->>ConvertLambda: Convert using LibreOffice
        ConvertLambda->>S3: Upload PDF
        ConvertLambda-->>DocLambda: Conversion Complete
    else Google Docs URL
        DocLambda->>ConvertLambda: Fetch Google Doc
        ConvertLambda->>ConvertLambda: Export as PDF via API
        ConvertLambda->>S3: Upload PDF
        ConvertLambda-->>DocLambda: Fetch Complete
    else PDF/Word
        DocLambda->>S3: Upload File Directly
    end
    
    DocLambda->>S3: Upload Metadata JSON
    DocLambda->>DynamoDB: Store Document Metadata
    
    S3-->>BedrockKB: Auto-Sync Trigger
    BedrockKB->>BedrockKB: Extract Text & Chunk
    BedrockKB->>BedrockKB: Generate Embeddings
    BedrockKB->>OpenSearch: Store Vectors
    
    DocLambda-->>APIGW: Success Response
    APIGW-->>React: Document ID & Status
    React->>User: Show Success Notification
```

## Search Flow

```mermaid
sequenceDiagram
    participant User
    participant React as React App
    participant APIGW as API Gateway
    participant Cognito
    participant SearchLambda as Search Lambda
    participant DynamoDB
    participant BedrockKB as Bedrock KB
    participant OpenSearch
    
    User->>React: Enter Search Query
    React->>Cognito: Get Auth Token
    Cognito-->>React: JWT Token
    
    alt Metadata Search
        React->>APIGW: POST /search<br/>(Filters + Token)
        APIGW->>Cognito: Validate Token
        Cognito-->>APIGW: Token Valid
        APIGW->>SearchLambda: Invoke
        SearchLambda->>SearchLambda: Extract User Org & Role
        SearchLambda->>DynamoDB: Query with Filters<br/>+ Authorization
        DynamoDB-->>SearchLambda: Matching Documents
        SearchLambda-->>APIGW: Results
    else Semantic Search
        React->>APIGW: POST /search/semantic<br/>(Query + Token)
        APIGW->>Cognito: Validate Token
        Cognito-->>APIGW: Token Valid
        APIGW->>SearchLambda: Invoke
        SearchLambda->>SearchLambda: Extract User Org & Role
        SearchLambda->>BedrockKB: Query with Filters
        BedrockKB->>OpenSearch: Vector Search
        OpenSearch-->>BedrockKB: Similar Documents
        BedrockKB-->>SearchLambda: Results + Passages
        SearchLambda->>SearchLambda: Filter by Authorization
        SearchLambda-->>APIGW: Authorized Results
    end
    
    APIGW-->>React: Search Results
    React->>User: Display Results
```

## Authentication & Authorization Flow

```mermaid
flowchart TB
    subgraph "User Authentication"
        Login[User Login]
        Cognito[AWS Cognito<br/>User Pool]
        JWT[JWT Token<br/>with Claims]
    end
    
    subgraph "Token Claims"
        UserID[User ID<br/>sub]
        Email[Email]
        OrgID[Organization ID<br/>custom:organizationId]
        Role[Role<br/>custom:role]
    end
    
    subgraph "Authorization Logic"
        CheckAuth{Validate Token}
        CheckOrg{Same Org?}
        CheckRole{Admin or Owner?}
    end
    
    subgraph "Access Decision"
        GrantAccess[Grant Access]
        DenyAccess[Deny Access]
    end
    
    Login --> Cognito
    Cognito --> JWT
    JWT --> UserID
    JWT --> Email
    JWT --> OrgID
    JWT --> Role
    
    UserID --> CheckAuth
    Email --> CheckAuth
    OrgID --> CheckAuth
    Role --> CheckAuth
    
    CheckAuth -->|Valid| CheckOrg
    CheckAuth -->|Invalid| DenyAccess
    
    CheckOrg -->|Yes| CheckRole
    CheckOrg -->|No| DenyAccess
    
    CheckRole -->|Admin| GrantAccess
    CheckRole -->|Owner| GrantAccess
    CheckRole -->|Neither| DenyAccess
    
    style GrantAccess fill:#90ee90
    style DenyAccess fill:#ff6b6b
```

## Data Model - DynamoDB

```mermaid
erDiagram
    DOCUMENTS {
        string PK "DOC#documentId"
        string SK "META"
        string GSI1PK "ORG#organizationId"
        string GSI1SK "USER#userId#createdAt"
        string GSI2PK "ORG#organizationId"
        string GSI2SK "LOC#location#createdAt"
        string id
        string userId
        string organizationId
        string fileName
        string fileExtension
        string s3Key
        string location
        string category
        number sensitivity
        string expiryDate
        number version
        string status
        string createdAt
        string updatedAt
    }
    
    USERS {
        string userId
        string email
        string organizationId
        string role
    }
    
    ORGANIZATIONS {
        string organizationId
        string name
    }
    
    USERS ||--o{ DOCUMENTS : uploads
    ORGANIZATIONS ||--o{ USERS : contains
    ORGANIZATIONS ||--o{ DOCUMENTS : owns
```

## S3 Bucket Structure

```mermaid
flowchart TB
    subgraph "S3 Bucket: documents-bucket"
        Root[Root]
        
        subgraph "Organization 1"
            Org1[org-123/]
            Doc1[doc-abc/]
            File1[document.pdf]
            Meta1[doc-abc.metadata.json]
        end
        
        subgraph "Organization 2"
            Org2[org-456/]
            Doc2[doc-xyz/]
            File2[presentation.pdf]
            Meta2[doc-xyz.metadata.json]
        end
    end
    
    Root --> Org1
    Root --> Org2
    Org1 --> Doc1
    Doc1 --> File1
    Doc1 --> Meta1
    Org2 --> Doc2
    Doc2 --> File2
    Doc2 --> Meta2
    
    style File1 fill:#90ee90
    style File2 fill:#90ee90
    style Meta1 fill:#ffd700
    style Meta2 fill:#ffd700
```

## Cost Optimization Strategy

```mermaid
flowchart LR
    subgraph "Compute Optimization"
        Lambda[AWS Lambda<br/>Pay per Request]
        NoIdle[No Idle Costs]
    end
    
    subgraph "Storage Optimization"
        S3Standard[S3 Standard<br/>Frequent Access]
        S3IA[S3 Infrequent Access<br/>30+ Days]
        Lifecycle[Lifecycle Policy]
    end
    
    subgraph "Database Optimization"
        DynamoOnDemand[DynamoDB<br/>On-Demand Mode]
        PayPerRequest[Pay per Request]
    end
    
    subgraph "Search Optimization"
        OpenSearchServerless[OpenSearch<br/>Serverless]
        AutoScale[Auto-Scaling]
    end
    
    subgraph "API Optimization"
        Throttling[Request Throttling]
        Caching[CloudFront Caching]
    end
    
    Lambda --> NoIdle
    S3Standard --> Lifecycle
    Lifecycle --> S3IA
    DynamoOnDemand --> PayPerRequest
    OpenSearchServerless --> AutoScale
    Throttling --> Caching
    
    style NoIdle fill:#90ee90
    style S3IA fill:#90ee90
    style PayPerRequest fill:#90ee90
    style AutoScale fill:#90ee90
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph "Development"
        DevCode[Source Code]
        DevTest[Unit & Property Tests]
    end
    
    subgraph "CI/CD Pipeline"
        Build[Build & Test]
        Package[Package Lambda]
        Deploy[Deploy CloudFormation]
    end
    
    subgraph "AWS Regions"
        subgraph "Primary Region"
            CloudFront[CloudFront<br/>Global CDN]
            APIGW1[API Gateway]
            Lambda1[Lambda Functions]
            S3_1[S3 Bucket]
            DDB1[DynamoDB]
            KB1[Bedrock KB]
        end
    end
    
    subgraph "Monitoring"
        CloudWatch[CloudWatch Logs]
        XRay[X-Ray Tracing]
        Alarms[CloudWatch Alarms]
    end
    
    DevCode --> Build
    DevTest --> Build
    Build --> Package
    Package --> Deploy
    
    Deploy --> CloudFront
    Deploy --> APIGW1
    Deploy --> Lambda1
    Deploy --> S3_1
    Deploy --> DDB1
    Deploy --> KB1
    
    Lambda1 --> CloudWatch
    Lambda1 --> XRay
    CloudWatch --> Alarms
    
    style CloudFront fill:#ff9900
    style CloudWatch fill:#ff4f8b
```

## Security Architecture

```mermaid
flowchart TB
    subgraph "Network Security"
        HTTPS[HTTPS Only<br/>TLS 1.2+]
        CORS[CORS Policy]
        WAF[AWS WAF<br/>Optional]
    end
    
    subgraph "Authentication"
        Cognito[Cognito User Pool]
        JWT[JWT Tokens]
        MFA[MFA Support]
    end
    
    subgraph "Authorization"
        IAM[IAM Roles]
        RBAC[Role-Based Access<br/>Admin/User]
        OrgIsolation[Organization Isolation]
    end
    
    subgraph "Data Security"
        S3Encryption[S3 Encryption<br/>at Rest]
        DynamoEncryption[DynamoDB Encryption<br/>at Rest]
        TransitEncryption[TLS in Transit]
    end
    
    subgraph "Audit & Compliance"
        CloudTrail[CloudTrail Logging]
        AccessLogs[Access Logs]
        Monitoring[Security Monitoring]
    end
    
    HTTPS --> Cognito
    CORS --> Cognito
    WAF --> Cognito
    
    Cognito --> JWT
    Cognito --> MFA
    
    JWT --> IAM
    JWT --> RBAC
    RBAC --> OrgIsolation
    
    IAM --> S3Encryption
    IAM --> DynamoEncryption
    S3Encryption --> TransitEncryption
    DynamoEncryption --> TransitEncryption
    
    TransitEncryption --> CloudTrail
    CloudTrail --> AccessLogs
    AccessLogs --> Monitoring
    
    style HTTPS fill:#90ee90
    style JWT fill:#90ee90
    style S3Encryption fill:#90ee90
    style CloudTrail fill:#ffd700
```

## Technology Stack Summary

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Testing**: Jest, React Testing Library, fast-check
- **Hosting**: AWS CloudFront + S3
- **Build Tool**: Create React App

### Backend
- **Runtime**: Node.js 18 (AWS Lambda)
- **Language**: TypeScript
- **API**: REST via API Gateway
- **Authentication**: AWS Cognito
- **Testing**: Jest, fast-check

### Storage & Data
- **Object Storage**: Amazon S3
- **Database**: Amazon DynamoDB
- **Vector Store**: Amazon OpenSearch Serverless

### AI & Search
- **Knowledge Base**: AWS Bedrock Knowledge Bases
- **Embeddings**: Amazon Titan Embeddings V2
- **Chunking**: Bedrock automatic semantic chunking

### DevOps
- **IaC**: AWS CloudFormation / CDK
- **CI/CD**: GitHub Actions / AWS CodePipeline
- **Monitoring**: CloudWatch, X-Ray
- **Logging**: CloudWatch Logs

## Key Design Decisions

1. **Serverless Architecture**: Minimizes operational overhead and costs
2. **Bedrock Knowledge Bases**: Automatic text extraction and semantic search without custom ML
3. **Multi-Tenant Design**: Organization-based isolation for data security
4. **Event-Driven Processing**: S3 triggers automatic KB sync
5. **Cost Optimization**: Lifecycle policies, on-demand pricing, serverless components
6. **Property-Based Testing**: Ensures correctness across all input ranges
7. **JWT Authentication**: Stateless, scalable authentication with Cognito
8. **Metadata-First Search**: Fast filtering before semantic search for efficiency

---

*This architecture is designed for scalability, cost-efficiency, and maintainability while providing powerful document management and AI-powered search capabilities.*
