import os
import logging
import boto3
import datetime
from strands import Agent
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.memory.integrations.strands.session_manager import (
    AgentCoreMemorySessionManager,
)
from bedrock_agentcore.memory.integrations.strands.config import AgentCoreMemoryConfig
import json
import traceback

# Import local modules
from dynamodb_manager import DynamoDBManager
from gateway_client import get_gateway_client

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = BedrockAgentCoreApp()

# Enable CORS for local development
app.cors_allow_origins = ["http://localhost:3000", "http://localhost:5173"]
app.cors_allow_methods = ["GET", "POST", "OPTIONS"]
app.cors_allow_headers = ["Content-Type", "Authorization"]

REGION = os.getenv("AWS_REGION")
MEMORY_ID = os.getenv("MEMORY_ID")
NOTES_TABLE_NAME = os.getenv("NOTES_TABLE_NAME")

logger.info(f"🗂️  Using Notes table: {NOTES_TABLE_NAME}")

# DynamoDB setup
dynamodb = boto3.resource("dynamodb", region_name=REGION)

# Initialize bedrock model
bedrock_model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    region_name=REGION,
    temperature=0.1,
)


def get_user_profile_data(user_id: str) -> str:
    """Get user profile data formatted for prompts."""
    try:
        manager = DynamoDBManager(region_name=REGION)
        profile = manager.get_user_profile(user_id)

        if not profile:
            return "User profile not available"

        # Extract profile information
        profile_parts = []

        # IMPORTANT: Always include userId first - this is the user's unique identifier
        if profile.get("userId"):
            profile_parts.append(
                f"User ID (use this for all tool calls): {profile['userId']}"
            )

        if profile.get("name"):
            profile_parts.append(f"Name: {profile['name']}")

        if profile.get("email"):
            profile_parts.append(f"Email: {profile['email']}")

        if profile.get("address"):
            profile_parts.append(f"Address: {profile['address']}")

        if profile.get("notes"):
            profile_parts.append(f"Notes: {profile['notes']}")

        if profile.get("preferences"):
            preferences = profile["preferences"]
            if isinstance(preferences, str):
                try:
                    prefs = json.loads(preferences)
                    profile_parts.append(f"Preferences: {json.dumps(prefs)}")
                except json.JSONDecodeError:
                    profile_parts.append(f"Preferences: {preferences}")
            else:
                profile_parts.append(f"Preferences: {preferences}")

        if profile.get("onboardingCompleted"):
            profile_parts.append(
                f"Onboarding completed: {profile['onboardingCompleted']}"
            )

        if profile_parts:
            profile_text = f", Profile: {'; '.join(profile_parts)}"
        else:
            profile_text = ", Profile: Basic user profile available"

        return profile_text

    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return "User profile not available"


