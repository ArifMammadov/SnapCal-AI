import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../components/ui.js'
import { useChat, type ChatMessage } from '../lib/data.js'
import { useAppStore } from '../store/index.js'

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)

const suggestedPrompts = IS_RUSSIAN
  ? [
      '📸 Проанализируй фото еды',
      '🍽️ Что приготовить на ужин?',
      '💊 Нужны ли мне добавки?',
      '🏋️ Что есть перед тренировкой?',
      '😴 Как сон влияет на вес?',
      '💧 Пью ли я достаточно воды?',
    ]
  : [
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

function detectConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim()
  return ['да', 'yes', 'д', 'y', 'ок', 'ok', 'давай', 'запиши'].includes(lower)
}

export function AICoachScreen() {
  const user = useAppStore((s) => s.user)
  const { messages, sending, sendMessage, sendPhoto, logMetric, setMessages, clearHistory } = useChat()
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    // Check for pending metric confirmation before sending to AI
    const pending = findPendingMetric(messages)
    if (pending && detectConfirmation(text)) {
      // Remove the pending confirmation message from UI
      setMessages((prev) => prev.filter((m) => m.id !== pending.confirmationMessageId))
      logMetric(pending.metricType, pending.value, true)
      return
    }

    sendMessage(text)
  }, [input, sending, messages, setMessages, logMetric, sendMessage])

  const handleNewChat = useCallback(async () => {
    if (window.confirm(IS_RUSSIAN ? 'Очистить историю чата?' : 'Clear chat history?')) {
      const ok = await clearHistory()
      if (ok) inputRef.current?.focus()
    }
  }, [clearHistory])

  const quickActions = [
    { label: '💧 Вода', metric: ['WATER_ML', 250] as const },
    { label: '😴 Сон', metric: ['SLEEP_H', 7.5] as const },
    { label: '⚖️ Вес', metric: ['WEIGHT_KG', 0] as const },
    { label: '👟 Шаги', metric: ['STEPS', 5000] as const },
  ]

  const handleQuickMetric = useCallback((metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS', value: number) => {
    if (metricType === 'WEIGHT_KG') {
      const weightStr = window.prompt(IS_RUSSIAN ? 'Введите ваш вес в кг' : 'Enter your weight in kg')
      const weight = Number(weightStr)
      if (!weightStr || Number.isNaN(weight) || weight <= 0) return
      logMetric('WEIGHT_KG', weight, false)
      return
    }
    logMetric(metricType, value, false)
  }, [logMetric])

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      window.alert(IS_RUSSIAN ? 'Голосовой ввод не поддерживается в этом браузере.' : 'Voice input is not supported in this browser.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = user?.languageCode ?? (IS_RUSSIAN ? 'ru-RU' : LOCALE)
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      inputRef.current?.focus()
    }
    recognition.onerror = () => {
      setListening(false)
      window.alert(IS_RUSSIAN ? 'Не удалось распознать голос. Попробуйте ещё раз.' : 'Could not recognize voice. Please try again.')
    }
    recognitionRef.current = recognition
    recognition.start()
  }, [listening, user?.languageCode])

  const greeting = buildGreeting(user)

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'USER'
    const foodData = msg.attachments?.foodData
    const imageUrl = msg.attachments?.imageUrl

    if (isUser && (foodData || imageUrl)) {
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
                <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {foodData ? foodData.name : (IS_RUSSIAN ? 'Анализирую фото...' : 'Analyzing photo...')}
                  {!foodData && (
                    <span className="spinner" style={{ width: 14, height: 14, border: '2px solid var(--text-secondary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                  )}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  {foodData ? foodData.serving : (IS_RUSSIAN ? 'Секундочку' : 'Please wait')}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <button
            onClick={handleNewChat}
            aria-label={IS_RUSSIAN ? 'Новый чат' : 'New chat'}
            title={IS_RUSSIAN ? 'Новый чат' : 'New chat'}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
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
        {quickActions.map((a) => (
          <button
            key={a.label}
            onClick={() => handleQuickMetric(a.metric[0], a.metric[1])}
            className="chip"
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              background: 'var(--blue-dim)',
              border: '1px solid var(--blue)',
              borderRadius: 20,
              color: 'var(--blue)',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {a.label}
          </button>
        ))}
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
                  {greeting}
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
              placeholder={IS_RUSSIAN ? 'Спросите о питании или тренировках...' : 'Ask about nutrition or fitness...'}
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
            onClick={input.trim() ? handleSend : toggleVoice}
            aria-label={input.trim() ? 'Send message' : listening ? 'Stop voice input' : 'Voice message'}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: input.trim() ? 'var(--green)' : listening ? 'var(--rose)' : 'var(--bg-elevated)',
              border: input.trim() || listening ? 'none' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s ease',
              color: input.trim() || listening ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {input.trim() ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            ) : listening ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <rect x="6" y="6" width="12" height="12" rx="2" />
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

function buildGreeting(user: { firstName?: string | null; languageCode?: string } | null): string {
  const isRu = user?.languageCode ? /^ru/.test(user.languageCode) : IS_RUSSIAN
  const name = user?.firstName?.trim()
  const greeting = isRu
    ? `Привет${name ? ', ' + name : ''}! 👋 Я ваш AI-коуч по питанию и фитнесу. Задавайте вопросы, присылайте фото еды или просто расскажите, что вы съели — я помогу с подсчётом калорий и макросов.`
    : `Good morning${name ? ', ' + name : ''}! 👋 I'm your AI nutrition coach. Ask questions, send food photos, or tell me what you ate — I'll help track calories and macros.`
  return greeting
}

function findPendingMetric(messages: ChatMessage[]): { metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS'; value: number; confirmationMessageId: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'AI' && msg.metadata?.pendingMetric) {
      return {
        metricType: msg.metadata.pendingMetric.metricType,
        value: msg.metadata.pendingMetric.value,
        confirmationMessageId: msg.id,
      }
    }
    if (msg.role === 'USER') break
  }
  return null
}
