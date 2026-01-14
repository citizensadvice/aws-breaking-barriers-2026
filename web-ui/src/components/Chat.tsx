import { useState, useEffect, useRef } from 'react'
import { invokeAgentCore, type ChatMessage } from '../services/awsCalls'
import { type Session, createSession, saveMessage } from '../services/bedrockSessionService'
import { submitFeedback } from '../services/feedbackService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ThinkingSection = ({ content }: { content: string }) => (
  <details className="ca-thinking">
    <summary>💭 Processing your question...</summary>
    <div>{content.replace(/<\/?thinking>/g, '').trim()}</div>
  </details>
)

const MarkdownRenderer = ({ content }: { content: string }) => (
  <div className="ca-markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
)

interface User { username: string; email?: string; userId: string; name?: string }

interface ChatProps {
  user: User
  currentSession: Session | null
  sessions?: Session[]
  onSwitchSession?: (sessionId: string) => void
  getMessages: (sessionId: string) => Promise<ChatMessage[]>
  refreshSessions?: () => Promise<void>
  updateCurrentSession?: (session: Session) => void
  onMessagesUpdate?: (messages: ChatMessage[]) => void
  onNewChat?: () => void
  canStartNewChat?: boolean
}

// Topics with distinct icons (shapes) for colorblind accessibility
const QUICK_TOPICS = [
  { label: 'Benefits', icon: '◆', desc: 'Universal Credit, PIP, Housing Benefit' },
  { label: 'Housing', icon: '■', desc: 'Tenancy rights, repairs, eviction' },
  { label: 'Employment', icon: '●', desc: 'Workplace issues, redundancy, pay' },
  { label: 'Consumer', icon: '▲', desc: 'Refunds, faulty goods, contracts' },
  { label: 'Debt', icon: '★', desc: 'Priority debts, budgeting help' },
  { label: 'Immigration', icon: '⬟', desc: 'Visas, status, right to work' },
]

