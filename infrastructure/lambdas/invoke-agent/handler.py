import json
import boto3
import os
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger()
tracer = Tracer()
app = APIGatewayRestResolver()

# Get runtime ARN from environment
AGENT_RUNTIME_ARN = os.environ['AGENT_RUNTIME_ARN']

# Initialize Bedrock AgentCore client
bedrock_client = boto3.client('bedrock-agentcore', region_name='us-west-2')

@app.post("/invoke")
@tracer.capture_method
def invoke_agent():
    """Invoke the AgentCore runtime with user prompt"""
    try:
        body = app.current_event.json_body
        prompt = body.get('prompt')
        session_id = body.get('session_id')
        
        if not prompt:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'prompt is required'})
            }
        
        if not session_id or len(session_id) < 33:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'session_id must be at least 33 characters'})
            }
        
        # Prepare payload
        payload = json.dumps({"prompt": prompt})
        
        # Invoke agent runtime
        response = bedrock_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=payload
        )
        
        # Parse response
        response_body = response['response'].read()
        response_data = json.loads(response_body)
        
        logger.info("Agent invoked successfully", extra={
            "session_id": session_id,
            "prompt_length": len(prompt)
        })
        
        return {
            'statusCode': 200,
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        logger.exception("Error invoking agent")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

@logger.inject_lambda_context
@tracer.capture_lambda_handler
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
