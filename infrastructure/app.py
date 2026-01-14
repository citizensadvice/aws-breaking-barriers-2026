#!/usr/bin/env python3
import aws_cdk as cdk
from stacks.opensearch_stack import OpenSearchStack
from stacks.knowledge_base_stack import KnowledgeBaseStack
from stacks.agent_stack import AgentStack

app = cdk.App()

# Deploy OpenSearch stack first
opensearch_stack = OpenSearchStack(app, "OpenSearchStack")

# Deploy Knowledge Base stack with dependencies from OpenSearch stack
knowledge_base_stack = KnowledgeBaseStack(
    app, 
    "KnowledgeBaseStack",
    national_collection_arn=opensearch_stack.national_collection_arn,
    national_index_name=opensearch_stack.national_index_name,
    local_collection_arn=opensearch_stack.local_collection_arn,
    local_index_name=opensearch_stack.local_index_name,
    kb_role_arn=opensearch_stack.kb_role_arn
)

# Add explicit dependency
knowledge_base_stack.add_dependency(opensearch_stack)

# Deploy Agent stack with dependencies from Knowledge Base stack
agent_stack = AgentStack(
    app,
    "AgentStack",
    deployment_bucket_name=knowledge_base_stack.deployment_bucket.bucket_name,
    national_kb_id=knowledge_base_stack.national_kb.attr_knowledge_base_id,
    local_kb_id=knowledge_base_stack.local_kb.attr_knowledge_base_id
)

# Add explicit dependency
agent_stack.add_dependency(knowledge_base_stack)

app.synth()