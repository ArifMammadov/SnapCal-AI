import { useState, useEffect } from 'react'
import { useApp } from '../App.js'
import { Card, Button, BackIcon, Avatar } from '../components/ui.js'
import { useAppStore } from '../store/index.js'
import { api } from '../lib/api.js'
import type { TrackingSummary } from '../lib/data.js'

type ProfileSection = 'main' | 'personal' | 'goals' | 'subscription' | 'settings' | 'faq' | 'support' | 'privacy' | 'terms'

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

  const fields = [
    { label: 'Full Name', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—' },
    { label: 'Date of Birth', value: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : '—' },
    { label: 'Gender', value: profile?.gender || '—' },
    { label: 'Height', value: profile?.heightCm ? `${profile.heightCm} cm` : '—' },
    { label: 'Current Weight', value: profile?.weightKg ? `${profile.weightKg} kg` : '—' },
    { label: 'Target Weight', value: profile?.targetWeightKg ? `${profile.targetWeightKg} kg` : '—' },
    { label: 'Email', value: user?.email || '—' },
    { label: 'Phone', value: user?.phone || '—' },
  ]
  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Personal Information
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map((f) => (
          <Card key={f.label} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.label}</span>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}

function GoalsSection({ onBack }: { onBack: () => void }) {
  const profile = useAppStore((s) => s.user?.profile)

  const goals = [
    { label: 'Primary Goal', value: profile?.primaryGoal || '—', icon: '🎯', color: 'var(--rose)' },
    { label: 'Daily Calories', value: `${profile?.dailyCalories || '—'} kcal`, icon: '🔥', color: 'var(--orange)' },
    { label: 'Protein Target', value: `${profile?.dailyProteinG || '—'}g / day`, icon: '🥩', color: 'var(--green)' },
    { label: 'Water Goal', value: `${((profile?.dailyWaterMl || 0) / 1000).toFixed(1)} L / day`, icon: '💧', color: 'var(--blue)' },
    { label: 'Sleep Target', value: `${profile?.sleepGoalH || '—'} hours`, icon: '🌙', color: 'var(--purple)' },
    { label: 'Steps Goal', value: `${profile?.dailySteps || '—'} / day`, icon: '👟', color: 'var(--amber)' },
    { label: 'Workout Frequency', value: `${profile?.workoutsPerWeek || '—'}× / week`, icon: '💪', color: 'var(--rose)' },
    { label: 'Timeline', value: '6 months', icon: '📅', color: 'var(--green)' },
  ]
  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: '56px 20px 24px' }}>
      <BackButton onBack={onBack} />
      <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        My Goals
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {goals.map((g) => (
          <Card
            key={g.label}
            style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${g.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {g.icon}
              </div>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{g.label}</span>
            </div>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: g.color }}>{g.value}</span>
          </Card>
        ))}
      </div>
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
  const [notifs, setNotifs] = useState(true)
  const [mealReminders, setMealReminders] = useState(true)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')

  const toggles = [
    { label: 'Dark Mode', value: darkMode, onChange: () => setDarkMode(!darkMode) },
    { label: 'Push Notifications', value: notifs, onChange: () => setNotifs(!notifs) },
    { label: 'Meal Reminders', value: mealReminders, onChange: () => setMealReminders(!mealReminders) },
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

        <Card style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

const staticContent: Record<string, string[]> = {
  faq: [
    'Q: How does SnapCal AI analyze food?\nA: Using advanced computer vision and a database of 2M+ foods, our AI identifies ingredients and calculates precise macros from photos.',
    'Q: Can I sync with Apple Health or Google Fit?\nA: Yes! SnapCal AI syncs with Apple Health, Google Fit, Garmin, Fitbit, and Whoop devices automatically.',
    'Q: How accurate is the calorie tracking?\nA: Our AI has 94% accuracy on photo analysis. You can always edit results before saving.',
    'Q: Can I use SnapCal offline?\nA: Core tracking works offline. AI features require an internet connection.',
  ],
  support: [
    'For support, contact us at support@snapcal.ai or use the in-app chat.',
    'Response time: Pro users receive priority support with responses within 2 hours. Free users within 24 hours.',
    'Community: Join 50,000+ members in our SnapCal community forum at community.snapcal.ai',
  ],
  privacy: [
    'Last updated: August 1, 2026. SnapCal AI takes your privacy seriously.',
    'Data collected: We collect fitness data, food logs, and usage analytics to improve your experience. Your data is never sold to third parties.',
    'Data storage: All data is encrypted in transit and at rest using AES-256 encryption.',
    'Your rights: You may request deletion of your account and all associated data at any time through Settings > Account > Delete Account.',
  ],
  terms: [
    'By using SnapCal AI, you agree to these Terms of Service effective August 1, 2026.',
    'SnapCal AI is intended for informational and educational purposes. It is not a substitute for professional medical advice, diagnosis, or treatment.',
    'Subscriptions auto-renew unless cancelled 24 hours before the renewal date. Refunds are available within 30 days of purchase.',
    'Legal Disclaimer: The calorie and nutritional data provided are estimates. Individual results vary. Consult a healthcare provider before starting any fitness program.',
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
  if (section === 'settings') return <SettingsSection onBack={() => setSection('main')} />
  if (section === 'faq') return <SimpleTextSection title="FAQ" onBack={() => setSection('main')} content={staticContent.faq} />
  if (section === 'support') return <SimpleTextSection title="Support" onBack={() => setSection('main')} content={staticContent.support} />
  if (section === 'privacy') return <SimpleTextSection title="Privacy Policy" onBack={() => setSection('main')} content={staticContent.privacy} />
  if (section === 'terms') return <SimpleTextSection title="Terms & Conditions" onBack={() => setSection('main')} content={staticContent.terms} />

  const menuItems = [
    { id: 'personal' as ProfileSection, icon: '👤', label: 'Personal Information', desc: 'Name, height, weight, contact', highlight: false },
    { id: 'goals' as ProfileSection, icon: '🎯', label: 'Goals', desc: 'Targets, timeline, preferences', highlight: false },
    { id: 'subscription' as ProfileSection, icon: '⭐', label: 'Subscription', desc: `${user?.plan || 'Free'} · ${user?.plan === 'FREE' ? 'Active' : 'Active ✓'}`, highlight: true },
    { id: 'settings' as ProfileSection, icon: '⚙️', label: 'Settings', desc: 'Notifications, display, units', highlight: false },
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
