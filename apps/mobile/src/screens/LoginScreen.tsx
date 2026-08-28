import { useEffect, useState } from 'react'
import { api, setAuthTokens } from '../lib/api.js'
import { useAppStore } from '../store/index.js'
import { Card, Button, Avatar, CalendarIcon, UserIcon, RulerIcon, ScaleIcon, TargetIcon, DumbbellIcon, ActivityIcon, CoachIcon, ArrowRightIcon } from '../components/ui.js'
import type { TelegramWebApp } from '../types/telegram.js'

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
  name: string
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

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
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
  const setRefreshToken = useAppStore((s) => s.setRefreshToken)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const [onboarding, setOnboarding] = useState<OnboardingData>({
    age: 30,
    gender: 'MALE',
    heightCm: 170,
    currentWeightKg: 70,
    targetWeightKg: null,
    primaryGoal: 'HEALTH',
    name: '',
  })
  const [authUser, setAuthUser] = useState<any>(null)

  useEffect(() => {
    let cancelled = false

    const finishAuth = async (accessToken: string, refreshToken: string, authUser: any) => {
      if (cancelled) return
      setAuthTokens(accessToken, refreshToken)
      setToken(accessToken)
      setRefreshToken(refreshToken)
      setAuthUser(authUser)

      const profile = authUser?.profile
      const needsOnboarding = !profile || !profile.gender || !profile.heightCm || !profile.currentWeightKg || !profile.primaryGoal

      if (needsOnboarding) {
        setStep('onboarding')
      } else {
        setUser(authUser)
        setStep('complete')
      }
    }

    const tryStartToken = async (): Promise<boolean> => {
      const startToken = getUrlParam('start_token') || getUrlParam('tgWebAppStartParam')
      if (!startToken) return false
      setDebug(`found start_token in URL: ${startToken.slice(0, 8)}...`)
      try {
        const res = await api.post('/auth/start-token', { token: startToken })
        await finishAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
        return true
      } catch (err: any) {
        const serverMsg = err.response?.data?.error?.message || err.message || ''
        setDebug('start_token error: ' + serverMsg)
        return false
      }
    }

    const tryTelegramInitData = async (): Promise<boolean> => {
      const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
      try {
        webApp?.ready()
        webApp?.expand()
      } catch {
        // ignore
      }

      let attempts = 0
      const maxAttempts = 120
      while (!cancelled && attempts < maxAttempts) {
        const initData = webApp?.initData
        const unsafeUser = webApp?.initDataUnsafe?.user
        attempts++
        if (unsafeUser) {
          setTgUser(unsafeUser)
          setOnboarding((prev) => ({
            ...prev,
            name: prev.name || unsafeUser.first_name || unsafeUser.username || '',
          }))
          setDebug(`attempt=${attempts}, initDataLen=${(initData || '').length}, user=${unsafeUser.first_name || unsafeUser.username || 'unknown'}`)
        }
        if (initData && unsafeUser) {
          try {
            const res = await api.post('/auth/telegram', { initData })
            await finishAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
            return true
          } catch (err: any) {
            const serverMsg = err.response?.data?.error?.message || err.message || ''
            setError(serverMsg || 'Telegram login failed')
            setDebug(`auth error: ${serverMsg}`)
            setLoading(false)
            return true
          }
        }
        await wait(250)
      }
      return false
    }

    const tryGuest = async () => {
      const unsafeUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : undefined
      setDebug((prev) => prev + '; falling back to guest auth')
      try {
        const res = await api.post('/auth/guest', {
          firstName: onboarding.name || unsafeUser?.first_name || undefined,
          lastName: unsafeUser?.last_name || undefined,
          languageCode: 'ru',
          telegramId: unsafeUser?.id,
          telegramUsername: unsafeUser?.username,
          avatarUrl: unsafeUser?.photo_url,
        })
        await finishAuth(res.data.accessToken, res.data.refreshToken, res.data.user)
      } catch (err: any) {
        const serverMsg = err.response?.data?.error?.message || err.message || 'Guest login failed'
        setError(serverMsg)
        setDebug('guest auth error: ' + serverMsg)
        setLoading(false)
      }
    }

    const runLogin = async () => {
      const rawHref = typeof window !== 'undefined' ? window.location.href : 'no-window'
      const rawSearch = typeof window !== 'undefined' ? window.location.search : 'no-search'
      setDebug(`href=${rawHref}, search=${rawSearch}`)
      await wait(50)

      if (await tryStartToken()) return
      if (await tryTelegramInitData()) return
      if (cancelled) return
      await tryGuest()
    }

    runLogin()
    return () => {
      cancelled = true
    }
  }, [setToken, setRefreshToken, setUser])

  const submitOnboarding = async () => {
    setLoading(true)
    setError('')
    try {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - onboarding.age)

      const update = {
        firstName: onboarding.name || 'Гость',
        birthDate: birthDate.toISOString(),
        gender: onboarding.gender,
        heightCm: onboarding.heightCm,
        currentWeightKg: onboarding.currentWeightKg,
        targetWeightKg: onboarding.targetWeightKg ?? undefined,
        primaryGoal: onboarding.primaryGoal,
        activityLevel: 'MODERATE',
      }

      await api.patch('/users/me/profile', update)

      // Generate personalized AI plan based on completed profile
      try {
        await api.post('/users/me/goal-plan/generate')
      } catch (planErr: any) {
        console.warn('[onboarding plan generation]', planErr.response?.data?.error?.message || planErr.message)
      }

      const meRes = await api.get('/users/me')
      const savedUser = meRes.data || null
      if (savedUser) {
        setUser(savedUser)
        setActiveTab('coach')
        setStep('complete')
      } else {
        setError('Unable to finalize login')
      }
    } catch (err: any) {
      console.error('[submitOnboarding error]', err)
      setError(err.response?.data?.error?.message || err.message || 'Failed to save profile')
      setLoading(false)
      return
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

  if (step === 'complete') {
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
        <Card style={{ width: '100%', maxWidth: 340, padding: '36px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🥗</div>
          <p style={{ color: 'var(--text-secondary)' }}>Вход...</p>
        </Card>
      </div>
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
      <Card style={{ width: '100%', maxWidth: 340, padding: '36px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥗</div>
        <p style={{ color: 'var(--text-secondary)' }}>Вход...</p>
        {debug && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, wordBreak: 'break-all' }}>{debug}</p>}
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
  const goals: { value: PrimaryGoal; label: string; icon: React.ReactNode }[] = [
    { value: 'FAT_LOSS', label: 'Похудеть', icon: <TargetIcon size={22} /> },
    { value: 'MUSCLE_GAIN', label: 'Набрать массу', icon: <DumbbellIcon size={22} /> },
    { value: 'MAINTENANCE', label: 'Быть в тонусе', icon: <ScaleIcon size={22} /> },
    { value: 'HEALTH', label: 'Улучшить здоровье', icon: <ActivityIcon size={22} /> },
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
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', marginBottom: 12 }}>
            <CoachIcon size={32} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {tgUser ? `Привет, ${tgUser.first_name || 'друг'}!` : 'Добро пожаловать в SnapCal'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {tgUser ? 'Расскажите о себе, чтобы AI-coach рассчитал ваш план.' : 'Telegram не поделился данными — введите имя вручную.'}
          </p>
        </div>

        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Расскажите о себе
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px' }}>
          Это нужно, чтобы рассчитать ваши персональные нормы калорий, белков, жиров и углеводов.
        </p>

        {error && <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--rose-dim)', borderRadius: 12, color: 'var(--rose)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
          {!tgUser && (
            <div>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Ваше имя</label>
              <input
                type="text"
                value={onboarding.name}
                onChange={(e) => setOnboarding({ ...onboarding, name: e.target.value })}
                placeholder="Как к вам обращаться?"
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
          )}

          <NumberField
            label="Сколько вам лет?"
            icon={<CalendarIcon size={18} />}
            value={onboarding.age}
            onChange={(v: number | null) => setOnboarding({ ...onboarding, age: v ?? 18 })}
            min={10}
            max={120}
          />

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><span style={{ display: 'flex', color: 'var(--green)' }}><UserIcon size={18} /></span>Пол</label>
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
            icon={<RulerIcon size={18} />}
            value={onboarding.heightCm}
            onChange={(v: number | null) => setOnboarding({ ...onboarding, heightCm: v ?? 170 })}
            min={50}
            max={300}
          />

          <NumberField
            label="Текущий вес (кг)"
            icon={<ScaleIcon size={18} />}
            value={onboarding.currentWeightKg}
            onChange={(v: number | null) => setOnboarding({ ...onboarding, currentWeightKg: v ?? 70 })}
            min={20}
            max={300}
          />

          <NumberField
            label="Желаемый вес (кг) — необязательно"
            icon={<ScaleIcon size={18} />}
            value={onboarding.targetWeightKg}
            onChange={(v: number | null) => setOnboarding({ ...onboarding, targetWeightKg: v === null ? null : v })}
            min={20}
            max={300}
            optional
          />

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><span style={{ display: 'flex', color: 'var(--green)' }}><TargetIcon size={18} /></span>Ваша цель</label>
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
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4, color: 'inherit' }}>{g.icon}</div>
                  <div style={{ fontSize: 13 }}>{g.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <Button variant="primary" size="lg" fullWidth onClick={onSubmit} disabled={loading}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? 'Сохранение...' : (
                <>
                  Рассчитать
                  <ArrowRightIcon size={18} />
                </>
              )}
            </span>
          </Button>
        </div>
      </Card>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  icon?: React.ReactNode
  value: number | '' | null
  onChange: (v: number | null) => void
  min: number
  max: number
  optional?: boolean
}

function NumberField({ label, icon, value, onChange, min, max, optional }: NumberFieldProps) {
  const [draft, setDraft] = useState(formatValue(value))

  useEffect(() => {
    setDraft(formatValue(value))
  }, [value])

  function formatValue(v: number | '' | null): string {
    if (v === null || v === '') return ''
    return String(v)
  }

  function clamp(n: number | null): number | null {
    if (n === null) return optional ? null : min
    if (n < min) return min
    if (n > max) return max
    return n
  }

  function commit(raw: string) {
    if (raw === '' || raw === '-' || raw === '.' || raw === ',') {
      const fallback = optional ? null : min
      onChange(fallback)
      setDraft(formatValue(fallback))
      return
    }
    const normalized = raw.replace(',', '.')
    const n = Number(normalized)
    if (Number.isNaN(n)) {
      setDraft(formatValue(value))
      return
    }
    const final = clamp(n)
    onChange(final)
    setDraft(formatValue(final))
  }

  return (
    <div>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ display: 'flex', color: 'var(--green)' }}>{icon}</span>}
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit((e.target as HTMLInputElement).value)
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

// END LoginScreen