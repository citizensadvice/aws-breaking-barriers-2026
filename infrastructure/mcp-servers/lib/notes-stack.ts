import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { BaseMcpStack } from './base-mcp-stack';
import { Construct } from 'constructs';
import * as fs from 'fs';

const deploymentConfig = JSON.parse(fs.readFileSync('../../deployment-config.json', 'utf-8'));
const DEPLOYMENT_ID = deploymentConfig.deploymentId;

export class NotesStack extends BaseMcpStack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    const notesTableArn = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-NotesTableArn`);
    const notesTableName = cdk.Fn.importValue(`ConciergeAgent-${DEPLOYMENT_ID}-NotesTableName`);

    super(scope, id, {
      ...props,
      mcpName: 'notestools',
      agentCodePath: 'concierge_agent/mcp_notes_tools',
      environmentVariables: {
        NOTES_TABLE_NAME: notesTableName
      },
      additionalPolicies: [
        new iam.PolicyStatement({
          sid: 'DynamoDBAccess',
          effect: iam.Effect.ALLOW,
          actions: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:DeleteItem',
            'dynamodb:Query',
            'dynamodb:Scan'
          ],
          resources: [notesTableArn, `${notesTableArn}/index/*`]
        })
      ]
    });
  }
}