def create_supervisor_agent(user_id: str, session_id: str) -> Agent:
    """Create supervisor agent with AgentCore memory session manager."""
    # Get user profile data
    try:
        user_profile = get_user_profile_data(user_id)
        logger.info(f"Retrieved user profile for {user_id}: {user_profile[:200]}...")
    except Exception as e:
        logger.warning(f"Could not retrieve user profile for {user_id}: {e}")
        user_profile = "User profile not available"

    # Simplified prompt - direct assistance without routing
    system_prompt = f"""You are a Citizens Advice assistant helping UK residents with practical guidance on everyday issues.
Today's date is {datetime.datetime.now().strftime("%B %d, %Y")}.

CRISIS ESCALATION - CRITICAL:
If the user mentions ANY of the following, immediately provide crisis support contacts:
- Suicidal thoughts or self-harm
- Severe mental health crisis
- Domestic violence or abuse (current or immediate threat)
- Homelessness with nowhere to stay tonight
- No money for food/heating and vulnerable (elderly, children, disabled)
- Immediate eviction (bailiffs coming today/tomorrow)

CRISIS RESPONSE FORMAT:
"I'm concerned about your safety and wellbeing. Please contact these services immediately:

🆘 EMERGENCY: If you're in immediate danger, call 999

Mental Health Crisis:
- Samaritans: 116 123 (24/7, free)
- Crisis text line: Text SHOUT to 85258

Domestic Abuse:
- National Domestic Abuse Helpline: 0808 2000 247 (24/7)

Homelessness:
- Shelter Emergency Helpline: 0808 800 4444
- Local council housing emergency: [advise to call their local council]

I can still provide guidance, but please reach out to these services for immediate support."

LANGUAGE SUPPORT:
- Respond in the same language the user writes in (English, Spanish, French, Polish, etc.)
- If the user writes in Spanish, respond completely in Spanish
- If the user writes in French, respond completely in French
- Maintain the same language throughout the conversation unless the user switches

Your primary responsibilities include:
1. Providing guidance on benefits and financial support (Universal Credit, PIP, Housing Benefit)
2. Helping with housing and tenancy questions (rights, eviction, repairs)
3. Advising on employment rights and workplace issues (redundancy, discrimination, pay)
4. Explaining consumer rights and debt management (refunds, faulty goods, priority debts)
5. Guiding users on immigration and legal matters

IMPORTANT GUIDELINES:
1. Always provide accurate, impartial advice based on current UK law and regulations
2. Be empathetic and non-judgmental - users may be in difficult situations
3. Clearly distinguish between general guidance and situations requiring professional legal advice
4. Include relevant links to official resources (gov.uk, citizensadvice.org.uk) when available
5. If unsure about specific details, recommend the user contact their local Citizens Advice bureau
6. ALWAYS escalate crisis situations to human support services

When responding:
- Use clear, plain language avoiding jargon (in whatever language the user is using)
- Break down complex processes into simple steps
- Highlight important deadlines or time limits (e.g., tribunal appeal deadlines)
- Mention any free services or support available
- DO NOT provide specific legal advice - guide users to appropriate professionals when needed
- Provide practical, actionable guidance based on UK law and Citizens Advice principles

USER PROFILE:
{user_profile}
"""

    # Configure AgentCore Memory integration
    agentcore_memory_config = AgentCoreMemoryConfig(
        memory_id=MEMORY_ID, session_id=session_id, actor_id=f"supervisor-{user_id}"
    )

    session_manager = AgentCoreMemorySessionManager(
        agentcore_memory_config=agentcore_memory_config, region_name=REGION
    )

    logger.info("Creating supervisor agent with session manager...")

    # Create agent WITHOUT tools first to test
    agent = Agent(
        name="supervisor_agent",
        system_prompt=system_prompt,
        tools=[],  # No tools for now
        model=bedrock_model,
        session_manager=session_manager,
        trace_attributes={
            "user.id": user_id,
            "session.id": session_id,
        },
    )
    logger.info("✅ Agent created (no tools)")

    logger.info("Supervisor agent created successfully with session manager")
    return agent


@app.entrypoint
async def agent_stream(payload):
    """Main entrypoint for the supervisor agent with session manager."""
    user_query = payload.get("prompt")
    user_id = payload.get("user_id")
    session_id = payload.get("session_id")

    logger.info(f"=== AGENT ENTRYPOINT CALLED ===")
    logger.info(f"Payload: {payload}")

    if not all([user_query, user_id, session_id]):
        error_msg = "Missing required fields: prompt, user_id, or session_id"
        logger.error(error_msg)
        yield {"status": "error", "error": error_msg}
        return

    try:
        logger.info(f"Starting streaming invocation for user: {user_id}, session: {session_id}")
        logger.info(f"Query: {user_query}")

        agent = create_supervisor_agent(user_id, session_id)
        logger.info("Agent created successfully, starting stream...")

        # Use the agent's stream_async method for true token-level streaming
        event_count = 0
        async for event in agent.stream_async(user_query):
            event_count += 1
            if event_count <= 3:  # Log first few events
                logger.info(f"Event {event_count}: {type(event)} - {str(event)[:200]}")
            yield event
        
        logger.info(f"Streaming completed. Total events: {event_count}")

    except Exception as e:
        logger.error(f"Error in agent_stream: {e}")
        logger.error(traceback.format_exc())
        # Send error as text so user sees it
        yield {"event": {"contentBlockDelta": {"delta": {"text": f"Error: {str(e)}"}}}}
        yield {"status": "error", "error": str(e)}


if __name__ == "__main__":
    app.run()
