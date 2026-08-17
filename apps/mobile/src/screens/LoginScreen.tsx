import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { useAppStore } from '../store/index.js'
import { Card, Button, Avatar } from '../components/ui.js'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string
        initDataUnsafe?: { user?: any }
        ready: () => void
        expand: () => void
        onEvent?: (event: string, handler: () => void) => void
        offEvent?: (event: string, handler: () => void) => void
        isReady?: boolean
      }
    }
  }
}

type OnboardingStep = 'login' | 'onboarding' | 'complete'
type Gender = 'MALE' | 'FEMALE' | 'OTHER'
type PrimaryGoal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE' | 'HEALTH'

interface OnboardingData {
  age: number
  gender: Gender
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number | null
  primaryGoal: PrimaryGoal
}

function getPrimaryGoalLabel(goal: PrimaryGoal): string {
  switch (goal) {
    case 'FAT_LOSS': return 'Похудеть'
    case 'MUSCLE_GAIN': return 'Набрать массу'
    case 'MAINTENANCE': return 'Быть в тонусе'
    case 'HEALTH': return 'Улучшить здоровье'
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getUrlParam(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export function LoginScreen() {
  const [step, setStep] = useState<OnboardingStep>('login')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tgUser, setTgUser] = useState<any>(null)
  const [debug, setDebug] = useState<string>('')
  const setUser = useAppStore((s) => s.setUser)
  const setToken = useAppStore((s) => s.setToken)

  const [onboarding, setOnboarding] = useState<OnboardingData>({
    age: 30,
    gender: 'MALE',
    heightCm: 170,
    currentWeightKg: 70,
    targetWeightKg: null,
    primaryGoal: 'HEALTH',
  })

  const isProduction = import.meta.env.VITE_NODE_ENV === 'production' || !import.meta.env.VITE_ALLOW_DEMO

  useEffect(() => {
    let cancelled = false

    const runLogin = async () => {
      // 1. Try start_token from URL first (fallback when initData is unavailable)
      const startToken = getUrlParam('start_token')
      if (startToken) {
        setDebug('found start_token in URL')
        try {
          const res = await api.post('/auth/start-token', { token: startToken })
          const { accessToken, user } = res.data
          setToken(accessToken)
          setUser(user)

          const statusRes = await api.get('/users/me/onboarding-status', {
            headers: { Authorization: 'Bearer ' + accessToken },
          })
          if (statusRes.data.onboardingCompleted) {
            setStep('complete')
          } else {
            setStep('onboarding')
          }
          return
        } catch (err: any) {
          const serverMsg = err.response?.data?.error?.message || ''
          setError(serverMsg || err.message || 'Start token login failed')
          setDebug('start_token error: ' + serverMsg)
          setLoading(false)
          return
        }
      }

      // 2. Try Telegram initData
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

      try {
        webApp?.ready()
        webApp?.expand()
      } catch {
        // ignore
      }

      let attempts = 0
      const maxAttempts = 60
      let lastInitDataLen = 0
      let lastUserName = ''

      while (!cancelled && attempts < maxAttempts) {
        const initData = webApp?.initData
        const user = webApp?.initDataUnsafe?.user
        attempts++

        if (user) {
          setTgUser(user)
          lastUserName = user.first_name || user.username || 'unknown'
        }
        lastInitDataLen = initData?.length || 0
        setDebug(`attempt=${attempts}, initDataLen=${lastInitDataLen}, user=${lastUserName}`)

        if (initData && user) {
          break
        }

        await wait(200)
      }

      const initData = webApp?.initData
      const user = webApp?.initDataUnsafe?.user

      if (!initData || !user) {
        if (cancelled) return
        setDebug(`no initData after ${maxAttempts} attempts. initDataLen=${lastInitDataLen}, user=${lastUserName}`)
        if (!webApp) {
          setError('Это приложение работает только внутри Telegram Mini App.')
        } else {
          setError('Не удалось получить данные Telegram. Убедитесь, что вы открыли приложение через кнопку бота.')
        }
        setLoading(false)
        return
      }

      if (cancelled) return
      setError('')
      setDebug(`sending /auth/telegram, user=${user.first_name || user.username || 'unknown'}`)

      try {
        const res = await api.post('/auth/telegram', { initData })
        const { accessToken, user: apiUser } = res.data
        setToken(accessToken)
        setUser(apiUser)

        const statusRes = await api.get('/users/me/onboarding-status', {
          headers: { Authorization: 'Bearer ' + accessToken },
        })
        if (statusRes.data.onboardingCompleted) {
          setStep('complete')
        } else {
          setStep('onboarding')
        }
      } catch (err: any) {
        const serverMsg = err.response?.data?.error?.message || ''
        const serverCode = err.response?.data?.error?.code || ''
        setError(serverMsg || err.message || 'Login failed')
        setDebug(`auth error code=${serverCode}, msg=${serverMsg}`)
      } finally {
        setLoading(false)
      }
    }

    runLogin()
    return () => {
      cancelled = true
    }
  }, [setToken, setUser])

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')
    setDebug('demo login requested')
    try {
      const res = await api.post('/auth/demo')
      const { accessToken, user } = res.data
      setToken(accessToken)
      setUser(user)
      setStep('onboarding')
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const submitOnboarding = async () => {
    setLoading(true)
    setError('')
    try {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - onboarding.age)

      const update = {
        birthDate: birthDate.toISOString(),
        gender: onboarding.gender,
        heightCm: onboarding.heightCm,
        currentWeightKg: onboarding.currentWeightKg,
        targetWeightKg: onboarding.targetWeightKg ?? undefined,
        primaryGoal: onboarding.primaryGoal,
        activityLevel: 'MODERATE',
      }

      await api.patch('/users/me/profile', update)
      setStep('complete')
      const me = await api.get('/users/me')
      setUser(me.data)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'onboarding') {
    return (
      <OnboardingForm
        tgUser={tgUser}
        onboarding={onboarding}
        setOnboarding={setOnboarding}
        loading={loading}
        error={error}
        onSubmit={submitOnboarding}
      />
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥗</div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          SnapCal AI
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
          AI nutrition coach, calorie tracker, and transformation plans
        </p>

        {error && <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--rose-dim)', borderRadius: 12, color: 'var(--rose)', fontSize: 13 }}>{error}</div>}

        {loading ? (
          <>
            <p style={{ color: 'var(--text-secondary)' }}>Вход...</p>
            {debug && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, wordBreak: 'break-all' }}>{debug}</p>}
          </>
        ) : (
          <>
            {!isProduction && (
              <Button variant="primary" size="lg" fullWidth onClick={handleDemoLogin} disabled={loading}>
                Начать путь
              </Button>
            )}
            {debug && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, wordBreak: 'break-all' }}>{debug}</p>}
          </>
        )}
      </Card>
    </div>
  )
}

