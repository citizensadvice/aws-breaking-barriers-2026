// AWS Configuration Example
// Copy this file to config.ts and update with your CloudFormation outputs

export const awsConfig = {
  region: 'us-west-2', // Your AWS region
  
  // Cognito - from FrontendStack outputs
  userPoolId: 'YOUR_USER_POOL_ID',           // FrontendStack.UserPoolId
  userPoolClientId: 'YOUR_CLIENT_ID',        // FrontendStack.UserPoolClientId
  identityPoolId: 'YOUR_IDENTITY_POOL_ID',   // FrontendStack.IdentityPoolId
  
  // API Gateway - from FrontendStack outputs
  apiEndpoint: 'YOUR_API_ENDPOINT',          // FrontendStack.InvokeEndpoint
  
  // AppSync Events - from FrontendStack outputs
  eventApiEndpoint: 'YOUR_EVENT_ENDPOINT',   // FrontendStack.EventApiHttpEndpoint
};