const Chat = ({ user, currentSession, sessions = [], onSwitchSession, getMessages, refreshSessions, updateCurrentSession, onMessagesUpdate, onNewChat, canStartNewChat = true }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (currentSession) {
      getMessages(currentSession.id).then(msgs => {
        setMessages(msgs)
        onMessagesUpdate?.(msgs)
      })
    } else {
      setMessages([])
      onMessagesUpdate?.([])
    }
  }, [currentSession])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
  }

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return
    setLoading(true)
    setInputMessage('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    try {
      let sessionId = currentSession?.id
      if (!sessionId) {
        const newSession = await createSession(user.userId, text.slice(0, 50))
        sessionId = newSession.id
        updateCurrentSession?.(newSession)
        await refreshSessions?.()
      }

      await saveMessage(sessionId, 'user', text)

      await invokeAgentCore(text, user.userId, sessionId, (updater) => {
        setMessages(curr => {
          const newMsgs = updater(curr)
          const last = newMsgs[newMsgs.length - 1]
          if (last?.role === 'assistant' && !last.isStreaming && last.status === 'complete') {
            saveMessage(sessionId!, 'assistant', last.content).catch(console.error)
          }
          onMessagesUpdate?.(newMsgs)
          return newMsgs
        })
      })
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: `err-${Date.now()}`, 
        role: 'assistant', 
        content: 'I apologise, but something went wrong. Please try again or contact your local Citizens Advice bureau for immediate help.', 
        timestamp: new Date().toISOString() 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (msgId: string, type: 'up' | 'down') => {
    if (messageFeedback[msgId]) return
    try {
      await submitFeedback(msgId, type, user.userId)
      setMessageFeedback(prev => ({ ...prev, [msgId]: type }))
    } catch {}
  }

  return (
    <div className="ca-chat" role="main" aria-label="Chat with Citizens Advice assistant">
      <div className="ca-chat-header">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor="session-select" className="sr-only">Select conversation</label>
          <select 
            id="session-select"
            value={currentSession?.id || ''} 
            onChange={(e) => onSwitchSession?.(e.target.value)}
            aria-label="Select a conversation"
          >
            <option value="">Select conversation...</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.title || 'Untitled conversation'}</option>)}
          </select>
          <button 
            onClick={onNewChat} 
            disabled={!canStartNewChat} 
            className="ca-new-chat-btn"
            aria-label="Start a new conversation"
          >
            + New Chat
          </button>
        </div>
      </div>

      <div className="ca-messages" role="log" aria-live="polite" aria-label="Conversation messages">
        {messages.length === 0 && (
          <div className="ca-welcome-message">
            <h2>How can we help you today?</h2>
            <p>Get free, confidential advice on your rights and options. We're here to help.</p>
            <div className="ca-quick-topics" role="group" aria-label="Quick topic suggestions">
              {QUICK_TOPICS.map(topic => (
                <button 
                  key={topic.label} 
                  className="ca-topic-btn" 
                  onClick={() => handleSend(`I need help with ${topic.label.toLowerCase()}. ${topic.desc}`)}
                  aria-label={`Get help with ${topic.label}: ${topic.desc}`}
                >
                  <span className="icon" aria-hidden="true">{topic.icon}</span>
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`ca-message ca-message-${msg.role}`}
            role="article"
            aria-label={`${msg.role === 'user' ? 'Your message' : 'Advisor response'}`}
          >
            <div className="ca-message-bubble">
              {msg.thinkingContent && <ThinkingSection content={msg.thinkingContent} />}
              
              {msg.isStreaming ? (
                <span>
                  {msg.content}
                  <span className="ca-status-dot" style={{ display: 'inline-block', marginLeft: '4px' }} aria-hidden="true"></span>
                  <span className="sr-only">Response in progress</span>
                </span>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}

              {msg.status && msg.status !== 'complete' && (
                <div className="ca-status" aria-live="polite">
                  <span className="ca-status-dot" aria-hidden="true"></span>
                  <span>{msg.status}</span>
                </div>
              )}

              {msg.role === 'assistant' && !msg.isStreaming && (
                <div className="ca-feedback" role="group" aria-label="Rate this response">
                  <button 
                    onClick={() => handleFeedback(msg.id, 'up')} 
                    className={messageFeedback[msg.id] === 'up' ? 'active' : ''} 
                    aria-label="This was helpful"
                    aria-pressed={messageFeedback[msg.id] === 'up'}
                  >
                    <span aria-hidden="true">👍</span> Helpful
                  </button>
                  <button 
                    onClick={() => handleFeedback(msg.id, 'down')} 
                    className={messageFeedback[msg.id] === 'down' ? 'active' : ''} 
                    aria-label="This was not helpful"
                    aria-pressed={messageFeedback[msg.id] === 'down'}
                  >
                    <span aria-hidden="true">👎</span> Not helpful
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="ca-input-area">
        <form 
          className="ca-input-form" 
          onSubmit={(e) => { e.preventDefault(); handleSend(inputMessage) }}
          role="search"
        >
          <label htmlFor="message-input" className="sr-only">Type your question</label>
          <textarea
            id="message-input"
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => { setInputMessage(e.target.value); autoResize(e.target) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(inputMessage) }}}
            placeholder="Ask about benefits, housing, employment, consumer rights, debt..."
            disabled={loading}
            rows={1}
            aria-label="Type your question here"
          />
          <button 
            type="submit" 
            className="ca-send-btn" 
            disabled={!inputMessage.trim() || loading}
            aria-label={loading ? 'Sending message...' : 'Send message'}
          >
            {loading ? (
              <div className="ca-loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden="true"></div>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"/>
              </svg>
            )}
          </button>
        </form>
      </div>
      
      {/* Screen reader only styles */}
      <style>{`.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }`}</style>
    </div>
  )
}

export default Chat
