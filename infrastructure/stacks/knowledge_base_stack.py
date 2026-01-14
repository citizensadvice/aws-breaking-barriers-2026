from aws_cdk import (
    Stack,
    CfnOutput,
    RemovalPolicy,
    aws_s3 as s3,
    aws_bedrock as bedrock,
    aws_iam as iam,
)
from constructs import Construct


class KnowledgeBaseStack(Stack):
    def __init__(
        self, 
        scope: Construct, 
        construct_id: str,
        national_collection_arn: str,
        national_index_name: str,
        local_collection_arn: str,
        local_index_name: str,
        kb_role_arn: str,
        **kwargs
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # S3 Data Buckets
        deployment_bucket = s3.Bucket(
            self, "DeploymentBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True
        )

        national_data_bucket = s3.Bucket(
            self, "NationalDataBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True
        )

        local_data_bucket = s3.Bucket(
            self, "LocalDataBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            enforce_ssl=True
        )

        # Import KB role from OpenSearch stack
        kb_role = iam.Role.from_role_arn(self, "ImportedKBRole", kb_role_arn)

        # Add S3 permissions to the KB role
        s3_policy = iam.Policy(
            self, "KBS3Policy",
            statements=[
                iam.PolicyStatement(
                    effect=iam.Effect.ALLOW,
                    actions=["s3:GetObject", "s3:ListBucket"],
                    resources=[
                        national_data_bucket.bucket_arn,
                        f"{national_data_bucket.bucket_arn}/*",
                        local_data_bucket.bucket_arn,
                        f"{local_data_bucket.bucket_arn}/*"
                    ]
                )
            ]
        )
        s3_policy.attach_to_role(kb_role)

        # Knowledge Bases
        national_kb = bedrock.CfnKnowledgeBase(
            self, "NationalKnowledgeBase",
            name="national-kb",
            role_arn=kb_role_arn,
            knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
                type="VECTOR",
                vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
                    embedding_model_arn=f"arn:aws:bedrock:{self.region}::foundation-model/amazon.titan-embed-text-v2:0"
                )
            ),
            storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
                type="OPENSEARCH_SERVERLESS",
                opensearch_serverless_configuration=bedrock.CfnKnowledgeBase.OpenSearchServerlessConfigurationProperty(
                    collection_arn=national_collection_arn,
                    vector_index_name=national_index_name,
                    field_mapping=bedrock.CfnKnowledgeBase.OpenSearchServerlessFieldMappingProperty(
                        vector_field="vector",
                        text_field="AMAZON_BEDROCK_TEXT",
                        metadata_field="AMAZON_BEDROCK_METADATA"
                    )
                )
            ),
            description="National Knowledge Base for UK Citizens Advice"
        )

        local_kb = bedrock.CfnKnowledgeBase(
            self, "LocalKnowledgeBase",
            name="local-kb",
            role_arn=kb_role_arn,
            knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
                type="VECTOR",
                vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
                    embedding_model_arn=f"arn:aws:bedrock:{self.region}::foundation-model/amazon.titan-embed-text-v2:0"
                )
            ),
            storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
                type="OPENSEARCH_SERVERLESS",
                opensearch_serverless_configuration=bedrock.CfnKnowledgeBase.OpenSearchServerlessConfigurationProperty(
                    collection_arn=local_collection_arn,
                    vector_index_name=local_index_name,
                    field_mapping=bedrock.CfnKnowledgeBase.OpenSearchServerlessFieldMappingProperty(
                        vector_field="vector",
                        text_field="AMAZON_BEDROCK_TEXT",
                        metadata_field="AMAZON_BEDROCK_METADATA"
                    )
                )
            ),
            description="Local Knowledge Base for UK Citizens Advice"
        )

        # Add dependencies to ensure proper creation order
        # No dependencies needed since OpenSearch resources are created in separate stack

        # Data Sources
        national_data_source = bedrock.CfnDataSource(
            self, "NationalDataSource",
            knowledge_base_id=national_kb.attr_knowledge_base_id,
            name="national-data-source",
            description="National Knowledge Base DataSource Configuration",
            data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(
                type="S3",
                s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(
                    bucket_arn=national_data_bucket.bucket_arn
                )
            ),
            vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(
                chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(
                    chunking_strategy="FIXED_SIZE",
                    fixed_size_chunking_configuration=bedrock.CfnDataSource.FixedSizeChunkingConfigurationProperty(
                        max_tokens=300,
                        overlap_percentage=20
                    )
                )
            )
        )

        local_data_source = bedrock.CfnDataSource(
            self, "LocalDataSource",
            knowledge_base_id=local_kb.attr_knowledge_base_id,
            name="local-data-source",
            description="Local Knowledge Base DataSource Configuration",
            data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(
                type="S3",
                s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(
                    bucket_arn=local_data_bucket.bucket_arn
                )
            ),
            vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(
                chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(
                    chunking_strategy="FIXED_SIZE",
                    fixed_size_chunking_configuration=bedrock.CfnDataSource.FixedSizeChunkingConfigurationProperty(
                        max_tokens=300,
                        overlap_percentage=20
                    )
                )
            )
        )

        # Outputs
        CfnOutput(
            self, "DeploymentBucketName",
            value=deployment_bucket.bucket_name,
            description="S3 bucket for agent deployment packages"
        )

        CfnOutput(
            self, "NationalDataBucketName",
            value=national_data_bucket.bucket_name,
            description="S3 bucket for national knowledge base documents"
        )

        CfnOutput(
            self, "LocalDataBucketName",
            value=local_data_bucket.bucket_name,
            description="S3 bucket for local council documents"
        )

        CfnOutput(
            self, "NationalKbId",
            value=national_kb.attr_knowledge_base_id,
            description="National Knowledge Base ID"
        )

        CfnOutput(
            self, "LocalKbId",
            value=local_kb.attr_knowledge_base_id,
            description="Local Knowledge Base ID"
        )

        # Export resources for other stacks
        self.deployment_bucket = deployment_bucket
        self.national_kb = national_kb
        self.local_kb = local_kb