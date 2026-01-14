import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DocumentManagementStack } from '../lib/document-management-stack';

describe('DocumentManagementStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new DocumentManagementStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('Stack creates successfully', () => {
    expect(template.toJSON()).toBeDefined();
  });

  test('Stack uses existing S3 bucket', () => {
    // Since we're importing an existing bucket, it won't appear in the CloudFormation template
    // We can verify the stack was created successfully instead
    expect(template.toJSON()).toBeDefined();
    
    // Verify Lambda functions have the bucket name in their environment
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'DocumentManagementDocumentHandler',
      Environment: {
        Variables: Match.objectLike({
          DOCUMENTS_BUCKET_NAME: 'knowledgebasestack-localdatabucket845b62cf-msc8u27pzhzf',
        }),
      },
    });
  });

  test('DynamoDB table is created with on-demand billing', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
    });
  });

  test('DynamoDB table has GSI1 for organization/user queries', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'GSI1',
          KeySchema: [
            { AttributeName: 'GSI1PK', KeyType: 'HASH' },
            { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
          ],
        }),
      ]),
    });
  });

  test('DynamoDB table has GSI2 for organization/location queries', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'GSI2',
          KeySchema: [
            { AttributeName: 'GSI2PK', KeyType: 'HASH' },
            { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
          ],
        }),
      ]),
    });
  });

  test('Lambda execution role is created', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: 'DocumentManagementLambdaRole',
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          }),
        ]),
      },
    });
  });

  test('Cognito User Pool is created with custom attributes', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'DocumentManagementUserPool',
      Schema: Match.arrayWith([
        Match.objectLike({
          Name: 'organizationId',
          AttributeDataType: 'String',
          Mutable: true,
        }),
        Match.objectLike({
          Name: 'role',
          AttributeDataType: 'String',
          Mutable: true,
        }),
      ]),
    });
  });

  test('Cognito User Pool Client is created for JWT authentication', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: 'DocumentManagementAppClient',
      ExplicitAuthFlows: Match.arrayWith([
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
      ]),
      GenerateSecret: false,
    });
  });
});
