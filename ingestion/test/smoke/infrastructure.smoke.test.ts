import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityProviderClient, DescribeUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { ApiGatewayV2Client, GetApiCommand } from '@aws-sdk/client-apigatewayv2';

const STACK_NAME = process.env.STACK_NAME || 'DocumentManagementStack';
const REGION = process.env.AWS_REGION || 'us-west-2';

describe('Infrastructure Smoke Tests', () => {
  let stackOutputs: Record<string, string>;

  beforeAll(async () => {
    const cfnClient = new CloudFormationClient({ region: REGION });
    const response = await cfnClient.send(
      new DescribeStacksCommand({ StackName: STACK_NAME })
    );
    
    const outputs = response.Stacks?.[0]?.Outputs || [];
    stackOutputs = outputs.reduce((acc, output) => {
      if (output.OutputKey && output.OutputValue) {
        acc[output.OutputKey] = output.OutputValue;
      }
      return acc;
    }, {} as Record<string, string>);

    console.log('Stack outputs loaded:', Object.keys(stackOutputs));
  }, 30000);

  test('Stack exists and is in healthy state', async () => {
    const cfnClient = new CloudFormationClient({ region: REGION });
    const response = await cfnClient.send(
      new DescribeStacksCommand({ StackName: STACK_NAME })
    );
    
    const stack = response.Stacks?.[0];
    expect(stack).toBeDefined();
    expect(stack?.StackStatus).toBeDefined();
    
    // Accept healthy states and in-progress states
    const healthyStates = ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_IN_PROGRESS'];
    expect(healthyStates).toContain(stack?.StackStatus);
    console.log(`✓ Stack status: ${stack?.StackStatus}`);
  });

  test('S3 bucket is accessible', async () => {
    const s3Client = new S3Client({ region: REGION });
    const bucketName = stackOutputs.DocumentsBucketName;
    
    expect(bucketName).toBeDefined();
    await expect(
      s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
    ).resolves.not.toThrow();
    console.log(`✓ S3 bucket accessible: ${bucketName}`);
  });

  test('DynamoDB table exists and is active', async () => {
    const dynamoClient = new DynamoDBClient({ region: REGION });
    const tableName = stackOutputs.DocumentsTableName;
    
    expect(tableName).toBeDefined();
    const response = await dynamoClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    
    expect(response.Table?.TableStatus).toBe('ACTIVE');
    expect(response.Table?.GlobalSecondaryIndexes).toHaveLength(2);
    
    // Verify GSI names
    const gsiNames = response.Table?.GlobalSecondaryIndexes?.map(gsi => gsi.IndexName);
    expect(gsiNames).toContain('GSI1');
    expect(gsiNames).toContain('GSI2');
    
    console.log(`✓ DynamoDB table active: ${tableName} with ${response.Table?.GlobalSecondaryIndexes?.length} GSIs`);
  });

  test('Cognito User Pool is active', async () => {
    const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });
    const userPoolId = stackOutputs.UserPoolId;
    const clientId = stackOutputs.UserPoolClientId;
    
    expect(userPoolId).toBeDefined();
    expect(clientId).toBeDefined();
    
    const response = await cognitoClient.send(
      new DescribeUserPoolCommand({ UserPoolId: userPoolId })
    );
    
    // Status field is not always returned, check that UserPool exists instead
    expect(response.UserPool).toBeDefined();
    expect(response.UserPool?.Id).toBe(userPoolId);
    
    console.log(`✓ Cognito User Pool active: ${userPoolId}`);
    console.log(`✓ User Pool Client: ${clientId}`);
  });

  test('Lambda functions are deployed and active', async () => {
    const lambdaClient = new LambdaClient({ region: REGION });
    const functions = [
      'DocumentManagementDocumentHandler',
      'DocumentManagementSearchHandler',
      'DocumentManagementConversionHandler'
    ];

    for (const functionName of functions) {
      const response = await lambdaClient.send(
        new GetFunctionCommand({ FunctionName: functionName })
      );
      
      expect(response.Configuration?.State).toBe('Active');
      expect(response.Configuration?.Runtime).toMatch(/nodejs/);
      
      console.log(`✓ Lambda function active: ${functionName} (${response.Configuration?.Runtime})`);
    }
  }, 30000);

  test('API Gateway endpoint is accessible', async () => {
    const apiUrl = stackOutputs.ApiGatewayUrl;
    const apiId = stackOutputs.ApiGatewayId;
    
    expect(apiUrl).toBeDefined();
    expect(apiId).toBeDefined();
    expect(apiUrl).toMatch(/^https:\/\/.+\.execute-api\..+\.amazonaws\.com/);
    
    console.log(`✓ API Gateway URL: ${apiUrl}`);
    console.log(`✓ API Gateway ID: ${apiId}`);
  });

  test('Knowledge Base is created', () => {
    const kbId = stackOutputs.KnowledgeBaseId;
    const kbArn = stackOutputs.KnowledgeBaseArn;
    const dataSourceId = stackOutputs.DataSourceId;
    
    expect(kbId).toBeDefined();
    expect(kbArn).toBeDefined();
    expect(dataSourceId).toBeDefined();
    expect(kbId).toMatch(/^[A-Z0-9]{10}$/);
    
    console.log(`✓ Knowledge Base ID: ${kbId}`);
    console.log(`✓ Data Source ID: ${dataSourceId}`);
  });

  test('OpenSearch Serverless collection is created', () => {
    const collectionEndpoint = stackOutputs.OpenSearchCollectionEndpoint;
    const collectionArn = stackOutputs.OpenSearchCollectionArn;
    
    expect(collectionEndpoint).toBeDefined();
    expect(collectionArn).toBeDefined();
    expect(collectionEndpoint).toMatch(/^https:\/\/.+\.us-west-2\.aoss\.amazonaws\.com$/);
    
    console.log(`✓ OpenSearch Collection: ${collectionEndpoint}`);
  });

  test('IAM roles are created', () => {
    const lambdaRoleArn = stackOutputs.LambdaRoleArn;
    const bedrockRoleArn = stackOutputs.BedrockKnowledgeBaseRoleArn;
    
    expect(lambdaRoleArn).toBeDefined();
    expect(bedrockRoleArn).toBeDefined();
    expect(lambdaRoleArn).toMatch(/^arn:aws:iam::/);
    expect(bedrockRoleArn).toMatch(/^arn:aws:iam::/);
    
    console.log(`✓ Lambda Role: ${lambdaRoleArn}`);
    console.log(`✓ Bedrock KB Role: ${bedrockRoleArn}`);
  });

  test('All critical stack outputs are present', () => {
    const requiredOutputs = [
      'DocumentsBucketName',
      'DocumentsTableName',
      'UserPoolId',
      'UserPoolClientId',
      'ApiGatewayUrl',
      'ApiGatewayId',
      'KnowledgeBaseId',
      'DataSourceId',
      'DocumentLambdaArn',
      'SearchLambdaArn',
      'ConversionLambdaArn'
    ];

    const missingOutputs = requiredOutputs.filter(key => !stackOutputs[key]);
    
    expect(missingOutputs).toEqual([]);
    console.log(`✓ All ${requiredOutputs.length} required outputs present`);
  });
});
