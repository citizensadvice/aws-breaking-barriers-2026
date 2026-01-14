import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnOutput } from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { UserPoolResourceServer, ResourceServerScope, UserPoolClient, OAuthScope, UserPoolDomain } from 'aws-cdk-lib/aws-cognito';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', 'deployment-config.json');
const deploymentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const deploymentId = deploymentConfig.deploymentId;

const backend = defineBackend({
  auth,
  data,
});

// Create resource server for machine-to-machine authentication
const resourceServer = new UserPoolResourceServer(backend.stack, 'GatewayResourceServer', {
  userPool: backend.auth.resources.userPool,
  identifier: 'citizens-advice-gateway',
  userPoolResourceServerName: 'citizens-advice-gateway-resource-server',
  scopes: [
    new ResourceServerScope({
      scopeName: 'invoke',
      scopeDescription: 'Invoke gateway and targets',
    }),
  ],
});

// Create machine client for gateway OAuth authentication
const machineClient = new UserPoolClient(backend.stack, 'GatewayMachineClient', {
  userPool: backend.auth.resources.userPool,
  userPoolClientName: 'citizens-advice-gateway-machine-client',
  generateSecret: true,
  oAuth: {
    flows: {
      clientCredentials: true,
    },
    scopes: [
      OAuthScope.resourceServer(
        resourceServer,
        new ResourceServerScope({
          scopeName: 'invoke',
          scopeDescription: 'Invoke gateway and targets',
        })
      ),
    ],
  },
});
machineClient.node.addDependency(resourceServer);

// Add Cognito domain for OAuth token endpoint
const userPoolDomain = new UserPoolDomain(backend.stack, 'CognitoDomain', {
  userPool: backend.auth.resources.userPool,
  cognitoDomain: {
    domainPrefix: `citizens-advice-${deploymentId}-${backend.stack.account}`,
  },
});

// Export Cognito configuration
new CfnOutput(backend.stack, 'UserPoolIdExport', {
  value: backend.auth.resources.userPool.userPoolId,
  exportName: `ConciergeAgent-${deploymentId}-Auth-UserPoolId`,
});

new CfnOutput(backend.stack, 'ClientIdExport', {
  value: backend.auth.resources.userPoolClient.userPoolClientId,
  exportName: `ConciergeAgent-${deploymentId}-Auth-ClientId`,
});

new CfnOutput(backend.stack, 'RegionExport', {
  value: backend.stack.region,
  exportName: `ConciergeAgent-${deploymentId}-Auth-Region`,
});

new CfnOutput(backend.stack, 'MachineClientIdExport', {
  value: machineClient.userPoolClientId,
  exportName: `ConciergeAgent-${deploymentId}-Auth-MachineClientId`,
});

// Table exports
new CfnOutput(backend.stack, 'UserProfileTableNameExport', {
  value: backend.data.resources.tables['UserProfile'].tableName,
  exportName: `ConciergeAgent-${deploymentId}-Data-UserProfileTableName`,
});

new CfnOutput(backend.stack, 'NotesTableNameExport', {
  value: backend.data.resources.tables['Notes'].tableName,
  exportName: `ConciergeAgent-${deploymentId}-NotesTableName`,
});

new CfnOutput(backend.stack, 'NotesTableArnExport', {
  value: backend.data.resources.tables['Notes'].tableArn,
  exportName: `ConciergeAgent-${deploymentId}-NotesTableArn`,
});

new CfnOutput(backend.stack, 'LocalBureauTableNameExport', {
  value: backend.data.resources.tables['LocalBureau'].tableName,
  exportName: `ConciergeAgent-${deploymentId}-LocalBureauTableName`,
});

new CfnOutput(backend.stack, 'FeedbackTableNameExport', {
  value: backend.data.resources.tables['Feedback'].tableName,
  exportName: `ConciergeAgent-${deploymentId}-Data-FeedbackTableName`,
});
