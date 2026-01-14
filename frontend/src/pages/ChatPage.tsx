import { useState, useEffect, useRef } from 'react';
import { events } from 'aws-amplify/data';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Container,
  Header,
  SpaceBetween,
  Input,
  Button,
  Box,
  Alert
} from '@cloudscape-design/components';
import { awsConfig } from '../config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to AppSync Events
  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      try {
        const channel = await events.connect(`chat/${sessionId}`);
        channelRef.current = channel;

        subscription = channel.subscribe({
          next: (data: any) => {
            console.log('Received event:', data);
            
            try {
              const event = JSON.parse(data.event);
              
              if (event.type === 'content') {
                // Append text to the last assistant message
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMessage,
                        content: lastMessage.content + event.text
                      }
                    ];
                  } else {
                    // Create new assistant message
                    return [
                      ...prev,
                      {
                        id: `msg-${Date.now()}`,
                        role: 'assistant',
                        content: event.text,
                        timestamp: new Date()
                      }
                    ];
                  }
                });
              } else if (event.type === 'tool_use') {
                // Show tool usage
                setMessages(prev => [
                  ...prev,
                  {
                    id: `tool-${Date.now()}`,
                    role: 'assistant',
                    content: event.text,
                    timestamp: new Date()
                  }
                ]);
              }
            } catch (err) {
              console.error('Error parsing event:', err);
            }
          },
          error: (err: any) => {
            console.error('Subscription error:', err);
            setError('Connection error. Please refresh the page.');
          }
        });
      } catch (err) {
        console.error('Failed to setup subscription:', err);
        setError('Failed to connect to streaming service.');
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [sessionId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Get auth session for signing request
      const session = await fetchAuthSession();
      const credentials = session.credentials;

      if (!credentials) {
        throw new Error('No credentials available');
      }

      // Send message to API Gateway (which queues to SQS)
      const response = await fetch(awsConfig.api.invokeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.tokens?.idToken?.toString()}`
        },
        body: JSON.stringify({
          prompt: input,
          runtimeSessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Response is 202 - message queued
      console.log('Message queued successfully');
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      header={
        <Header variant="h1">
          Chat with Citizens Advice Assistant
        </Header>
      }
    >
      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box padding={{ vertical: 'l' }}>
          <div style={{ 
            minHeight: '400px', 
            maxHeight: '600px', 
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px'
          }}>
            {messages.length === 0 && (
              <Box textAlign="center" color="text-body-secondary">
                Start a conversation by typing a message below
              </Box>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: message.role === 'user' ? '#e3f2fd' : '#ffffff',
                  borderRadius: '8px',
                  maxWidth: '80%',
                  marginLeft: message.role === 'user' ? 'auto' : '0',
                  marginRight: message.role === 'user' ? '0' : 'auto'
                }}
              >
                <Box fontWeight="bold" marginBottom="xs">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </Box>
                <Box>{message.content}</Box>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </Box>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Input
            value={input}
            onChange={({ detail }) => setInput(detail.value)}
            onKeyDown={(e) => {
              if (e.detail.key === 'Enter' && !loading) {
                sendMessage();
              }
            }}
            placeholder="Type your message..."
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            loading={loading}
          >
            Send
          </Button>
        </div>
      </SpaceBetween>
    </Container>
  );
}
