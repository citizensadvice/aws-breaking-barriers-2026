from aws_cdk import (
    Stack,
    CfnOutput,
    aws_iam as iam,
    aws_bedrockagentcore as bedrockagentcore,
)
from constructs import Construct


class AgentStack(Stack):
    def __init__(
        self, 
        scope: Construct, 
        construct_id: str,
        deployment_bucket_name: str,
        national_kb_id: str,
        local_kb_id: str,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # IAM Policy for AgentCore Runtime
        agentcore_access = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
                "bedrock-agent:*",
                "bedrock-agentcore:*",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "xray:PutTraceSegments",
            ],
            resources=["*"],
        )

        # Knowledge Base access policy
        kb_access = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "bedrock-agent-runtime:Retrieve",
                "bedrock-agent-runtime:RetrieveAndGenerate",
            ],
            resources=[
                f"arn:aws:bedrock:{self.region}:{self.account}:knowledge-base/{national_kb_id}",
                f"arn:aws:bedrock:{self.region}:{self.account}:knowledge-base/{local_kb_id}",
            ],
        )

        # IAM Role for AgentCore Runtime
        runtime_role = iam.Role(
            self,
            "AgentCoreRuntimeRole",
            assumed_by=iam.ServicePrincipal("bedrock-agentcore.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "BedrockAgentCoreFullAccess"
                )
            ],
            inline_policies={
                "AgentCoreRuntimePolicy": iam.PolicyDocument(
                    statements=[agentcore_access, kb_access]
                )
            },
        )

        # AgentCore Runtime
        runtime = bedrockagentcore.CfnRuntime(
            self,
            "CitizensAdviceRuntime",
            agent_runtime_artifact=bedrockagentcore.CfnRuntime.AgentRuntimeArtifactProperty(
                code_configuration=bedrockagentcore.CfnRuntime.CodeConfigurationProperty(
                    code=bedrockagentcore.CfnRuntime.CodeProperty(
                        s3=bedrockagentcore.CfnRuntime.S3LocationProperty(
                            bucket=deployment_bucket_name,
                            prefix="deployment_package.zip",
                        )
                    ),
                    entry_point=["agent.py"],
                    runtime="PYTHON_3_13",
                ),
            ),
            agent_runtime_name="CitizensAdviceRuntime",
            network_configuration=bedrockagentcore.CfnRuntime.NetworkConfigurationProperty(
                network_mode="PUBLIC",
            ),
            role_arn=runtime_role.role_arn,
            description="UK Citizens Advice AgentCore Runtime",
            environment_variables={
                "NATIONAL_KB_ID": national_kb_id,
                "LOCAL_KB_ID": local_kb_id,
                "REGION": f"{self.region}",
            },
        )

        # Outputs
        CfnOutput(
            self, "AgentCoreRuntimeId",
            value=runtime.attr_agent_runtime_id,
            description="AgentCore Runtime ID"
        )

        CfnOutput(
            self, "AgentCoreRuntimeArn",
            value=runtime.attr_agent_runtime_arn,
            description="AgentCore Runtime ARN"
        )