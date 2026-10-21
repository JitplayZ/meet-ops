import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatSession } from '@google/generative-ai';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export default function ChatBot() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "👋 Hi! I'm your AI Meeting Booking Assistant. I can help you find rooms, check availability, book meetings, or show your bookings. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const sessionPromiseRef = useRef<Promise<ChatSession | null> | null>(null);

  // Lazily create (or reuse) the Gemini chat session. Never rejects: returns
  // null when the API key is missing or session creation fails, so the caller
  // can fall back to the local rule-based assistant.
  const ensureChatSession = (): Promise<ChatSession | null> => {
    if (chatSessionRef.current) return Promise.resolve(chatSessionRef.current);
    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = import('@/services/aiService')
        .then(({ createChatSession }) => createChatSession(profile?.name || 'Guest'))
        .then(session => {
          chatSessionRef.current = session;
          if (!session) {
            sessionPromiseRef.current = null; // allow a retry on the next message
          }
          return session;
        })
        .catch(() => {
          sessionPromiseRef.current = null;
          return null;
        });
    }
    return sessionPromiseRef.current;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const session = await ensureChatSession();
      let responseText = '';

      if (session) {
        let response = await session.sendMessage(userMessage.content);

        try {
          responseText = response.response.text();
        } catch (e) {
          // text() can throw if only function calls were returned
        }

        let functionCalls = response.response.functionCalls();

        const { handleFunctionCall } = await import('@/services/aiService');

        while (functionCalls && functionCalls.length > 0) {
          const functionResponses = await Promise.all(
            functionCalls.map(async (call) => {
              const result = await handleFunctionCall(call, profile?.uid || '', profile?.name || 'Guest');
              return {
                functionResponse: {
                  name: call.name,
                  response: result,
                },
              };
            })
          );
          response = await session.sendMessage(functionResponses);
          try {
            responseText = response.response.text();
          } catch (e) {
            // ignore
          }
          functionCalls = response.response.functionCalls();
        }
      }

      if (!responseText) {
        // Gemini unavailable (missing/invalid key, network error) or returned
        // no text: fall back to the local rule-based booking assistant so the
        // chat flow still works end to end.
        const { processChatMessage } = await import('@/services/chatbotService');
        const fallback = await processChatMessage(userMessage.content, profile?.uid, profile?.name);
        responseText = fallback.response;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || 'Done.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      let fallbackText: string | null = null;
      try {
        const { processChatMessage } = await import('@/services/chatbotService');
        const fallback = await processChatMessage(userMessage.content, profile?.uid, profile?.name);
        fallbackText = fallback.response;
      } catch {
        // fall through to error message
      }
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackText || `Sorry, I encountered an error: ${err.message || 'Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function formatContent(content: string) {
    return content.split('\n').map((line, i) => {
      const formatted = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/• /g, '• ');
      
      return (
        <span
          key={i}
          dangerouslySetInnerHTML={{ __html: formatted }}
          style={{ display: 'block', marginBottom: line.trim() ? '6px' : '0' }}
        />
      );
    });
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  return (
    <>
      {/* Redesigned Floating Chat Launcher (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Booking Assistant"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-surface-dark)',
          color: 'var(--meetops-purple)',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)';
          e.currentTarget.style.background = 'var(--meetops-purple)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.2)';
          e.currentTarget.style.background = 'var(--color-surface-dark)';
          e.currentTarget.style.color = 'var(--meetops-purple)';
        }}
      >
        {isOpen ? (
          <X size={24} strokeWidth={2.5} />
        ) : (
          <div style={{ position: 'relative', display: 'flex' }}>
            <MessageCircle size={24} strokeWidth={2.5} />
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--color-secondary)',
                border: '1px solid var(--color-surface-dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={6} color="white" strokeWidth={3} />
            </span>
          </div>
        )}
      </button>

      {/* Redesigned Glassmorphic Chat Window */}
      {isOpen && (
        <>
          {/* Background overlay */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
              animation: 'fadeIn 0.2s ease-out forwards',
            }}
            onClick={() => setIsOpen(false)}
          />
          
          <div
            className="glass-panel"
            style={{
              position: 'fixed',
              bottom: 96,
              right: 24,
              width: 420,
              height: 640,
              maxHeight: 'calc(100vh - 120px)',
              borderRadius: '20px',
              boxShadow: 'var(--shadow-ambient)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
              overflow: 'hidden',
              opacity: 0,
              transform: 'translateY(20px) scale(0.95)',
              animation: 'slideUpIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              textAlign: 'left',
            }}
          >
            {/* Header - Purple Gradient */}
            <div
              style={{
                padding: '18px 20px',
                background: 'linear-gradient(135deg, var(--meetops-purple) 0%, #6D28D9 100%)',
                borderBottom: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {/* Bot Avatar */}
              <div
                style={{
                  position: 'relative',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <Bot size={20} strokeWidth={2} color="white" />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--color-secondary)',
                    border: '2px solid var(--meetops-purple)',
                  }}
                />
              </div>
              
              {/* Title Header */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'white' }}>
                  Meeting Assistant
                </h3>
                <p style={{ fontSize: '0.75rem', margin: '2px 0 0 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                  AI-powered booking help
                </p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  width: 32,
                  height: 32,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Chat History Panel */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                background: 'rgba(11, 12, 14, 0.4)',
              }}
            >
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    maxWidth: '85%',
                    alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    opacity: 0,
                    animation: `messageSlideIn 0.3s ease-out ${index * 0.05}s forwards`,
                  }}
                >
                  {message.role === 'assistant' && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--meetops-purple)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <Bot size={14} color="white" strokeWidth={2.5} />
                    </div>
                  )}
                  
                  {/* Bubble content */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '16px',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, var(--meetops-purple) 0%, #6D28D9 100%)'
                        : 'var(--color-surface-container-low)',
                      color: 'white',
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      wordBreak: 'break-word',
                      border: message.role === 'assistant' ? '1px solid var(--color-border-subtle)' : 'none',
                    }}
                  >
                    <div>{formatContent(message.content)}</div>
                    <div
                      style={{
                        fontSize: '9px',
                        marginTop: 4,
                        color: 'var(--color-on-surface-variant)',
                        textAlign: message.role === 'user' ? 'right' : 'left',
                        opacity: 0.7,
                      }}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Thinking loader */}
              {isLoading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                    maxWidth: '85%',
                    alignSelf: 'flex-start',
                    opacity: 0,
                    animation: 'messageSlideIn 0.3s ease-out forwards',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--meetops-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={14} color="white" />
                  </div>
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '16px',
                      background: 'var(--color-surface-container-low)',
                      border: '1px solid var(--color-border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Loader2 size={14} color="var(--meetops-purple)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Area */}
            <form
              onSubmit={handleSubmit}
              style={{
                padding: '14px 16px',
                background: 'var(--color-surface-dark)',
                borderTop: '1px solid var(--color-border-subtle)',
                display: 'flex',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about meetings, rooms..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface-container-low)',
                  border: '1px solid var(--color-border-subtle)',
                  color: 'white',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--meetops-purple)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-border-subtle)'}
              />
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                style={{
                  width: 34,
                  height: 34,
                  background: input.trim() && !isLoading ? 'var(--meetops-purple)' : 'var(--color-surface-container-highest)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}
      
      {/* Global CSS Inject */}
      <style>{`
        @keyframes slideUpIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}