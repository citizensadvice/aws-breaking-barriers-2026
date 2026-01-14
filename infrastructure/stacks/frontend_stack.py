from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_appsync as appsync,
    aws_iam as iam,
    aws_sqs as sqs,
    aws_lambda_event_sources as lambda_event_sources,
    aws_cognito as cognito,
    aws_s3 as s3,
    aws_s3_deployment as s3_deployment,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    Duration,
    CfnOutput,
    RemovalPolicy
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
        
        # ===== Streaming API Gateway with SQS Integration =====
        
        # Create REST API for streaming invocation
        api = apigw.RestApi(
            self, "StreamingAgentApi",
            rest_api_name="Citizens Advice Streaming API",
            description="Streaming invocation of Bedrock AgentCore Runtime via SQS",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=apigw.Cors.DEFAULT_HEADERS
            )
        )
        
        # Add /invoke resource
        invoke_resource = api.root.add_resource("invoke")
        
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
        
        # Update API to use SQS integration
        invoke_resource.add_method(
            "POST",
            sqs_integration,
            authorization_type=apigw.AuthorizationType.IAM,
            method_responses=[
                apigw.MethodResponse(status_code="202")
            ]
        )
        
        # Outputs for API Gateway
        CfnOutput(
            self, "ApiUrl",
            value=api.url,
            description="Streaming API Gateway endpoint URL"
        )
        
        CfnOutput(
            self, "InvokeEndpoint",
            value=f"{api.url}invoke",
            description="Streaming agent invocation endpoint"
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
        
        # ===== Cognito User Pool and Identity Pool =====
        
        # Create Cognito User Pool
        user_pool = cognito.UserPool(
            self, "CitizensAdviceUserPool",
            user_pool_name="citizens-advice-users",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False
            ),
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # Create User Pool Client
        user_pool_client = user_pool.add_client(
            "CitizensAdviceWebClient",
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True
            ),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(
                    authorization_code_grant=True,
                    implicit_code_grant=True
                ),
                scopes=[cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE]
            )
        )
        
        # Create Identity Pool
        identity_pool = cognito.CfnIdentityPool(
            self, "CitizensAdviceIdentityPool",
            identity_pool_name="citizens_advice_identity_pool",
            allow_unauthenticated_identities=False,
            cognito_identity_providers=[
                cognito.CfnIdentityPool.CognitoIdentityProviderProperty(
                    client_id=user_pool_client.user_pool_client_id,
                    provider_name=user_pool.user_pool_provider_name
                )
            ]
        )
        
        # Create IAM role for authenticated users
        authenticated_role = iam.Role(
            self, "CognitoAuthenticatedRole",
            assumed_by=iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": identity_pool.ref
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated"
                    }
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity"
            )
        )
        
        
        # Grant API Gateway invoke permissions
        authenticated_role.add_to_policy(
            iam.PolicyStatement(
                actions=["execute-api:Invoke"],
                resources=[f"{api.arn_for_execute_api()}/*"]
            )
        )
        
        # Grant AppSync Events permissions
        authenticated_role.add_to_policy(
            iam.PolicyStatement(
                actions=["appsync:EventConnect", "appsync:EventSubscribe"],
                resources=[f"{event_api.api_arn}/*"]
            )
        )
        
        # Attach role to identity pool
        cognito.CfnIdentityPoolRoleAttachment(
            self, "IdentityPoolRoleAttachment",
            identity_pool_id=identity_pool.ref,
            roles={
                "authenticated": authenticated_role.role_arn
            }
        )
        
        # ===== S3 Bucket for Frontend Hosting =====
        
        frontend_bucket = s3.Bucket(
            self, "FrontendBucket",
            bucket_name=f"citizens-advice-frontend-{self.account}-{self.region}",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL
        )
        
        # ===== CloudFront Distribution =====
        
        # Origin Access Control for CloudFront
        oac = cloudfront.CfnOriginAccessControl(
            self, "FrontendOAC",
            origin_access_control_config=cloudfront.CfnOriginAccessControl.OriginAccessControlConfigProperty(
                name="citizens-advice-frontend-oac",
                origin_access_control_origin_type="s3",
                signing_behavior="always",
                signing_protocol="sigv4"
            )
        )
        
        # CloudFront distribution
        distribution = cloudfront.Distribution(
            self, "FrontendDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3Origin(frontend_bucket),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                cached_methods=cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS
            ),
            default_root_object="index.html",
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5)
                ),
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                    ttl=Duration.minutes(5)
                )
            ]
        )
        
        # Get CloudFront distribution
        cfn_distribution = distribution.node.default_child
        
        # Add OAC to distribution
        cfn_distribution.add_property_override(
            "DistributionConfig.Origins.0.OriginAccessControlId",
            oac.attr_id
        )
        
        # Remove OAI if present
        cfn_distribution.add_property_override(
            "DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity",
            ""
        )
        
        # Grant CloudFront OAC access to S3 bucket
        frontend_bucket.add_to_resource_policy(
            iam.PolicyStatement(
                actions=["s3:GetObject"],
                resources=[f"{frontend_bucket.bucket_arn}/*"],
                principals=[iam.ServicePrincipal("cloudfront.amazonaws.com")],
                conditions={
                    "StringEquals": {
                        "AWS:SourceArn": f"arn:aws:cloudfront::{self.account}:distribution/{distribution.distribution_id}"
                    }
                }
            )
        )
        
        # ===== Outputs =====
        
        CfnOutput(
            self, "UserPoolId",
            value=user_pool.user_pool_id,
            description="Cognito User Pool ID"
        )
        
        CfnOutput(
            self, "UserPoolClientId",
            value=user_pool_client.user_pool_client_id,
            description="Cognito User Pool Client ID"
        )
        
        CfnOutput(
            self, "IdentityPoolId",
            value=identity_pool.ref,
            description="Cognito Identity Pool ID"
        )
        
        CfnOutput(
            self, "FrontendBucketName",
            value=frontend_bucket.bucket_name,
            description="S3 bucket for frontend hosting"
        )
        
        CfnOutput(
            self, "CloudFrontUrl",
            value=f"https://{distribution.distribution_domain_name}",
            description="CloudFront distribution URL"
        )
        
        CfnOutput(
            self, "CloudFrontDistributionId",
            value=distribution.distribution_id,
            description="CloudFront distribution ID"
        )
