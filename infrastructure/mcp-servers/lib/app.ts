#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import { NotesStack } from './notes-stack';

const deploymentConfig = JSON.parse(fs.readFileSync('../../deployment-config.json', 'utf-8'));
const DEPLOYMENT_ID = deploymentConfig.deploymentId;

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

new NotesStack(app, `NotesStack-${DEPLOYMENT_ID}`, {
  env,
  description: `Notes MCP Server - User notes management (${DEPLOYMENT_ID})`
});

app.synth();
