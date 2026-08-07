import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui.js'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  type?: 'text' | 'food-analysis' | 'macro-card'
  timestamp: string
  foodData?: {
    name: string
    image: string
    calories: number
    protein: number
    carbs: number
    fat: number
    serving: string
  }
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'ai',
    type: 'text',
    timestamp: '8:30 AM',
    content: "Good morning! 👋 I'm your AI nutrition coach. I've analyzed your stats — you're doing great this week. How can I help you today?",
  },
]

const suggestedPrompts = [
  '📸 Analyze a food photo',
  '🍽️ Plan my dinner',
  '💊 Do I need supplements?',
  '🏋️ Pre-workout meal ideas',
  '😴 How does sleep affect weight?',
  '💧 Am I drinking enough water?',
]

export function AICoachScreen() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text.trim(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        type: 'text',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: "I'm your AI coach. I can analyze food photos, plan meals, and answer nutrition questions. (Backend integration coming next.)",
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 1500)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          padding: '56px 20px 16px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🤖
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--green)',
                border: '2px solid var(--bg-card)',
              }}
            />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              SnapCal AI Coach
            </h1>
            <p style={{ fontSize: 12, color: 'var(--green)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              Online · Nutrition & Fitness Expert
            </p>
          </div>
        </div>
      </header>

      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 16px',
          overflowX: 'auto',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {suggestedPrompts.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            className="chip"
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="fade-in"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              {msg.role === 'ai' && (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  🤖
                </div>
              )}

              <div style={{ maxWidth: '80%', minWidth: 60 }}>
                {msg.type === 'macro-card' && msg.foodData ? (
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: 18,
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <img
                      src={msg.foodData.image}
                      alt={msg.foodData.name}
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div>
                          <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            {msg.foodData.name}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                            {msg.foodData.serving}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--orange)', margin: 0, lineHeight: 1 }}>
                            {msg.foodData.calories}
                          </p>
                          <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        {[
                          { label: 'Protein', value: msg.foodData.protein, unit: 'g', color: 'var(--green)' },
                          { label: 'Carbs', value: msg.foodData.carbs, unit: 'g', color: 'var(--amber)' },
                          { label: 'Fat', value: msg.foodData.fat, unit: 'g', color: 'var(--orange)' },
                        ].map((m) => (
                          <div
                            key={m.label}
                            style={{
                              flex: 1,
                              padding: '8px',
                              background: 'var(--bg-elevated)',
                              borderRadius: 10,
                              textAlign: 'center',
                            }}
                          >
                            <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: m.color, margin: 0 }}>
                              {m.value}
                              {m.unit}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{m.label}</p>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="primary" size="sm" style={{ flex: 1 }}>✓ Save to Log</Button>
                        <Button variant="secondary" size="sm">✏️ Edit</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: msg.role === 'user' ? 'var(--green)' : 'var(--bg-card)',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.content}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                        margin: '6px 0 0',
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                      }}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="fade-in" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                🤖
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  gap: 4,
                  alignItems: 'center',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="typing-dot"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--purple)',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '12px 16px 16px',
          background: 'var(--bg-card)',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            aria-label="Upload food photo"
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'var(--text-secondary)',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: '0 14px',
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask about nutrition or fitness..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 14,
                padding: '10px 0',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            onClick={() => (input.trim() ? sendMessage(input) : null)}
            aria-label={input.trim() ? 'Send message' : 'Voice message'}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: input.trim() ? 'var(--green)' : 'var(--bg-elevated)',
              border: input.trim() ? 'none' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s ease',
              color: input.trim() ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {input.trim() ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
