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
  type?: 'tool_use';
}

interface ChatPageProps {
  signOut?: () => void;
  user?: any;
}

export default function ChatPage({ signOut }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID().substring(0, 33));
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
              const event = data.event;
              
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
                    timestamp: new Date(),
                    type: 'tool_use'
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
      const response = await fetch(awsConfig.apiEndpoint, {
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
        <Header 
          variant="h1"
          actions={
            <Button onClick={signOut}>Sign Out</Button>
          }
        >
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
                  backgroundColor: message.type === 'tool_use' 
                    ? '#f3e5f5' 
                    : message.role === 'user' 
                      ? '#e3f2fd' 
                      : '#ffffff',
                  borderRadius: '8px',
                  maxWidth: '80%',
                  marginLeft: message.role === 'user' ? 'auto' : '0',
                  marginRight: message.role === 'user' ? '0' : 'auto',
                  borderLeft: message.type === 'tool_use' ? '4px solid #9c27b0' : 'none'
                }}
              >
                <Box fontWeight="bold" margin={{ bottom: 'xs' }}>
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </Box>
                <Box>
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.split(/(\*\*.*?\*\*)/).map((part, j) => 
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={j}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </Box>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </Box>

        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <div style={{ flexGrow: 1 }}>
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
            />
          </div>
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
