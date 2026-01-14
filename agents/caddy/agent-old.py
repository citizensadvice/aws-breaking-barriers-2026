# agent-old.py
import logging
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool
from strands.models import BedrockModel
import boto3
import os

# Configure the root strands logger
logging.getLogger("strands").setLevel(logging.DEBUG)
# Add a handler to see the logs
logging.basicConfig(format="%(levelname)s | %(name)s | %(message)s",
                   handlers=[logging.StreamHandler()])

app = BedrockAgentCoreApp()

# Use the currently available and correct AWS Bedrock Model ID for Claude Sonnet 4.5
# Ensure you have enabled access to this specific model in your AWS Console
bedrock_model = "global.anthropic.claude-sonnet-4-5-20250929-v1:0"

# Call the variable 'model' as requested
model = BedrockModel(
    model_id=bedrock_model
)

NATIONAL_KB = os.getenv("NATIONAL_KB_ID")
LOCAL_KB = os.getenv("LOCAL_KB_ID")
LOCAL_COUNCILS = ["manchester", "westminister"]

@tool
def kb_search(query: str, kb_id: str, local_council: str = None) -> str:
    """Search knowledge base with optional local council filtering.
    
    Args:
        query: The search query about services or information
        kb_id: The Knowledge Base ID to search
        local_council: Optional local council/authority filter (e.g., "Manchester City Council", "Westminster")
    """
    
    if not kb_id:
        return "Knowledge base ID is required. Please provide a valid KB ID."
    
    # Initialize Bedrock client - will use AWS_REGION from environment
    region = os.getenv("AWS_REGION", "us-west-2")
    bedrock_client = boto3.client('bedrock-agent-runtime', region_name=region)
    
    # Build metadata filters
    filters = {}
    
    # Temporarily disable metadata filtering to test KB retrieval
    # if local_council:
    #     filters["local_council"] = {"equals": local_council}
    
    try:
        # Call Bedrock Knowledge Base with filters
        retrieval_config = {
            'vectorSearchConfiguration': {
                'numberOfResults': 5
            }
        }
        
        # Only add filter if we have filters to apply
        if filters:
            retrieval_config['vectorSearchConfiguration']['filter'] = filters
        
        response = bedrock_client.retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={'text': query},
            retrievalConfiguration=retrieval_config
        )
        
        # Extract and format results
        results = []
        for result in response.get('retrievalResults', []):
            content = result['content']['text']
            # Include source metadata if available
            metadata = result.get('metadata', {})
            source_info = f" (Source: {metadata.get('source', 'Unknown')})" if metadata.get('source') else ""
            results.append(f"{content}{source_info}")
        
        if results:
            kb_info = f" (KB: {kb_id})"
            council_info = f" for {local_council}" if local_council else ""
            return f"Found information{council_info}{kb_info}:\n\n" + "\n\n---\n\n".join(results)
        else:
            return f"No information found in knowledge base {kb_id}. You may want to try a different search or contact support."
        
    except Exception as e:
        return f"Error retrieving information: {str(e)}. Please try again or contact support."

# Initialize the agent using the specific model instance
agent = Agent(
    model=model,
    system_prompt=f"""You are assisting a UK Citizens Advice agent. Your role is to help gather information about users who are seeking advice on various issues including housing, benefits, debt, employment, consumer rights, and legal matters.

    When interacting with users:
    - Gather key details like location, circumstances, and urgency
    - Be empathetic and supportive in your approach
    - Help identify what type of advice or support they need
    - Collect information that would help a Citizens Advice advisor provide the best assistance

    Once you have collected the necessary information, search the knowledge base using the kb_search tool:
    - For national-level advice (general UK policies, benefits, rights), use NATIONAL_KB: "{NATIONAL_KB}"
    - For local council services and information, use LOCAL_KB: "{LOCAL_KB}" with the local_council parameter
    - Available local councils: {LOCAL_COUNCILS}

    Always maintain a helpful, professional, and caring tone while gathering the necessary information to connect users with appropriate resources and guidance.
    """,
    tools=[kb_search]
)

@app.entrypoint
def invoke(payload):
    """Process user input and return a response"""
    user_message = payload.get("prompt", "Hello! How can I help you today?")
    result = agent(user_message)
    return {"result": result.message}

if __name__ == "__main__":
    app.run()