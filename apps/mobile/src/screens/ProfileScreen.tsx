import { useState, useEffect } from 'react'
import { useApp } from '../App.js'
import { Card, Button, BackIcon, Avatar } from '../components/ui.js'
import { useAppStore } from '../store/index.js'
import { api } from '../lib/api.js'
import type { TrackingSummary } from '../lib/data.js'
import { NotificationScreen } from './NotificationScreen.js'

type ProfileSection = 'main' | 'personal' | 'goals' | 'subscription' | 'notifications' | 'settings' | 'faq' | 'support' | 'privacy' | 'terms'

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        color: 'var(--green)',
        fontSize: 15,
        cursor: 'pointer',
        fontFamily: 'inherit',
        padding: 0,
        marginBottom: 16,
      }}
    >
      <BackIcon size={18} />
      Back
    </button>
  )
}

function PersonalInfoSection({ onBack }: { onBack: () => void }) {
  const user = useAppStore((s) => s.user)
  const profile = user?.profile
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    birthDate: profile?.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
    gender: profile?.gender || 'OTHER',
    heightCm: profile?.heightCm ?? '',
    currentWeightKg: profile?.currentWeightKg ? Number(profile.currentWeightKg) : '',
    targetWeightKg: profile?.targetWeightKg ? Number(profile.targetWeightKg) : '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
        gender: form.gender,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      }
      const res = await api.patch('/users/me/profile', payload)
      useAppStore.setState((state) => ({ user: state.user ? { ...state.user, profile: res.data, firstName: res.data.firstName ?? state.user?.firstName } : null }))
      setIsEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const readFields = [
    { label: 'Full Name', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—' },
    { label: 'Date of Birth', value: profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString() : '—' },
    { label: 'Gender', value: profile?.gender || '—' },
    { label: 'Height', value: profile?.heightCm ? `${profile.heightCm} cm` : '—' },
    { label: 'Current Weight', value: profile?.currentWeightKg ? `${Number(profile.currentWeightKg).toFixed(1)} kg` : '—' },
    { label: 'Target Weight', value: profile?.targetWeightKg ? `${Number(profile.targetWeightKg).toFixed(1)} kg` : '—' },
    { label: 'Email', value: user?.email || '—' },
    { label: 'Phone', value: user?.phone || '—' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'inherit',
    marginBottom: 10,
  }

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Personal Information
        </h1>
        <Button variant="secondary" size="sm" onClick={() => isEditing ? handleSave() : setIsEditing(true)} disabled={saving}>
          {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
        </Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isEditing ? (
          <>
            <input style={inputStyle} placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input style={inputStyle} placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            <input style={inputStyle} type="date" placeholder="Date of birth" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            <select style={inputStyle} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            <input style={inputStyle} type="number" placeholder="Height (cm)" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            <input style={inputStyle} type="number" step="0.1" placeholder="Current weight (kg)" value={form.currentWeightKg} onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })} />
            <input style={inputStyle} type="number" step="0.1" placeholder="Target weight (kg)" value={form.targetWeightKg} onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })} />
            <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </>
        ) : (
          readFields.map((f) => (
            <Card key={f.label} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.label}</span>
              <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

type GoalPlan = {
  primaryGoal?: string
  startWeightKg?: number
  targetWeightKg?: number
  totalLossKg?: number | null
  currentMonth?: number
  percentComplete?: number
  timelineMonths?: number
  dailyTargets?: {
    calories?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
    waterL?: string
    sleepH?: number
    steps?: number
    workoutsPerWeek?: number
  }
  milestones?: {
    month: number
    label: string
    targetWeightKg: number | null
    targetCalories: number
    workoutsPerWeek: number
    focus: string
    color: string
  }[]
}

function GoalsSection({ onBack }: { onBack: () => void }) {
  const [plan, setPlan] = useState<GoalPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/me/goal-plan').then((res) => setPlan(res.data)).catch(() => null).finally(() => setLoading(false))
  }, [])

  const targets = plan?.dailyTargets

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        My Goals
      </h1>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading plan…</p>
      ) : !plan?.primaryGoal ? (
        <Card style={{ padding: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            No AI plan yet. Tell the AI coach about your goal (for example: “I want to lose 5 kg in 2 months”) and it will build a personalized plan here.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>PRIMARY GOAL</p>
            <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', margin: 0 }}>{plan.primaryGoal?.replace(/_/g, ' ')}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>START</p>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-primary)' }}>{plan.startWeightKg} kg</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>TARGET</p>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '2px 0 0', color: 'var(--text-primary)' }}>{plan.targetWeightKg} kg</p>
              </div>
              {plan.totalLossKg ? (
                <div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>TO LOSE</p>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: '2px 0 0', color: 'var(--rose)' }}>-{plan.totalLossKg} kg</p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>DAILY TARGETS</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Calories', value: `${targets?.calories ?? '—'} kcal`, color: 'var(--orange)' },
                { label: 'Protein', value: `${targets?.proteinG ?? '—'} g`, color: 'var(--green)' },
                { label: 'Carbs', value: `${targets?.carbsG ?? '—'} g`, color: 'var(--blue)' },
                { label: 'Fat', value: `${targets?.fatG ?? '—'} g`, color: 'var(--purple)' },
                { label: 'Water', value: `${targets?.waterL ?? '—'} L`, color: 'var(--blue)' },
                { label: 'Sleep', value: `${targets?.sleepH ?? '—'} h`, color: 'var(--purple)' },
                { label: 'Steps', value: `${targets?.steps ?? '—'}`, color: 'var(--amber)' },
                { label: 'Workouts', value: `${targets?.workoutsPerWeek ?? '—'} / week`, color: 'var(--rose)' },
              ].map((t) => (
                <div key={t.label}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{t.label.toUpperCase()}</p>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: '2px 0 0', color: t.color }}>{t.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>TIMELINE ({plan.timelineMonths} MONTHS)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(plan.milestones ?? []).map((m) => (
                <div
                  key={m.month}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    borderLeft: `4px solid ${m.color ?? 'var(--green)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="font-display" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: m.color ?? 'var(--green)', fontWeight: 600 }}>{m.targetWeightKg ? `${m.targetWeightKg} kg` : `${m.targetCalories} kcal`}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{m.focus} · {m.workoutsPerWeek} workouts/week</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
function SubscriptionSection({ onBack }: { onBack: () => void }) {
  const plan = useAppStore((s) => s.user?.plan) || 'FREE'
  const isPro = plan !== 'FREE'
  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Subscription
      </h1>

      <div
        style={{
          padding: '16px',
          background: isPro ? 'linear-gradient(135deg, var(--purple) 0%, var(--blue) 100%)' : 'var(--bg-elevated)',
          borderRadius: 20,
          marginBottom: 20,
          border: isPro ? 'none' : '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: isPro ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)', margin: 0, letterSpacing: '0.06em' }}>CURRENT PLAN</p>
            <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: isPro ? '#fff' : 'var(--text-primary)', margin: '4px 0 0' }}>
              {isPro ? plan : 'Free Plan'}
            </p>
          </div>
          <div
            style={{
              padding: '6px 12px',
              background: isPro ? 'rgba(255,255,255,0.2)' : 'var(--green-dim)',
              borderRadius: 10,
              fontSize: 12,
              color: isPro ? '#fff' : 'var(--green)',
              fontWeight: 600,
            }}
          >
            {isPro ? 'Active ✓' : 'Active'}
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, color: isPro ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)', margin: 0 }}>Price</p>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: isPro ? '#fff' : 'var(--text-primary)', margin: '2px 0 0' }}>
              {isPro ? '$79 / year' : '$0'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, color: isPro ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)', margin: 0 }}>AI Coach</p>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: isPro ? '#fff' : 'var(--text-primary)', margin: '2px 0 0' }}>
              {isPro ? 'Unlimited' : 'Limited'}
            </p>
          </div>
        </div>
      </div>

      <Card style={{ padding: '16px', marginBottom: 20 }}>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px' }}>
          Included in {isPro ? plan : 'Free'}
        </p>
        {(isPro
          ? [
              '✦ Unlimited AI Coach conversations',
              '✦ Advanced nutrition analytics',
              '✦ 6-month transformation plans',
              '✦ Meal photo analysis',
              '✦ Priority support',
              '✦ 10% off Marketplace programs',
            ]
          : [
              '✦ Basic calorie tracking',
              '✦ 1 free AI food scan/day',
              '✦ Daily summary dashboard',
              '✦ Upgrade anytime for full access',
            ]
        ).map((f) => (
          <p key={f} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{f}</p>
        ))}
      </Card>

      {isPro ? (
        <Button variant="secondary" size="lg" fullWidth style={{ color: 'var(--rose)' }}>
          Cancel Subscription
        </Button>
      ) : (
        <Button variant="primary" size="lg" fullWidth>
          Upgrade to Pro
        </Button>
      )}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      role="switch"
      aria-checked={value}
      style={{
        width: 46,
        height: 26,
        borderRadius: 13,
        background: value ? 'var(--green)' : 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: value ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}

function SettingsSection({ onBack }: { onBack: () => void }) {
  const { darkMode, setDarkMode } = useApp()
  const user = useAppStore((s) => s.user)
  const [notifs, setNotifs] = useState(true)
  const [mealReminders, setMealReminders] = useState(true)
  const [units, setUnits] = useState<'metric' | 'imperial'>((user?.profile?.units as any) || 'metric')
  const [languageCode, setLanguageCode] = useState(user?.languageCode || 'en')
  const [savingLang, setSavingLang] = useState(false)

  const toggles = [
    { label: 'Dark Mode', value: darkMode, onChange: () => setDarkMode(!darkMode) },
    { label: 'Push Notifications', value: notifs, onChange: () => setNotifs(!notifs) },
    { label: 'Meal Reminders', value: mealReminders, onChange: () => setMealReminders(!mealReminders) },
  ]

  const changeLanguage = async (code: string) => {
    if (code === languageCode) return
    setSavingLang(true)
    try {
      await api.patch('/users/me/profile', { languageCode: code })
      setLanguageCode(code)
      useAppStore.setState((state) => ({ user: state.user ? { ...state.user, languageCode: code } : null }))
    } catch (err) {
      console.error(err)
    } finally {
      setSavingLang(false)
    }
  }

  const languages = [
    { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
  ]

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Settings
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toggles.map((s) => (
          <Card key={s.label} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{s.label}</span>
            <Toggle value={s.value} onChange={s.onChange} />
          </Card>
        ))}

        <Card style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: '0 0 10px' }}>Language / Язык / Dil</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                disabled={savingLang}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: languageCode === lang.code ? 'var(--green)' : 'var(--bg-elevated)',
                  color: languageCode === lang.code ? '#000' : 'var(--text-primary)',
                  fontWeight: languageCode === lang.code ? 700 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
            This changes the language used by the AI coach and app labels.
          </p>
        </Card>

        <Card style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Units</span>
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 3, gap: 3 }}>
              {(['metric', 'imperial'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnits(u)}
                  style={{
                    padding: '5px 12px',
                    background: units === u ? 'var(--bg-card)' : 'transparent',
                    borderRadius: 8,
                    border: 'none',
                    color: units === u ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: units === u ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>
            Units decide how weight, height and distance are shown. Metric uses kg, cm and km. Imperial uses lb, ft/in and miles. It does not affect calories, which are always in kilocalories.
          </p>
        </Card>
      </div>
    </div>
  )
}
function SimpleTextSection({ title, onBack, content }: { title: string; onBack: () => void; content: string[] }) {
  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        {title}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {content.map((c, i) => (
          <p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
            {c}
          </p>
        ))}
      </div>
    </div>
  )
}

function FAQSection({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<number | null>(null)

  const items = [
    {
      q: 'What is SnapCal AI and how does it help?',
      a: 'SnapCal AI is your personal nutrition and fitness coach powered by AI. It tracks meals from photos, counts calories and macros, logs activity, water and sleep, and gives you a personalized daily plan.',
    },
    {
      q: 'How accurate is the calorie counting?',
      a: 'Calorie estimates are based on standard USDA and food-reference data plus AI analysis of photos. For best accuracy, review the suggested portion size and edit meals when needed.',
    },
    {
      q: 'Can the AI coach really build a diet for me?',
      a: 'Yes. Tell the coach your goal, dietary preferences, allergies and activity level. It will create daily calorie, protein, carb, fat, water and step targets and a step-by-step timeline.',
    },
    {
      q: 'Does SnapCal work without a subscription?',
      a: 'Yes. New users get a 7-day unlimited trial. After that you can use 1 free food scan per day and unlimited text chat with the AI coach. Upgrade for unlimited scans and advanced analytics.',
    },
    {
      q: 'Is my data safe?',
      a: 'Yes. Your data is encrypted in transit and at rest, stored in secure EU-based data centers, and never sold to third parties. You can request full account deletion at any time.',
    },
    {
      q: 'How do I change my language or units?',
      a: 'Go to Profile > Settings. You can switch between Azerbaijani, Russian, English and Uzbek, and choose Metric or Imperial for weight, height and distance display.',
    },
  ]

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        FAQ
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => {
          const isOpen = open === i
          return (
            <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span>{item.q}</span>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isOpen ? (
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.a}</p>
                </div>
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function SupportSection({ onBack }: { onBack: () => void }) {
  const [showReport, setShowReport] = useState(false)

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Support
      </h1>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Need help? Our team usually replies within 24 hours for free users and 2 hours for Pro members.
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={() => setShowReport(true)}>
          Report a problem
        </Button>
      </Card>

      {showReport ? (
        <ReportProblemModal onClose={() => setShowReport(false)} />
      ) : null}
    </div>
  )
}

function ReportProblemModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await api.post('/users/me/support-tickets', { subject: 'In-app report', message: text.trim() })
      setSent(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card style={{ padding: 20 }}>
        <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: 'var(--text-primary)' }}>
          Report a problem
        </h2>

        {sent ? (
          <>
            <p style={{ color: 'var(--green)', fontWeight: 600, margin: '0 0 16px' }}>Thank you. We received your report.</p>
            <Button variant="secondary" size="lg" fullWidth onClick={onClose}>Close</Button>
          </>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe what happened…"
              style={{
                width: '100%',
                minHeight: 120,
                padding: 12,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'none',
                marginBottom: 16,
              }}
            />
            <Button variant="primary" size="lg" fullWidth onClick={submit} disabled={sending || !text.trim()}>
              {sending ? 'Sending…' : 'Send report'}
            </Button>
            <Button variant="secondary" size="lg" fullWidth onClick={onClose} style={{ marginTop: 8 }}>
              Cancel
            </Button>
          </>
        )}
      </Card>
      </div>
    </div>
  )
}

const staticContent: Record<string, string[]> = {
  privacy: [
    'Last Updated: August 27, 2026',
    'SnapCal AI ("SnapCal", "we", "us", or "our") respects your privacy. This Privacy Policy explains what information we collect and how we use it when you use SnapCal.',
    '1. Information We Collect',
    'We may collect:',
    'Telegram account information, such as your Telegram ID and username;',
    'profile information such as age, gender, height and weight;',
    'nutrition goals and dietary preferences;',
    'food photos you submit for analysis;',
    'calorie, meal and nutrition history;',
    'activity, water and sleep information you choose to provide;',
    'subscription and payment status;',
    'technical and usage information such as device type, IP address and app interactions.',
    '2. How We Use Your Information',
    'We use this information to:',
    'analyze food photos and estimate calories and nutrients;',
    'provide personalized nutrition recommendations;',
    'save your meal and nutrition history;',
    'operate, maintain and improve SnapCal;',
    'process subscriptions;',
    'provide support and protect the Service from fraud or abuse.',
    '3. AI Processing',
    'SnapCal uses AI to analyze food images and generate nutrition estimates and recommendations.',
    'AI results are estimates and may not always be accurate.',
    'Food photos and related information may be processed by third-party AI and cloud providers that help us operate SnapCal.',
    '4. Your Information',
    'You remain in control of the information you provide to SnapCal.',
    'We do not sell your personal information or food photos.',
    'We may use aggregated or anonymized information to improve our products and services where permitted by applicable law.',
    '5. Third-Party Services',
    'We may use trusted providers for AI processing, cloud hosting, analytics, authentication, payments and other services necessary to operate SnapCal.',
    '6. Data Security',
    'We use reasonable security measures to protect your information. However, no online service can guarantee complete security.',
    '7. Your Rights',
    'Depending on where you live, you may have the right to access, correct or delete your personal information, or object to certain processing.',
    'To request deletion of your data or contact us about privacy:',
    'Use support function.',
    '8. Children',
    'SnapCal is not intended for children under the minimum age permitted by applicable law.',
    '9. Changes',
    'We may update this Privacy Policy from time to time. The latest version will always be available in SnapCal.',
  ],
  terms: [
    'Last Updated: August 27, 2026',
    'These Terms & Conditions ("Terms") govern your use of SnapCal AI ("SnapCal", "we", "us", or "our").',
    'By using SnapCal, you agree to these Terms.',
    '1. Our Service',
    'SnapCal is an AI-powered nutrition and wellness application that helps users analyze food, estimate calories and nutrients, track nutrition and receive personalized recommendations.',
    '2. AI & Nutrition Disclaimer',
    'SnapCal provides general nutrition and wellness information only.',
    'SnapCal is not a doctor, dietitian, healthcare provider or medical device.',
    'Food recognition, calorie estimates and AI recommendations are automated estimates and may be inaccurate.',
    'SnapCal does not provide medical diagnosis, treatment, prescriptions or emergency medical advice.',
    'If you have a medical condition, take medication, are pregnant, or have specific dietary requirements, consult a qualified healthcare professional.',
    '3. User Responsibility',
    'You are responsible for:',
    'the information you provide;',
    'reviewing AI-generated results;',
    'confirming food and portion information where possible;',
    'deciding whether recommendations are appropriate for you.',
    '4. Subscriptions',
    'Some SnapCal features require a paid subscription.',
    'The price, billing period and any free trial will be shown before purchase.',
    'Subscriptions may automatically renew unless cancelled before the renewal date.',
    'Cancellation and refunds are subject to the applicable payment platform and mandatory consumer protection laws.',
    '5. User Content',
    'You retain ownership of photos and information you submit to SnapCal.',
    'You allow SnapCal to process this content as necessary to provide and operate the Service.',
    '6. Prohibited Use',
    'You may not:',
    'misuse or disrupt SnapCal;',
    'attempt unauthorized access;',
    'reverse engineer or copy the Service;',
    'scrape our systems or content;',
    'abuse subscriptions or promotions;',
    'use SnapCal for unlawful purposes.',
    '7. Intellectual Property',
    'SnapCal, including its software, design, branding, AI technology and content, belongs to SnapCal or its licensors.',
    'You may not copy, distribute or commercially exploit our proprietary technology without permission.',
    '8. Availability',
    'We aim to keep SnapCal available and reliable, but we do not guarantee uninterrupted or error-free operation.',
    '9. Disclaimer',
    'SnapCal is provided on an "as is" and "as available" basis to the maximum extent permitted by law.',
    'We do not guarantee the accuracy of calorie estimates, food recognition, AI recommendations or specific health or weight-loss results.',
    '10. Limitation of Liability',
    'To the maximum extent permitted by applicable law, SnapCal will not be liable for indirect or consequential losses resulting from your use of the Service or reliance on AI-generated information.',
    'Nothing in these Terms limits liability that cannot legally be limited.',
    '11. Termination',
    'You may stop using SnapCal at any time.',
    'We may suspend or terminate access if these Terms are violated, the Service is abused, or termination is required for security or legal reasons.',
    '12. Changes',
    'We may update these Terms or modify the Service from time to time. Material changes may be communicated through the application.',
  ],
}
export function ProfileScreen() {
  const [section, setSection] = useState<ProfileSection>('main')
  const { darkMode, setDarkMode } = useApp()
  const { user, logout } = useAppStore()
  const [summary, setSummary] = useState<TrackingSummary | null>(null)

  useEffect(() => {
    api.get<TrackingSummary>('/tracking/summary').then((res) => setSummary(res.data)).catch(() => null)
  }, [])

  if (section === 'personal') return <PersonalInfoSection onBack={() => setSection('main')} />
  if (section === 'goals') return <GoalsSection onBack={() => setSection('main')} />
  if (section === 'subscription') return <SubscriptionSection onBack={() => setSection('main')} />
  if (section === 'notifications') return <NotificationScreen onBack={() => setSection('main')} />
  if (section === 'settings') return <SettingsSection onBack={() => setSection('main')} />
  if (section === 'faq') return <FAQSection onBack={() => setSection('main')} />
  if (section === 'support') return <SupportSection onBack={() => setSection('main')} />
  if (section === 'privacy') return <SimpleTextSection title="Privacy Policy" onBack={() => setSection('main')} content={staticContent.privacy} />
  if (section === 'terms') return <SimpleTextSection title="Terms & Conditions" onBack={() => setSection('main')} content={staticContent.terms} />

  const menuItems = [
    { id: 'personal' as ProfileSection, icon: '👤', label: 'Personal Information', desc: 'Name, height, weight, contact', highlight: false },
    { id: 'goals' as ProfileSection, icon: '🎯', label: 'Goals', desc: 'Targets, timeline, preferences', highlight: false },
    { id: 'subscription' as ProfileSection, icon: '⭐', label: 'Subscription', desc: `${user?.plan || 'Free'} · ${user?.plan === 'FREE' ? 'Active' : 'Active ✓'}`, highlight: true },
    { id: 'notifications' as ProfileSection, icon: '🔔', label: 'Notifications', desc: 'Reminders, history', highlight: false },
    { id: 'settings' as ProfileSection, icon: '⚙️', label: 'Settings', desc: 'Language, display, units', highlight: false },
    { id: 'faq' as ProfileSection, icon: '❓', label: 'FAQ', desc: 'Common questions answered', highlight: false },
    { id: 'support' as ProfileSection, icon: '💬', label: 'Support', desc: 'Get help from our team', highlight: false },
    { id: 'privacy' as ProfileSection, icon: '🔒', label: 'Privacy Policy', desc: 'How we handle your data', highlight: false },
    { id: 'terms' as ProfileSection, icon: '📄', label: 'Terms & Conditions', desc: 'Legal · Disclaimer', highlight: false },
  ]

  const firstName = user?.firstName || 'Friend'
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'
  const stats = [
    { label: 'Weight Lost', value: summary?.weightKg ? `${Math.max(0, +(summary.weightKg - (user?.profile?.targetWeightKg || summary.weightKg)).toFixed(1))} kg` : '—', color: 'var(--green)' },
    { label: 'Days Active', value: '18', color: 'var(--purple)' },
    { label: 'Health Score', value: `${summary?.healthScore ?? '—'}%`, color: 'var(--amber)' },
  ]

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', paddingBottom: 24 }}>
      <div
        style={{
          padding: '56px 20px 24px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Avatar
              src={user?.avatarUrl || undefined}
              fallback={firstName[0] || '👤'}
              size={72}
              style={{ border: '3px solid var(--green)' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--green)',
                border: '2px solid var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
              }}
            >
              ✏️
            </div>
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {firstName} {user?.lastName || ''}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Member since {joined}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div
                style={{
                  padding: '3px 10px',
                  background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                ⭐ {user?.plan === 'FREE' ? 'Free Member' : user?.plan || 'Member'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>18-day streak 🔥</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
          {stats.map((s) => (
            <Card key={s.label} style={{ padding: '12px 10px', textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0 }}>
                {s.value}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{s.label}</p>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className="card-press"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'var(--bg-card)',
                borderRadius: 18,
                border: item.highlight ? '1px solid rgba(123,110,246,0.4)' : '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                textAlign: 'left',
                fontFamily: 'inherit',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: item.highlight ? 'var(--purple-dim)' : 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  className="font-display"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: item.highlight ? 'var(--purple)' : 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{item.desc}</p>
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>

        <Button variant="danger" size="lg" fullWidth onClick={logout} style={{ marginTop: 16, background: 'var(--rose-dim)', color: 'var(--rose)' }}>
          Sign Out
        </Button>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
          SnapCal AI v2.4.1 · Made with ❤️ for your health
        </p>
      </div>
    </div>
  )
}