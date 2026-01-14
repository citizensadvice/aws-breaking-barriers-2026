from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_appsync as appsync,
    aws_iam as iam,
    aws_sqs as sqs,
    aws_lambda_event_sources as lambda_event_sources,
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
        
        # ===== Direct Bedrock AgentCore Integration with Streaming =====
        
        # IAM Role for API Gateway to invoke Bedrock AgentCore
        direct_api_role = iam.Role(
            self, "DirectApiGatewayInvokeRole",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com"),
            inline_policies={
                "InvokeBedrockAgentCorePolicy": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            actions=["bedrock-agentcore:InvokeAgentRuntime"],
                            resources=[agent_runtime_arn, f"{agent_runtime_arn}/*"]
                        )
                    ]
                )
            }
        )
        
        # Create second REST API for direct streaming invocation
        direct_api = apigw.RestApi(
            self, "DirectBedrockAgentApi",
            rest_api_name="Citizens Advice Direct Streaming API",
            description="Direct invocation of Bedrock AgentCore Runtime with streaming support",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
            )
        )
        
        # Add /invoke resource
        direct_invoke_resource = direct_api.root.add_resource("invoke")
        
        # Outputs for direct API
        CfnOutput(
            self, "DirectApiUrl",
            value=direct_api.url,
            description="Direct streaming API Gateway endpoint URL"
        )
        
        CfnOutput(
            self, "DirectInvokeEndpoint",
            value=f"{direct_api.url}invoke",
            description="Direct streaming agent invocation endpoint"
        )
        
        # ===== AppSync Events API for Streaming =====
        
        # Create AppSync Event API with IAM-only auth
        iam_provider = appsync.AppSyncAuthProvider(
            authorization_type=appsync.AppSyncAuthorizationType.IAM
        )
        
        event_api = appsync.EventApi(
            self, "AgentStreamingEventApi",
            api_name="citizens-advice-streaming-events",
            authorization_config=appsync.EventApiAuthConfig(
                auth_providers=[iam_provider],
                connection_auth_mode_types=[appsync.AppSyncAuthorizationType.IAM],
                default_publish_auth_mode_types=[appsync.AppSyncAuthorizationType.IAM],
                default_subscribe_auth_mode_types=[appsync.AppSyncAuthorizationType.IAM]
            )
        )
        
        # Add chat channel namespace for streaming responses
        event_api.add_channel_namespace("chat")
        
        # ===== SQS Queue for Buffering =====
        
        # Create SQS queue for agent requests
        agent_request_queue = sqs.Queue(
            self, "AgentRequestQueue",
            queue_name="citizens-advice-agent-requests",
            visibility_timeout=Duration.seconds(300),  # Match Lambda timeout
            retention_period=Duration.days(4)
        )
        
        # ===== Streaming Lambda Function =====
        
        # Create Lambda role with Bedrock and AppSync permissions
        streaming_lambda_role = iam.Role(
            self, "StreamingLambdaRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole")
            ]
        )
        
        # Grant Bedrock AgentCore permissions
        streaming_lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock-agentcore:InvokeAgentRuntime"],
                resources=[agent_runtime_arn, f"{agent_runtime_arn}/*"]
            )
        )
        
        # Grant AppSync Events permissions
        streaming_lambda_role.add_to_policy(
            iam.PolicyStatement(
                actions=["appsync:EventPublish"],
                resources=[f"{event_api.api_arn}/*"]
            )
        )
        
        # Create streaming Lambda function
        streaming_lambda = lambda_.Function(
            self, "StreamingAgentFunction",
            runtime=lambda_.Runtime.PYTHON_3_13,
            architecture=lambda_.Architecture.ARM_64,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("lambdas/streaming-agent"),
            layers=[powertools_layer],
            role=streaming_lambda_role,
            timeout=Duration.seconds(300),
            environment={
                "AGENT_RUNTIME_ARN": agent_runtime_arn,
                "EVENT_API_ENDPOINT": f"https://{event_api.http_dns}/event",
                "POWERTOOLS_SERVICE_NAME": "streaming-agent",
                "LOG_LEVEL": "INFO"
            }
        )
        
        # Add SQS as event source for Lambda
        streaming_lambda.add_event_source(
            lambda_event_sources.SqsEventSource(
                agent_request_queue,
                batch_size=1  # Process one message at a time
            )
        )
        
        # Create IAM role for API Gateway to send to SQS
        apigw_sqs_role = iam.Role(
            self, "ApiGatewaySqsRole",
            assumed_by=iam.ServicePrincipal("apigateway.amazonaws.com")
        )
        
        agent_request_queue.grant_send_messages(apigw_sqs_role)
        
        # Create AWS integration for SQS
        sqs_integration = apigw.AwsIntegration(
            service="sqs",
            path=f"{self.account}/{agent_request_queue.queue_name}",
            integration_http_method="POST",
            options=apigw.IntegrationOptions(
                credentials_role=apigw_sqs_role,
                request_parameters={
                    "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
                },
                request_templates={
                    "application/json": "Action=SendMessage&MessageBody=$input.body"
                },
                integration_responses=[
                    apigw.IntegrationResponse(
                        status_code="202",
                        response_templates={
                            "application/json": '{"message": "Request queued successfully"}'
                        }
                    )
                ]
            )
        )
        
        # Update direct API to use SQS integration
        direct_invoke_resource.add_method(
            "POST",
            sqs_integration,
            authorization_type=apigw.AuthorizationType.IAM,
            method_responses=[
                apigw.MethodResponse(status_code="202")
            ]
        )
        
        # Outputs for AppSync Events
        CfnOutput(
            self, "EventApiHttpEndpoint",
            value=f"https://{event_api.http_dns}/event",
            description="AppSync Events HTTP endpoint"
        )
        
        CfnOutput(
            self, "EventApiRealtimeEndpoint",
            value=f"https://{event_api.realtime_dns}/event/realtime",
            description="AppSync Events WebSocket endpoint for subscriptions"
        )
        
        CfnOutput(
            self, "AgentRequestQueueUrl",
            value=agent_request_queue.queue_url,
            description="SQS Queue URL for agent requests"
        )
