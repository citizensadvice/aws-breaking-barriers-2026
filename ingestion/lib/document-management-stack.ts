import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class DocumentManagementStack extends cdk.Stack {
  public readonly documentsBucket: s3.IBucket;
  public readonly documentsTable: dynamodb.Table;
  public readonly lambdaExecutionRole: iam.Role;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly opensearchCollection: opensearchserverless.CfnCollection;
  public readonly bedrockKnowledgeBaseRole: iam.Role;
  public readonly knowledgeBase: bedrock.CfnKnowledgeBase;
  public readonly knowledgeBaseDataSource: bedrock.CfnDataSource;
  public readonly api: apigateway.RestApi;
  public readonly documentLambda: lambdaNodejs.NodejsFunction;
  public readonly searchLambda: lambdaNodejs.NodejsFunction;
  public readonly conversionLambda: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing S3 Bucket for document storage
    this.documentsBucket = s3.Bucket.fromBucketName(
      this,
      'DocumentsBucket',
      'knowledgebasestack-localdatabucket845b62cf-msc8u27pzhzf'
    );

    // DynamoDB Table for document metadata
    this.documentsTable = new dynamodb.Table(this, 'DocumentsTable', {
      // Let CDK generate a unique table name
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
    });

    // GSI1: Query by organization and user
    this.documentsTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Query by organization and location
    this.documentsTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // IAM Role for Lambda functions
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: 'DocumentManagementLambdaRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant Lambda role access to S3 bucket
    this.documentsBucket.grantReadWrite(this.lambdaExecutionRole);

    // Grant Lambda role access to DynamoDB table
    this.documentsTable.grantReadWriteData(this.lambdaExecutionRole);

    // Additional policy for Bedrock Knowledge Base operations
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:Retrieve',
        'bedrock:RetrieveAndGenerate',
      ],
      resources: ['*'],
    }));

    // Cognito User Pool for authentication
    this.userPool = new cognito.UserPool(this, 'DocumentManagementUserPool', {
      userPoolName: 'DocumentManagementUserPool',
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        organizationId: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 256,
        }),
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 50,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Client for JWT authentication
    this.userPoolClient = this.userPool.addClient('DocumentManagementAppClient', {
      userPoolClientName: 'DocumentManagementAppClient',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true })
        .withCustomAttributes('organizationId', 'role'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true }),
    });

    // IAM Role for Bedrock Knowledge Base
    this.bedrockKnowledgeBaseRole = new iam.Role(this, 'BedrockKnowledgeBaseRole', {
      roleName: 'BedrockKnowledgeBaseRole',
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'IAM role for Bedrock Knowledge Base to access S3 and OpenSearch Serverless',
    });

    // Grant Bedrock KB role access to S3 bucket
    this.documentsBucket.grantRead(this.bedrockKnowledgeBaseRole);

    // OpenSearch Serverless encryption policy (required before collection)
    const encryptionPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'OpenSearchEncryptionPolicy', {
      name: 'doc-mgmt-encryption-policy',
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: ['collection/doc-mgmt-kb-collection'],
          },
        ],
        AWSOwnedKey: true,
      }),
    });

    // OpenSearch Serverless network policy (required before collection)
    const networkPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'OpenSearchNetworkPolicy', {
      name: 'doc-mgmt-network-policy',
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: ['collection/doc-mgmt-kb-collection'],
            },
            {
              ResourceType: 'dashboard',
              Resource: ['collection/doc-mgmt-kb-collection'],
            },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    // OpenSearch Serverless collection for vector search
    this.opensearchCollection = new opensearchserverless.CfnCollection(this, 'OpenSearchCollection', {
      name: 'doc-mgmt-kb-collection',
      type: 'VECTORSEARCH',
      description: 'Vector search collection for Bedrock Knowledge Base document embeddings',
    });

    // Ensure policies are created before the collection
    this.opensearchCollection.addDependency(encryptionPolicy);
    this.opensearchCollection.addDependency(networkPolicy);

    // Add OpenSearch Serverless permissions to Bedrock KB role
    this.bedrockKnowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'aoss:APIAccessAll',
      ],
      resources: [
        `arn:aws:aoss:${this.region}:${this.account}:collection/*`,
      ],
    }));

    // Add Bedrock model invocation permissions to KB role
    this.bedrockKnowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
        // Claude model for semantic chunking
        `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
      ],
    }));

    // Custom Resource Lambda to create OpenSearch Serverless vector index
    const createIndexLambda = new lambdaNodejs.NodejsFunction(this, 'CreateOpenSearchIndexLambda', {
      functionName: 'DocumentManagementCreateOpenSearchIndex',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/custom-resource/create-opensearch-index.ts'),
      timeout: cdk.Duration.minutes(10), // Increased timeout for retries
      memorySize: 256,
      environment: {
        INDEX_NAME: 'bedrock-knowledge-base-index',
        COLLECTION_ENDPOINT: this.opensearchCollection.attrCollectionEndpoint,
      },
      bundling: {
        externalModules: ['@aws-sdk/credential-provider-node'],
        forceDockerBundling: false,
      },
    });

    // Grant the Lambda permission to access OpenSearch Serverless
    createIndexLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['aoss:APIAccessAll'],
      resources: [`arn:aws:aoss:${this.region}:${this.account}:collection/*`],
    }));

    // Update the data access policy to include the custom resource Lambda
    const dataAccessPolicyWithLambda = new opensearchserverless.CfnAccessPolicy(this, 'OpenSearchDataAccessPolicyWithLambda', {
      name: 'doc-mgmt-data-access-policy-v2',
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: ['collection/doc-mgmt-kb-collection'],
              Permission: [
                'aoss:CreateCollectionItems',
                'aoss:DeleteCollectionItems',
                'aoss:UpdateCollectionItems',
                'aoss:DescribeCollectionItems',
              ],
            },
            {
              ResourceType: 'index',
              Resource: ['index/doc-mgmt-kb-collection/*'],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
              ],
            },
          ],
          Principal: [
            this.bedrockKnowledgeBaseRole.roleArn,
            this.lambdaExecutionRole.roleArn,
            createIndexLambda.role!.roleArn,
          ],
        },
      ]),
    });
    dataAccessPolicyWithLambda.addDependency(this.opensearchCollection);

    // Custom Resource Provider
    const createIndexProvider = new cr.Provider(this, 'CreateOpenSearchIndexProvider', {
      onEventHandler: createIndexLambda,
      logRetention: logs.RetentionDays.ONE_DAY,
    });

    // Custom Resource to create the index
    const createIndexResource = new cdk.CustomResource(this, 'CreateOpenSearchIndex', {
      serviceToken: createIndexProvider.serviceToken,
      properties: {
        // Add a property to force update if needed
        IndexName: 'bedrock-knowledge-base-index',
        CollectionEndpoint: this.opensearchCollection.attrCollectionEndpoint,
      },
    });

    // Ensure index is created after collection and access policy
    createIndexResource.node.addDependency(this.opensearchCollection);
    createIndexResource.node.addDependency(dataAccessPolicyWithLambda);

    // Bedrock Knowledge Base
    this.knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'DocumentKnowledgeBase', {
      name: 'DocumentManagementKnowledgeBase',
      description: 'Knowledge base for document management system with semantic search capabilities',
      roleArn: this.bedrockKnowledgeBaseRole.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v2:0`,
          embeddingModelConfiguration: {
            bedrockEmbeddingModelConfiguration: {
              dimensions: 1024,
            },
          },
        },
      },
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
        opensearchServerlessConfiguration: {
          collectionArn: this.opensearchCollection.attrArn,
          vectorIndexName: 'bedrock-knowledge-base-index',
          fieldMapping: {
            vectorField: 'bedrock-knowledge-base-vector',
            textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
            metadataField: 'AMAZON_BEDROCK_METADATA',
          },
        },
      },
    });

    // Ensure Knowledge Base is created after OpenSearch collection AND index
    // Using both node dependency and CFN dependency for reliability
    this.knowledgeBase.addDependency(this.opensearchCollection);
    this.knowledgeBase.node.addDependency(createIndexResource);
    
    // Add explicit CFN-level dependency on the custom resource
    const cfnCreateIndex = createIndexResource.node.defaultChild as cdk.CfnResource;
    if (cfnCreateIndex) {
      this.knowledgeBase.addDependency(cfnCreateIndex);
    }

    // S3 Data Source for Knowledge Base
    this.knowledgeBaseDataSource = new bedrock.CfnDataSource(this, 'DocumentDataSource', {
      name: 'DocumentS3DataSource',
      description: 'S3 data source for document ingestion',
      knowledgeBaseId: this.knowledgeBase.attrKnowledgeBaseId,
      dataSourceConfiguration: {
        type: 'S3',
        s3Configuration: {
          bucketArn: this.documentsBucket.bucketArn,
          // No inclusionPrefixes means all documents in the bucket are included
        },
      },
      vectorIngestionConfiguration: {
        chunkingConfiguration: {
          chunkingStrategy: 'FIXED_SIZE',
          fixedSizeChunkingConfiguration: {
            maxTokens: 300,
            overlapPercentage: 20,
          },
        },
      },
    });

    // Add permissions for Bedrock KB role to list and get objects from S3
    this.bedrockKnowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
      ],
      resources: [
        this.documentsBucket.bucketArn,
      ],
    }));

    // Add Lambda permissions to start ingestion jobs
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:StartIngestionJob',
        'bedrock:GetIngestionJob',
        'bedrock:ListIngestionJobs',
      ],
      resources: [
        `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/*`,
      ],
    }));

    // Lambda Functions
    // Document Lambda - handles document CRUD operations
    this.documentLambda = new lambdaNodejs.NodejsFunction(this, 'DocumentLambda', {
      functionName: 'DocumentManagementDocumentHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/document/handler.ts'),
      role: this.lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DOCUMENTS_BUCKET_NAME: this.documentsBucket.bucketName,
        DOCUMENTS_TABLE_NAME: this.documentsTable.tableName,
        KNOWLEDGE_BASE_ID: this.knowledgeBase.attrKnowledgeBaseId,
        DATA_SOURCE_ID: this.knowledgeBaseDataSource.attrDataSourceId,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
      },
    });

    // Search Lambda - handles metadata and semantic search
    this.searchLambda = new lambdaNodejs.NodejsFunction(this, 'SearchLambda', {
      functionName: 'DocumentManagementSearchHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/search/handler.ts'),
      role: this.lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DOCUMENTS_TABLE_NAME: this.documentsTable.tableName,
        KNOWLEDGE_BASE_ID: this.knowledgeBase.attrKnowledgeBaseId,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
      },
    });

    // Conversion Lambda - handles Google Docs and PowerPoint conversion
    this.conversionLambda = new lambdaNodejs.NodejsFunction(this, 'ConversionLambda', {
      functionName: 'DocumentManagementConversionHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda/conversion/handler.ts'),
      role: this.lambdaExecutionRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        DOCUMENTS_BUCKET_NAME: this.documentsBucket.bucketName,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
        forceDockerBundling: false,
      },
    });

    // Add permission for Document Lambda to invoke Conversion Lambda
    // Using addToPolicy instead of grantInvoke to avoid cyclic dependency
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [`arn:aws:lambda:${this.region}:${this.account}:function:DocumentManagementConversionHandler`],
    }));

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'DocumentManagementApi', {
      restApiName: 'Document Management API',
      description: 'REST API for document management operations',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer for API Gateway
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      authorizerName: 'DocumentManagementAuthorizer',
      cognitoUserPools: [this.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Lambda integrations
    const documentIntegration = new apigateway.LambdaIntegration(this.documentLambda, {
      proxy: true,
    });

    const searchIntegration = new apigateway.LambdaIntegration(this.searchLambda, {
      proxy: true,
    });

    // Authorization options for protected endpoints
    const authOptions: apigateway.MethodOptions = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // API Resources and Methods
    // /documents resource
    const documentsResource = this.api.root.addResource('documents');
    
    // POST /documents - Upload document
    documentsResource.addMethod('POST', documentIntegration, authOptions);
    
    // GET /documents - List documents
    documentsResource.addMethod('GET', documentIntegration, authOptions);

    // /documents/{id} resource
    const documentByIdResource = documentsResource.addResource('{id}');
    
    // GET /documents/{id} - Get document by ID
    documentByIdResource.addMethod('GET', documentIntegration, authOptions);
    
    // PUT /documents/{id} - Update document
    documentByIdResource.addMethod('PUT', documentIntegration, authOptions);
    
    // DELETE /documents/{id} - Delete document
    documentByIdResource.addMethod('DELETE', documentIntegration, authOptions);

    // /documents/{id}/metadata resource
    const metadataResource = documentByIdResource.addResource('metadata');
    
    // PATCH /documents/{id}/metadata - Update metadata only
    metadataResource.addMethod('PATCH', documentIntegration, authOptions);

    // /search resource
    const searchResource = this.api.root.addResource('search');
    
    // POST /search - Metadata search
    searchResource.addMethod('POST', searchIntegration, authOptions);

    // /search/semantic resource
    const semanticSearchResource = searchResource.addResource('semantic');
    
    // POST /search/semantic - Semantic search via Bedrock KB
    semanticSearchResource.addMethod('POST', searchIntegration, authOptions);

    // Outputs
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: this.documentsBucket.bucketName,
      description: 'S3 bucket for document storage',
    });

    new cdk.CfnOutput(this, 'DocumentsTableName', {
      value: this.documentsTable.tableName,
      description: 'DynamoDB table for document metadata',
    });

    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'IAM role ARN for Lambda functions',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'OpenSearchCollectionEndpoint', {
      value: this.opensearchCollection.attrCollectionEndpoint,
      description: 'OpenSearch Serverless collection endpoint',
    });

    new cdk.CfnOutput(this, 'OpenSearchCollectionArn', {
      value: this.opensearchCollection.attrArn,
      description: 'OpenSearch Serverless collection ARN',
    });

    new cdk.CfnOutput(this, 'BedrockKnowledgeBaseRoleArn', {
      value: this.bedrockKnowledgeBaseRole.roleArn,
      description: 'IAM role ARN for Bedrock Knowledge Base',
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {
      value: this.knowledgeBase.attrKnowledgeBaseId,
      description: 'Bedrock Knowledge Base ID',
    });

    new cdk.CfnOutput(this, 'KnowledgeBaseArn', {
      value: this.knowledgeBase.attrKnowledgeBaseArn,
      description: 'Bedrock Knowledge Base ARN',
    });

    new cdk.CfnOutput(this, 'DataSourceId', {
      value: this.knowledgeBaseDataSource.attrDataSourceId,
      description: 'Bedrock Knowledge Base Data Source ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiGatewayId', {
      value: this.api.restApiId,
      description: 'API Gateway REST API ID',
    });

    new cdk.CfnOutput(this, 'DocumentLambdaArn', {
      value: this.documentLambda.functionArn,
      description: 'Document Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'SearchLambdaArn', {
      value: this.searchLambda.functionArn,
      description: 'Search Lambda function ARN',
    });

    new cdk.CfnOutput(this, 'ConversionLambdaArn', {
      value: this.conversionLambda.functionArn,
      description: 'Conversion Lambda function ARN',
    });
  }
}
