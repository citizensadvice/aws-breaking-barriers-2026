from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_iam as iam,
    Duration,
    CfnOutput
)
from constructs import Construct

class FrontendStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, agent_runtime_arn: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        # Powertools Lambda Layer (Python 3.13, ARM64) - dynamic region
        powertools_layer = lambda_.LayerVersion.from_layer_version_arn(
            self, "PowertoolsLayer",
            layer_version_arn=f"arn:aws:lambda:{self.region}:017000801446:layer:AWSLambdaPowertoolsPythonV3-python313-arm64:28"
        )
        
        # Lambda function to invoke AgentCore
        invoke_agent_fn = lambda_.Function(
            self, "InvokeAgentFunction",
            runtime=lambda_.Runtime.PYTHON_3_13,
            architecture=lambda_.Architecture.ARM_64,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("lambdas/invoke-agent"),
            layers=[powertools_layer],
            timeout=Duration.seconds(300),
            environment={
                "AGENT_RUNTIME_ARN": agent_runtime_arn,
                "POWERTOOLS_SERVICE_NAME": "invoke-agent",
                "LOG_LEVEL": "INFO"
            }
        )
        
        # Grant Lambda permission to invoke AgentCore runtime
        invoke_agent_fn.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock-agentcore:InvokeAgentRuntime"],
                resources=[agent_runtime_arn, f"{agent_runtime_arn}/*"]
            )
        )
        
        # API Gateway REST API
        api = apigw.RestApi(
            self, "AgentAPI",
            rest_api_name="Citizens Advice Agent API",
            description="API for invoking Citizens Advice AgentCore runtime",
            deploy_options=apigw.StageOptions(
                stage_name="prod",
                throttling_rate_limit=100,
                throttling_burst_limit=200
            )
        )
        
        # Lambda integration
        integration = apigw.LambdaIntegration(invoke_agent_fn)
        
        # Add /invoke endpoint with IAM authorization
        api.root.add_resource("invoke").add_method(
            "POST", 
            integration,
            authorization_type=apigw.AuthorizationType.IAM
        )
        
        # Outputs
        CfnOutput(
            self, "ApiUrl",
            value=api.url,
            description="API Gateway endpoint URL"
        )
        
        CfnOutput(
            self, "InvokeEndpoint",
            value=f"{api.url}invoke",
            description="Agent invocation endpoint"
        )
