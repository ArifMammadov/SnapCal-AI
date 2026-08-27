import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../components/ui.js'
import { useChat, type ChatMessage } from '../lib/data.js'
import { useAppStore } from '../store/index.js'

function parseMetricFromText(text: string): { metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS'; value: number } | null {
  const t = text.toLowerCase().replace(/,/g, '.')
  const numMatch = t.match(/(\d+(?:\.\d+)?)/)
  if (!numMatch) return null
  const value = Number(numMatch[1])
  if (Number.isNaN(value) || value <= 0) return null

  // Water
  if (/\b(water|вода|пил|пила|выпил|выпила|ml|мл|литр|liter|litre)s?\b/.test(t)) {
    let ml = value
    if (/\b(л|литр|liter|litre)s?\b/.test(t)) ml = value * 1000
    return { metricType: 'WATER_ML', value: Math.round(ml) }
  }
  // Sleep
  if (/\b(sleep|сон|спал|спала|сплю|hours?|часов?|часа?)\b/.test(t)) {
    return { metricType: 'SLEEP_H', value: +value.toFixed(1) }
  }
  // Weight
  if (/\b(weight|вес|веся|кг|kg|kilos?)\b/.test(t)) {
    return { metricType: 'WEIGHT_KG', value: +value.toFixed(1) }
  }
  // Steps
  if (/\b(steps|шагов|шаги|шаг)\b/.test(t)) {
    return { metricType: 'STEPS', value: Math.round(value) }
  }
  return null
}

function parseActivityFromText(text: string): { type: string; distanceM?: number; stepsCount?: number; durationMin?: number } | null {
  const t = text.toLowerCase()
  const activityTypes: { type: string; patterns: string[] }[] = [
    { type: 'Running', patterns: ['ran', 'run', 'бег', 'бежал', 'пробеж'] },
    { type: 'Cycling', patterns: ['cycling', 'cycled', 'bike', 'велосипед', 'катал', 'ездил'] },
    { type: 'Swimming', patterns: ['swimming', 'swam', 'swim', 'плавал', 'плаван'] },
    { type: 'Walking', patterns: ['walking', 'walked', 'walk', 'ходил', 'гулял', 'шаг'] },
    { type: 'Gym', patterns: ['gym', 'workout', 'trained', 'тренажер', 'качал'] },
  ]
  let matchedType: string | null = null
  for (const { type, patterns } of activityTypes) {
    if (patterns.some((p) => t.includes(p))) {
      matchedType = type
      break
      }
    }
  if (!matchedType) return null

  // Extract numbers
  const numbers = [...t.matchAll(/\b(\d+(?:\.\d+)?)\s*(km|kilometers|m|meters|steps|min|minutes)?\b/g)]
  let distanceM: number | undefined
  let stepsCount: number | undefined
  let durationMin: number | undefined
  for (const m of numbers) {
    const value = Number(m[1])
    const unit = (m[2] || '').toLowerCase()
    if (unit === 'km' || unit === 'kilometers') distanceM = Math.round(value * 1000)
    else if (unit === 'm' || unit === 'meters') distanceM = Math.round(value)
    else if (unit === 'steps') stepsCount = Math.round(value)
    else if (unit === 'min' || unit === 'minutes') durationMin = Math.round(value)
    else if (matchedType === 'Walking' && value > 1000) stepsCount = Math.round(value)
    else if (!durationMin) durationMin = Math.round(value)
  }
  return { type: matchedType, distanceM, stepsCount, durationMin }
}

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)

