from aws_cdk import (
    Stack,
    aws_opensearchserverless as opensearch,
    aws_iam as iam,
)
from constructs import Construct
import json


class OpenSearchStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Collection names
        self.national_collection_name = "national-kb"
        self.local_collection_name = "local-kb"

        # IAM Role for Bedrock Knowledge Base
        self.kb_role = iam.Role(
            self, "KnowledgeBaseRole",
            assumed_by=iam.ServicePrincipal(
                "bedrock.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "aws:SourceAccount": self.account
                    },
                    "ArnLike": {
                        "aws:SourceArn": f"arn:aws:bedrock:{self.region}:{self.account}:knowledge-base/*"
                    }
                }
            ),
            inline_policies={
                "BedrockAccess": iam.PolicyDocument(
                    statements=[
                        iam.PolicyStatement(
                            effect=iam.Effect.ALLOW,
                            actions=["bedrock:InvokeModel"],
                            resources=[f"arn:aws:bedrock:{self.region}::foundation-model/amazon.titan-embed-text-v2:0"]
                        )
                    ]
                )
            }
        )

        # Create OpenSearch Serverless policies for national collection
        national_network_policy = json.dumps([{
            "Description": f"Public access for {self.national_collection_name} collection",
            "Rules": [{
                "ResourceType": "collection",
                "Resource": [f"collection/{self.national_collection_name}"]
            }],
            "AllowFromPublic": True
        }])

        national_encryption_policy = json.dumps({
            "Rules": [{
                "ResourceType": "collection",
                "Resource": [f"collection/{self.national_collection_name}"]
            }],
            "AWSOwnedKey": True
        })

        # Create OpenSearch Serverless policies for local collection
        local_network_policy = json.dumps([{
            "Description": f"Public access for {self.local_collection_name} collection",
            "Rules": [{
                "ResourceType": "collection",
                "Resource": [f"collection/{self.local_collection_name}"]
            }],
            "AllowFromPublic": True
        }])

        local_encryption_policy = json.dumps({
            "Rules": [{
                "ResourceType": "collection",
                "Resource": [f"collection/{self.local_collection_name}"]
            }],
            "AWSOwnedKey": True
        })

        # Create CFN resources for national collection policies
        national_network_cfn = opensearch.CfnSecurityPolicy(
            self, "NationalNetworkPolicy",
            name=f"{self.national_collection_name}-np",
            policy=national_network_policy,
            type="network"
        )

        national_encryption_cfn = opensearch.CfnSecurityPolicy(
            self, "NationalEncryptionPolicy",
            name=f"{self.national_collection_name}-ep",
            policy=national_encryption_policy,
            type="encryption"
        )

        # Create CFN resources for local collection policies
        local_network_cfn = opensearch.CfnSecurityPolicy(
            self, "LocalNetworkPolicy",
            name=f"{self.local_collection_name}-np",
            policy=local_network_policy,
            type="network"
        )

        local_encryption_cfn = opensearch.CfnSecurityPolicy(
            self, "LocalEncryptionPolicy",
            name=f"{self.local_collection_name}-ep",
            policy=local_encryption_policy,
            type="encryption"
        )

        # Create data access policies for both collections
        national_data_access_policy = json.dumps([{
            "Rules": [{
                "Resource": [f"collection/{self.national_collection_name}"],
                "Permission": [
                    "aoss:CreateCollectionItems",
                    "aoss:DeleteCollectionItems",
                    "aoss:UpdateCollectionItems",
                    "aoss:DescribeCollectionItems"
                ],
                "ResourceType": "collection"
            }, {
                "Resource": [f"index/{self.national_collection_name}/*"],
                "Permission": [
                    "aoss:CreateIndex",
                    "aoss:DeleteIndex",
                    "aoss:UpdateIndex",
                    "aoss:DescribeIndex",
                    "aoss:ReadDocument",
                    "aoss:WriteDocument"
                ],
                "ResourceType": "index"
            }],
            "Principal": [
                self.kb_role.role_arn,
                f"arn:aws:iam::{self.account}:root"
            ]
        }])

        local_data_access_policy = json.dumps([{
            "Rules": [{
                "Resource": [f"collection/{self.local_collection_name}"],
                "Permission": [
                    "aoss:CreateCollectionItems",
                    "aoss:DeleteCollectionItems",
                    "aoss:UpdateCollectionItems",
                    "aoss:DescribeCollectionItems"
                ],
                "ResourceType": "collection"
            }, {
                "Resource": [f"index/{self.local_collection_name}/*"],
                "Permission": [
                    "aoss:CreateIndex",
                    "aoss:DeleteIndex",
                    "aoss:UpdateIndex",
                    "aoss:DescribeIndex",
                    "aoss:ReadDocument",
                    "aoss:WriteDocument"
                ],
                "ResourceType": "index"
            }],
            "Principal": [
                self.kb_role.role_arn,
                f"arn:aws:iam::{self.account}:root"
            ]
        }])

        # Create CFN resources for data access policies
        national_data_access_cfn = opensearch.CfnAccessPolicy(
            self, "NationalDataAccessPolicy",
            name=f"{self.national_collection_name}-ap",
            policy=national_data_access_policy,
            type="data"
        )

        local_data_access_cfn = opensearch.CfnAccessPolicy(
            self, "LocalDataAccessPolicy",
            name=f"{self.local_collection_name}-ap",
            policy=local_data_access_policy,
            type="data"
        )

        # Create collections
        self.national_collection = opensearch.CfnCollection(
            self, "NationalCollection",
            name=self.national_collection_name,
            type="VECTORSEARCH",
            description="Collection for National Knowledge Base"
        )

        self.local_collection = opensearch.CfnCollection(
            self, "LocalCollection",
            name=self.local_collection_name, 
            type="VECTORSEARCH",
            description="Collection for Local Knowledge Base"
        )

        # Add dependencies
        self.national_collection.add_dependency(national_network_cfn)
        self.national_collection.add_dependency(national_encryption_cfn)
        self.national_collection.add_dependency(national_data_access_cfn)
        self.local_collection.add_dependency(local_network_cfn)
        self.local_collection.add_dependency(local_encryption_cfn)
        self.local_collection.add_dependency(local_data_access_cfn)

        # Create OpenSearch Serverless Indexes
        self.national_index = opensearch.CfnIndex(
            self, "NationalIndex",
            collection_endpoint=self.national_collection.attr_collection_endpoint,
            index_name="national-index",
            mappings=opensearch.CfnIndex.MappingsProperty(
                properties={
                    "vector": opensearch.CfnIndex.PropertyMappingProperty(
                        type="knn_vector",
                        dimension=1024,
                        method=opensearch.CfnIndex.MethodProperty(
                            name="hnsw",
                            engine="faiss",
                            space_type="l2",
                            parameters=opensearch.CfnIndex.ParametersProperty(
                                ef_construction=512,
                                m=16
                            )
                        )
                    ),
                    "AMAZON_BEDROCK_METADATA": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text",
                        index=False
                    ),
                    "AMAZON_BEDROCK_TEXT": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text"
                    ),
                    "AMAZON_BEDROCK_TEXT_CHUNK": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text"
                    )
                }
            ),
            settings=opensearch.CfnIndex.IndexSettingsProperty(
                index=opensearch.CfnIndex.IndexProperty(
                    knn=True
                )
            )
        )

        self.local_index = opensearch.CfnIndex(
            self, "LocalIndex",
            collection_endpoint=self.local_collection.attr_collection_endpoint,
            index_name="local-index",
            mappings=opensearch.CfnIndex.MappingsProperty(
                properties={
                    "vector": opensearch.CfnIndex.PropertyMappingProperty(
                        type="knn_vector",
                        dimension=1024,
                        method=opensearch.CfnIndex.MethodProperty(
                            name="hnsw",
                            engine="faiss",
                            space_type="l2",
                            parameters=opensearch.CfnIndex.ParametersProperty(
                                ef_construction=512,
                                m=16
                            )
                        )
                    ),
                    "AMAZON_BEDROCK_METADATA": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text",
                        index=False
                    ),
                    "AMAZON_BEDROCK_TEXT": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text"
                    ),
                    "AMAZON_BEDROCK_TEXT_CHUNK": opensearch.CfnIndex.PropertyMappingProperty(
                        type="text"
                    )
                }
            ),
            settings=opensearch.CfnIndex.IndexSettingsProperty(
                index=opensearch.CfnIndex.IndexProperty(
                    knn=True
                )
            )
        )

        # Add index dependencies
        self.national_index.add_dependency(self.national_collection)
        self.local_index.add_dependency(self.local_collection)

        # Create separate OpenSearch policies for each collection
        national_opensearch_policy = iam.Policy(
            self, "NationalOpenSearchPolicy",
            statements=[
                iam.PolicyStatement(
                    actions=["aoss:APIAccessAll"],
                    resources=[self.national_collection.attr_arn]
                )
            ]
        )

        local_opensearch_policy = iam.Policy(
            self, "LocalOpenSearchPolicy",
            statements=[
                iam.PolicyStatement(
                    actions=["aoss:APIAccessAll"],
                    resources=[self.local_collection.attr_arn]
                )
            ]
        )

        # Attach OpenSearch policies to KB role
        national_opensearch_policy.attach_to_role(self.kb_role)
        local_opensearch_policy.attach_to_role(self.kb_role)

        # Export values for KB stack
        self.national_collection_arn = self.national_collection.attr_arn
        self.local_collection_arn = self.local_collection.attr_arn
        self.national_index_name = "national-index"
        self.local_index_name = "local-index"
        self.kb_role_arn = self.kb_role.role_arn