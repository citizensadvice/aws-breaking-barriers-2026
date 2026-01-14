import * as cdk from 'aws-cdk-lib';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as customResources from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { GatewayConstruct } from './constructs/gateway-construct';
import * as path from 'path';
import * as fs from 'fs';

const sanitizeName = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');

const deploymentConfig = JSON.parse(fs.readFileSync('../../deployment-config.json', 'utf-8'));
const DEPLOYMENT_ID = deploymentConfig.deploymentId;

export class AgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    cdk.Tags.of(this).add('DeploymentId', DEPLOYMENT_ID);

    // Import Cognito from Amplify
    const userPoolId = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Auth-UserPoolId`);
    const clientId = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Auth-ClientId`);
    const cognitoRegion = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Auth-Region`);
    const discoveryUrl = `https://cognito-idp.${cognitoRegion}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`;
    const machineClientId = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Auth-MachineClientId`);

    const userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', userPoolId);

    // Import DynamoDB tables
    const userProfileTableName = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Data-UserProfileTableName`);
    const notesTableName = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-NotesTableName`);
    const feedbackTableName = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-Data-FeedbackTableName`);

    // Import MCP runtime ARN
    const notesRuntimeArn = cdk.Fn.importValue(`NotesStack-${DEPLOYMENT_ID}-RuntimeArn`);

    // OAuth Provider Lambda
    const oauthProviderRole = new iam.Role(this, 'OAuthProviderLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ],
      inlinePolicies: {
        OAuthProviderPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock-agentcore:CreateOAuth2CredentialProvider',
                'bedrock-agentcore:DeleteOAuth2CredentialProvider',
                'bedrock-agentcore:ListOAuth2CredentialProviders',
                'bedrock-agentcore:GetOAuth2CredentialProvider',
                'bedrock-agentcore:CreateTokenVault',
                'bedrock-agentcore:DeleteTokenVault',
                'bedrock-agentcore:GetTokenVault',
                'secretsmanager:CreateSecret',
                'secretsmanager:DeleteSecret',
                'secretsmanager:GetSecretValue',
                'secretsmanager:PutSecretValue',
                'cognito-idp:DescribeUserPoolClient'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    const oauthProviderLambda = new lambda.Function(this, 'OAuthProviderLambda', {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambdas', 'oauth-provider')),
      timeout: cdk.Duration.minutes(5),
      role: oauthProviderRole,
    });

    const oauthProvider = new customResources.Provider(this, 'OAuthProvider', {
      onEventHandler: oauthProviderLambda
    });

    const oauthCredentialProvider = new cdk.CustomResource(this, 'OAuthCredentialProvider', {
      serviceToken: oauthProvider.serviceToken,
      properties: {
        ProviderName: sanitizeName(`oauth_provider_${this.stackName}`),
        UserPoolId: userPoolId,
        ClientId: machineClientId,
        DiscoveryUrl: discoveryUrl,
        Version: '2'
      }
    });

    const oauthProviderArn = oauthCredentialProvider.getAttString('ProviderArn');

    // Memory
    const memory = new agentcore.Memory(this, 'Memory', {
      memoryName: sanitizeName(`memory_${this.stackName}`),
      description: 'Memory for Citizens Advice Agent',
    });

    // Agent execution role
    const agentRole = new iam.Role(this, 'AgentRole', {
      assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com'),
    });

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:Scan', 'dynamodb:UpdateItem', 'dynamodb:Query', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:BatchWriteItem'],
      resources: [
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${userProfileTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${userProfileTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${notesTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${notesTableName}/index/*`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${feedbackTableName}`,
        `arn:aws:dynamodb:${this.region}:${this.account}:table/${feedbackTableName}/index/*`
      ]
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:*`]
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'bedrock-agentcore:GetMemory',
        'bedrock-agentcore:ListMemories',
        'bedrock-agentcore:CreateEvent',
        'bedrock-agentcore:GetEvent',
        'bedrock-agentcore:ListEvents',
        'bedrock-agentcore:RetrieveMemoryRecords'
      ],
      resources: [memory.memoryArn]
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [
        `arn:aws:bedrock:*::foundation-model/*`,
        `arn:aws:bedrock:*:${this.account}:inference-profile/*`
      ]
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['bedrock-agentcore:InvokeGateway'],
      resources: ['*']
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ecr:GetAuthorizationToken', 'ecr:BatchCheckLayerAvailability', 'ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage'],
      resources: ['*']
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:DescribeUserPoolClient', 'cognito-idp:DescribeUserPool'],
      resources: [`arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${userPoolId}`]
    }));

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/citizens-advice-agent/${DEPLOYMENT_ID}/*`]
    }));

    // Agent runtime
    const runtime = new agentcore.Runtime(this, 'Runtime', {
      runtimeName: sanitizeName(`agent_${this.stackName}`),
      agentRuntimeArtifact: agentcore.AgentRuntimeArtifact.fromAsset(
        path.join(__dirname, '../../..', 'concierge_agent', 'supervisor_agent')
      ),
      executionRole: agentRole,
      protocolConfiguration: agentcore.ProtocolType.HTTP,
      networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
      authorizerConfiguration: agentcore.RuntimeAuthorizerConfiguration.usingJWT(
        discoveryUrl,
        [clientId, machineClientId]
      ),
      environmentVariables: {
        MEMORY_ID: memory.memoryId,
        USER_PROFILE_TABLE_NAME: userProfileTableName,
        NOTES_TABLE_NAME: notesTableName,
        FEEDBACK_TABLE_NAME: feedbackTableName,
        DEPLOYMENT_ID: DEPLOYMENT_ID,
        GATEWAY_CLIENT_ID: machineClientId,
        GATEWAY_USER_POOL_ID: userPoolId,
        GATEWAY_SCOPE: 'citizens-advice-gateway/invoke',
      },
      description: 'Citizens Advice Agent Runtime'
    });

    // Gateway
    const gateway = new GatewayConstruct(this, 'Gateway', {
      gatewayName: sanitizeName(`gateway_${this.stackName}`).replace(/_/g, '-'),
      mcpRuntimeArns: [
        { name: 'NotesTools', arn: notesRuntimeArn }
      ],
      cognitoClientId: machineClientId,
      cognitoDiscoveryUrl: discoveryUrl,
      oauthProviderArn: oauthProviderArn,
      oauthScope: 'citizens-advice-gateway/invoke'
    });

    const gatewayUrlParameter = new cdk.aws_ssm.StringParameter(this, 'GatewayUrlParameter', {
      parameterName: `/citizens-advice-agent/${DEPLOYMENT_ID}/gateway-url`,
      stringValue: gateway.gatewayUrl,
      tier: cdk.aws_ssm.ParameterTier.STANDARD,
    });

    agentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [gatewayUrlParameter.parameterArn]
    }));

    // Outputs
    new cdk.CfnOutput(this, 'RuntimeArn', { value: runtime.agentRuntimeArn, exportName: `${this.stackName}-RuntimeArn` });
    new cdk.CfnOutput(this, 'RuntimeId', { value: runtime.agentRuntimeId, exportName: `${this.stackName}-RuntimeId` });
    new cdk.CfnOutput(this, 'MemoryId', { value: memory.memoryId, exportName: `${this.stackName}-MemoryId` });
    new cdk.CfnOutput(this, 'GatewayUrl', { value: gateway.gatewayUrl, exportName: `${this.stackName}-GatewayUrl` });
    new cdk.CfnOutput(this, 'GatewayId', { value: gateway.gatewayId, exportName: `${this.stackName}-GatewayId` });
  }
}
