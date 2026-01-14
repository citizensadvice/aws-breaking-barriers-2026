// AWS Configuration
// Updated with CloudFormation outputs from FrontendStack deployment

export const awsConfig = {
  region: 'us-west-2',
  
  // Cognito
  userPoolId: 'us-west-2_umDTJWvLE',
  userPoolClientId: '5og40gaknd5q8lig9a35iu50vc',
  identityPoolId: 'us-west-2:c7eda12a-5ed9-437f-ba45-5b63260d98d8',
  
  // API Gateway
  apiEndpoint: 'https://v6s441jolb.execute-api.us-west-2.amazonaws.com/prod/invoke',
  
  // AppSync Events
  eventApiEndpoint: 'https://2nn2x675w5hqjjlpkewugmwfei.appsync-api.us-west-2.amazonaws.com/event',
};
