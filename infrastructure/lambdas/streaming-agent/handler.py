import json
import os
import boto3
import urllib3
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from aws_lambda_powertools import Logger

logger = Logger()

bedrock_client = boto3.client('bedrock-agentcore', region_name=os.environ['AWS_REGION'])


def publish_to_appsync(channel: str, event_data: dict):
    """Publish event to AppSync Events API"""
    try:
        events_endpoint = os.environ.get('EVENT_API_ENDPOINT')
        if not events_endpoint:
            logger.error("EVENT_API_ENDPOINT not configured")
            return
        
        payload = {
            "channel": channel,
            "events": [json.dumps(event_data)]
        }
        
        # Create signed request using IAM credentials
        request = AWSRequest(method='POST', url=events_endpoint, data=json.dumps(payload))
        request.headers['Content-Type'] = 'application/json'
        
        credentials = boto3.Session().get_credentials()
        SigV4Auth(credentials, 'appsync', os.environ['AWS_REGION']).add_auth(request)
        
        logger.info("Publishing to Events API channel: %s", channel)
        logger.info("Publishing payload: %s", json.dumps(payload))
        
        http = urllib3.PoolManager()
        response = http.request(
            'POST',
            events_endpoint,
            body=json.dumps(payload),
            headers=dict(request.headers),
            timeout=30
        )
        
        response_data = response.data.decode()
        logger.info("Events API HTTP Response - Status: %s, Body: %s", response.status, response_data)
        
        if response.status != 200:
            logger.error("Failed to publish to Events API: %s - %s", response.status, response_data)
            
    except Exception as e:
        logger.error("Error publishing to Events API: %s", str(e))


@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    Lambda handler that processes SQS messages, invokes Bedrock AgentCore,
    and streams responses to AppSync Events.
    
    SQS message body format:
    {
        "prompt": "Your question here",
        "runtimeSessionId": "unique-session-id-33-chars-minimum"
    }
    """
    # Parse SQS event - process first record
    if 'Records' not in event or len(event['Records']) == 0:
        logger.error("No SQS records found in event")
        raise ValueError("No SQS records found in event")
    
    sqs_record = event['Records'][0]
    logger.info(f"Processing SQS message: {sqs_record['body']}")
    
    body = json.loads(sqs_record['body'])
    
    prompt = body.get('prompt')
    session_id = body.get('runtimeSessionId')
    
    if not prompt or not session_id:
        logger.error(f"Missing required fields. Body: {body}")
        raise ValueError("Missing required fields: prompt and runtimeSessionId")
    
    logger.info(f"Invoking agent for session: {session_id}")
    
    # Invoke Bedrock AgentCore runtime
    agent_runtime_arn = os.environ['AGENT_RUNTIME_ARN']
    
    response = bedrock_client.invoke_agent_runtime(
        agentRuntimeArn=agent_runtime_arn,
        runtimeSessionId=session_id,
        payload=json.dumps({"prompt": prompt})
    )
    
    # Stream response chunks to AppSync Events
    channel_name = f"chat/{session_id}"
    response_body = response['response'].read().decode('utf-8')
    response_data = json.loads(response_body)
    
    # Publish start event
    publish_to_appsync(channel_name, {
        "type": "start",
        "sessionId": session_id
    })
    
    # Publish response content
    publish_to_appsync(channel_name, {
        "type": "content",
        "sessionId": session_id,
        "content": response_data
    })
    
    # Publish end event
    publish_to_appsync(channel_name, {
        "type": "end",
        "sessionId": session_id
    })
    
    logger.info(f"Successfully streamed response for session: {session_id}")
