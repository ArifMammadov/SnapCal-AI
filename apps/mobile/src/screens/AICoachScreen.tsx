import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui.js'
import { useChat, type ChatMessage } from '../lib/data.js'

const suggestedPrompts = [
  '📸 Analyze a food photo',
  '🍽️ Plan my dinner',
  '💊 Do I need supplements?',
  '🏋️ Pre-workout meal ideas',
  '😴 How does sleep affect weight?',
  '💧 Am I drinking enough water?',
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AICoachScreen() {
  const { messages, sending, sendMessage, sendPhoto } = useChat()
  const [input, setInput] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const handleSend = () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    sendMessage(text)
  }

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'USER'
    const foodData = msg.attachments?.foodData
    const imageUrl = msg.attachments?.imageUrl

    if (foodData || imageUrl) {
      return (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 18,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {imageUrl && !foodData && (
            <img
              src={imageUrl}
              alt="food photo"
              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {foodData ? foodData.name : 'Analyzing photo...'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {foodData ? foodData.serving : 'Please wait'}
                </p>
              </div>
              {foodData && (
                <div style={{ textAlign: 'right' }}>
                  <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--orange)', margin: 0, lineHeight: 1 }}>
                    {foodData.calories}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                </div>
              )}
            </div>
            {foodData && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Protein', value: foodData.proteinG, unit: 'g', color: 'var(--green)' },
                  { label: 'Carbs', value: foodData.carbsG, unit: 'g', color: 'var(--amber)' },
                  { label: 'Fat', value: foodData.fatG, unit: 'g', color: 'var(--orange)' },
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
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        style={{
          padding: '12px 14px',
          background: isUser ? 'var(--green)' : 'var(--bg-card)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: isUser ? '#fff' : 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.content}
        </p>
        <p
          style={{
            fontSize: 10,
            color: isUser ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
            margin: '6px 0 0',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {formatTime(msg.createdAt)}
        </p>
      </div>
    )
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
            onClick={() => {
              setInput('')
              sendMessage(p)
            }}
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
          {messages.length === 0 && (
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
                  padding: '12px 14px',
                  background: 'var(--bg-card)',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                  Good morning! 👋 I'm your AI nutrition coach. I've analyzed your stats — you're doing great this week. How can I help you today?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className="fade-in"
              style={{
                display: 'flex',
                flexDirection: msg.role === 'USER' ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              {msg.role === 'AI' && (
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

              <div style={{ maxWidth: '80%', minWidth: 60 }}>{renderMessage(msg)}</div>
            </div>
          ))}

          {sending && (
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
            onClick={() => fileRef.current?.click()}
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
          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setPreviewImage(URL.createObjectURL(file))
                sendPhoto(file)
              }
              if (fileRef.current) fileRef.current.value = ''
            }}
          />

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
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
            onClick={handleSend}
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
