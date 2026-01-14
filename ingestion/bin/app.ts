#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DocumentManagementStack } from '../lib/document-management-stack';

const app = new cdk.App();

new DocumentManagementStack(app, 'DocumentManagementStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Document Management Backend - Serverless document storage with Bedrock Knowledge Base integration',
});
