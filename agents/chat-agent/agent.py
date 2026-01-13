# Strands chat agent
from strands_agents import Agent

class ChatAgent(Agent):
    def __init__(self):
        super().__init__(name="chat-agent")
    
    def handle_message(self, message):
        return f"Echo: {message}"