function buildPendingFoodData(pending: { foodData: any; imageUrl?: string }): any {
  return {
    ...pending.foodData,
    imageUrl: pending.imageUrl,
  }
}

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
  const { messages, sending, sendMessage, sendPhoto, logMetric, logFood, logActivity, setMessages, clearHistory } = useChat()
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

    // Try to extract metric from free-form text (e.g. "я выпил 300 мл воды", " slept 7 hours")
    const parsedMetric = parseMetricFromText(text)
    if (parsedMetric) {
      logMetric(parsedMetric.metricType, parsedMetric.value, false)
      return
    }

    // Check for pending metric confirmation before sending to AI
    const pending = findPendingMetric(messages)
    if (pending && detectConfirmation(text)) {
      // Remove the pending confirmation message from UI
      setMessages((prev) => prev.filter((m) => m.id !== pending.confirmationMessageId))
      logMetric(pending.metricType, pending.value, true)
      return
    }

    // Check for pending food log confirmation (after AI photo analysis)
    const pendingFood = findPendingFood(messages)
    if (pendingFood) {
      if (detectConfirmation(text)) {
        // Mark the AI confirmation message as resolved and log the food
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingFood.confirmationMessageId && m.role === 'AI'
              ? { ...m, pendingConfirmation: false, pendingAction: undefined }
              : m,
          ),
        )
        logFood(buildPendingFoodData(pendingFood))
        return
      }
      // Any other answer counts as "no" — just send a normal message and clear the pending flag
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingFood.confirmationMessageId && m.role === 'AI'
            ? { ...m, pendingConfirmation: false, pendingAction: undefined }
            : m,
        ),
      )
    }

    sendMessage(text)
  }, [input, sending, messages, setMessages, logMetric, logFood, sendMessage])

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

  const mealEmoji = (type?: string) => {
    const map: Record<string, string> = { BREAKFAST: '🍳', LUNCH: '🍽️', DINNER: '🥗', SNACK: '🍎' }
    return map[type ?? ''] ?? '🍽️'
  }

  function FoodAnalysisCard({ foodData, imageUrl, question }: { foodData: any; imageUrl?: string; question?: string }) {
    if (!foodData) {
      return (
        <div style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          {imageUrl && <img src={imageUrl} alt="food photo" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />}
          <div style={{ padding: '14px 16px' }}>
            <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {IS_RUSSIAN ? 'Анализирую фото...' : 'Analyzing photo...'}
              <span className="spinner" style={{ width: 14, height: 14, border: '2px solid var(--text-secondary)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{IS_RUSSIAN ? 'Секундочку' : 'Please wait'}</p>
          </div>
        </div>
      )
    }

    const macroLabels = IS_RUSSIAN
      ? { calories: 'Калории', protein: 'Белок', carbs: 'Углеводы', fat: 'Жиры', serving: 'Порция' }
      : { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', serving: 'Serving' }

    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,138,0.15) 0%, rgba(59,130,246,0.15) 100%)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(0,212,138,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            {mealEmoji(foodData.suggestedMealType)}
          </div>
          <div style={{ flex: 1 }}>
            <p className="font-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {foodData.name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              {macroLabels.serving}: {foodData.serving}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--orange)', margin: 0, lineHeight: 1 }}>
              {foodData.calories}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
          </div>
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="food photo" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: '12px 16px 16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: question ? 12 : 0 }}>
            {[
              { label: macroLabels.protein, value: foodData.proteinG, unit: 'g', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
              { label: macroLabels.carbs, value: foodData.carbsG, unit: 'g', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
              { label: macroLabels.fat, value: foodData.fatG, unit: 'g', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
            ].map((m) => (
              <div key={m.label} style={{ flex: 1, padding: '10px 8px', background: m.bg, borderRadius: 12, textAlign: 'center' }}>
                <p className="font-display" style={{ fontSize: 17, fontWeight: 700, color: m.color, margin: 0 }}>
                  {m.value}
                  <span style={{ fontSize: 11, marginLeft: 1 }}>{m.unit}</span>
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>{m.label}</p>
              </div>
            ))}
          </div>
          {question && (
            <div
              style={{
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 12,
                border: '1px dashed var(--border)',
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{question}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'USER'
    const foodData = msg.attachments?.foodData
    const imageUrl = msg.attachments?.imageUrl
    const isFoodAnalysis = !!foodData

    if (isFoodAnalysis) {
      return <FoodAnalysisCard foodData={foodData} imageUrl={!isUser ? imageUrl : undefined} question={!isUser ? msg.content : undefined} />
    }

    if (isUser && imageUrl) {
      return <FoodAnalysisCard foodData={foodData} imageUrl={imageUrl} />
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
    if (msg.role === 'AI' && msg.attachments?.pendingMetric) {
      return {
        metricType: msg.attachments.pendingMetric.metricType,
        value: msg.attachments.pendingMetric.value,
        confirmationMessageId: msg.id,
      }
    }
    if (msg.role === 'USER') break
  }
  return null
}

function findPendingFood(messages: ChatMessage[]): { foodData: any; imageUrl?: string; confirmationMessageId: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'AI' && msg.pendingConfirmation && msg.pendingAction === 'LOG_FOOD' && msg.attachments?.foodData) {
      return {
        foodData: msg.attachments.foodData,
        imageUrl: msg.attachments.imageUrl,
        confirmationMessageId: msg.id,
      }
    }
    // Stop scanning once we hit the user's photo message or a newer AI response
    if (msg.role === 'USER' && msg.attachments?.imageUrl) break
  }
  return null
}