interface OnboardingFormProps {
  tgUser: any
  onboarding: OnboardingData
  setOnboarding: (v: OnboardingData) => void
  loading: boolean
  error: string
  onSubmit: () => void
}

function OnboardingForm({ tgUser, onboarding, setOnboarding, loading, error, onSubmit }: OnboardingFormProps) {
  const goals: { value: PrimaryGoal; label: string; emoji: string }[] = [
    { value: 'FAT_LOSS', label: 'Похудеть', emoji: '📉' },
    { value: 'MUSCLE_GAIN', label: 'Набрать массу', emoji: '💪' },
    { value: 'MAINTENANCE', label: 'Быть в тонусе', emoji: '⚖️' },
    { value: 'HEALTH', label: 'Улучшить здоровье', emoji: '🌿' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '28px 24px',
          textAlign: 'center',
        }}
      >
        {tgUser && (
          <div style={{ marginBottom: 20 }}>
            <Avatar src={tgUser.photo_url} fallback={tgUser.first_name?.[0] || '👤'} size={64} />
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 0' }}>
              Привет, {tgUser.first_name || 'друг'}!
            </p>
          </div>
        )}

        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Расскажите о себе
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
          Это нужно, чтобы рассчитать ваши персональные нормы калорий, белков, жиров и углеводов.
        </p>

        {error && <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--rose-dim)', borderRadius: 12, color: 'var(--rose)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
          <NumberField
            label="Сколько вам лет?"
            value={onboarding.age}
            onChange={(v) => setOnboarding({ ...onboarding, age: v })}
            min={10}
            max={120}
          />

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Пол</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'MALE', label: 'Мужской' },
                { value: 'FEMALE', label: 'Женский' },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => setOnboarding({ ...onboarding, gender: g.value as Gender })}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    border: onboarding.gender === g.value ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: onboarding.gender === g.value ? 'var(--green-dim)' : 'var(--bg-elevated)',
                    color: onboarding.gender === g.value ? 'var(--green)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <NumberField
            label="Рост (см)"
            value={onboarding.heightCm}
            onChange={(v) => setOnboarding({ ...onboarding, heightCm: v })}
            min={50}
            max={300}
          />

          <NumberField
            label="Текущий вес (кг)"
            value={onboarding.currentWeightKg}
            onChange={(v) => setOnboarding({ ...onboarding, currentWeightKg: v })}
            min={20}
            max={300}
          />

          <NumberField
            label="Желаемый вес (кг) — необязательно"
            value={onboarding.targetWeightKg ?? 0}
            onChange={(v) => setOnboarding({ ...onboarding, targetWeightKg: v === 0 ? null : v })}
            min={20}
            max={300}
            optional
          />

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Ваша цель</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setOnboarding({ ...onboarding, primaryGoal: g.value })}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: onboarding.primaryGoal === g.value ? '1px solid var(--green)' : '1px solid var(--border)',
                    background: onboarding.primaryGoal === g.value ? 'var(--green-dim)' : 'var(--bg-elevated)',
                    color: onboarding.primaryGoal === g.value ? 'var(--green)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{g.emoji}</div>
                  <div style={{ fontSize: 13 }}>{g.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Button variant="primary" size="lg" fullWidth onClick={onSubmit} disabled={loading}>
            {loading ? 'Сохранение...' : `Продолжить — ${getPrimaryGoalLabel(onboarding.primaryGoal)}`}
          </Button>
        </div>
      </Card>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number | ''
  onChange: (v: number) => void
  min: number
  max: number
  optional?: boolean
}

function NumberField({ label, value, onChange, min, max, optional }: NumberFieldProps) {
  return (
    <div>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') {
            if (optional) onChange(min)
            return
          }
          const n = Number(raw)
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          fontSize: 16,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
