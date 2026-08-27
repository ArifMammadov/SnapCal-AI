import { useState } from 'react'
import { Card, BackIcon } from '../components/ui.js'
import { useGoalPlan } from '../lib/data.js'
import { api } from '../lib/api.js'

interface GoalPlanScreenProps {
  onBack: () => void
}

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)

const t = {
  title: IS_RUSSIAN ? 'План трансформации' : 'Transformation Plan',
  subtitle: IS_RUSSIAN ? 'Персональный 6-месячный план' : 'Personal 6-month plan',
  back: IS_RUSSIAN ? 'Назад' : 'Back',
  loading: IS_RUSSIAN ? 'Загрузка плана...' : 'Loading plan...',
  error: IS_RUSSIAN ? 'Не удалось загрузить план' : 'Failed to load plan',
  startWeight: IS_RUSSIAN ? 'Начальный вес' : 'Start weight',
  targetWeight: IS_RUSSIAN ? 'Целевой вес' : 'Target weight',
  totalLoss: IS_RUSSIAN ? 'Всего сбросить' : 'Total to lose',
  currentMonth: IS_RUSSIAN ? 'Текущий месяц' : 'Current month',
  percent: IS_RUSSIAN ? 'завершено' : 'completed',
  dailyTargets: IS_RUSSIAN ? 'Дневные цели' : 'Daily targets',
  calories: IS_RUSSIAN ? 'Калории' : 'Calories',
  protein: IS_RUSSIAN ? 'Белок' : 'Protein',
  carbs: IS_RUSSIAN ? 'Углеводы' : 'Carbs',
  fat: IS_RUSSIAN ? 'Жиры' : 'Fat',
  water: IS_RUSSIAN ? 'Вода' : 'Water',
  sleep: IS_RUSSIAN ? 'Сон' : 'Sleep',
  steps: IS_RUSSIAN ? 'Шаги' : 'Steps',
  workouts: IS_RUSSIAN ? 'Тренировки' : 'Workouts',
  milestones: IS_RUSSIAN ? 'Месячные этапы' : 'Monthly milestones',
  week: IS_RUSSIAN ? 'неделя' : 'week',
  focus: IS_RUSSIAN ? 'Фокус' : 'Focus',
  calorieTarget: IS_RUSSIAN ? 'Калории' : 'Calories',
  days: IS_RUSSIAN ? 'дней/нед' : 'days/wk',
  stepsTarget: IS_RUSSIAN ? 'шагов' : 'steps',
  generatePlan: IS_RUSSIAN ? 'Сгенерировать план ИИ' : 'Generate AI plan',
  generating: IS_RUSSIAN ? 'Создаём план...' : 'Creating plan...',
  weekChecklist: IS_RUSSIAN ? 'Чек-лист недели' : 'Weekly checklist',
}

function CircularProgress({ value, size = 120, stroke = 10, color = 'var(--green)' }: { value: number; size?: number; stroke?: number; color?: string }) {
  const radius = (size - stroke) / 2
  const circumference = radius * 2 * Math.PI
  const pct = Math.min(100, Math.max(0, value))
  const offset = circumference - (pct / 100) * circumference
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
          {pct}%
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t.percent}</span>
      </div>
    </div>
  )
}

function TargetPill({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <div>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {value}
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 2 }}>{unit}</span>
        </p>
      </div>
    </div>
  )
}

export function GoalPlanScreen({ onBack }: GoalPlanScreenProps) {
  const { data: plan, loading, error, refetch } = useGoalPlan()
  const [generating, setGenerating] = useState(false)
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await api.post('/users/me/goal-plan/generate')
      await refetch()
    } catch (err: any) {
      console.error('Plan generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>{t.loading}</p>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div style={{ height: '100%', padding: 56, background: 'var(--bg)' }}>
        <button onClick={onBack} className="back-button" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--green)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 16 }}>
          <BackIcon size={18} />
          {t.back}
        </button>
        <p style={{ color: 'var(--rose)' }}>{error || t.error}</p>
      </div>
    )
  }

  const milestones = (plan.milestones || []).map((m: any) => ({
    ...m,
    done: m.month < plan.currentMonth,
    current: m.month === plan.currentMonth,
  }))

  const daily = plan.dailyTargets || {}

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '56px 20px 20px', background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg) 100%)', borderBottom: '1px solid var(--border)' }}>
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
          {t.back}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            🎯
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              {t.title}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t.subtitle}</p>
          </div>
        </div>

        <Card
          style={{
            padding: 16,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <CircularProgress value={plan.percentComplete || 0} />
          <div style={{ flex: 1 }}>
            <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
              {t.currentMonth} {plan.currentMonth} / {plan.timelineMonths || 6}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
              {plan.startWeightKg} → {plan.targetWeightKg} кг
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: t.startWeight, value: `${plan.startWeightKg} кг` },
                { label: t.targetWeight, value: `${plan.targetWeightKg} кг` },
                { label: t.totalLoss, value: plan.totalLossKg ? `${plan.totalLossKg} кг` : '—' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: '2px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: generating ? 'var(--bg-elevated)' : 'var(--green-dim)',
            color: 'var(--green)',
            fontSize: 15,
            fontWeight: 600,
            cursor: generating ? 'default' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {generating ? t.generating : t.generatePlan}
        </button>
      </div>

      <div style={{ padding: '20px 20px' }}>
        <h2
          className="font-display"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            margin: '0 0 14px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t.dailyTargets}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <TargetPill label={t.calories} value={daily.calories || '—'} unit="kcal" color="#22c55e" />
          <TargetPill label={t.protein} value={daily.proteinG || '—'} unit="g" color="#a855f7" />
          <TargetPill label={t.carbs} value={daily.carbsG || '—'} unit="g" color="#3b82f6" />
          <TargetPill label={t.fat} value={daily.fatG || '—'} unit="g" color="#f59e0b" />
          <TargetPill label={t.water} value={daily.waterL || '—'} unit="L" color="#0ea5e9" />
          <TargetPill label={t.sleep} value={daily.sleepH || '—'} unit="h" color="#f43f5e" />
          <TargetPill label={t.steps} value={daily.steps || '—'} unit="" color="#ec4899" />
          <TargetPill label={t.workouts} value={daily.workoutsPerWeek || '—'} unit="/нед" color="#8b5cf6" />
        </div>

        <h2
          className="font-display"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            margin: '0 0 16px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {t.milestones}
        </h2>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          <div
            style={{
              position: 'absolute',
              left: 19,
              top: 0,
              width: 2,
              height: `${Math.max(0, Math.min(100, (plan.percentComplete || 0)))}%`,
              background: 'linear-gradient(180deg, var(--green) 0%, var(--blue) 100%)',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {milestones.map((m: any) => (
              <div key={m.month} style={{ display: 'flex', gap: 14 }}>
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: m.done ? m.color : m.current ? m.color : 'var(--bg-elevated)',
                      border: `2px solid ${m.done || m.current ? m.color : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: m.current ? `0 0 16px ${m.color}55` : 'none',
                    }}
                  >
                    {m.done ? (
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: m.current ? '#fff' : 'var(--text-muted)' }}>{m.month}</span>
                    )}
                  </div>
                </div>

                <Card
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    border: m.current ? `1px solid ${m.color}44` : undefined,
                    boxShadow: m.current ? `0 4px 20px ${m.color}22` : undefined,
                    opacity: !m.done && !m.current ? 0.75 : 1,
                  }}
                >
                  <div
                    onClick={() => setExpandedMonth(expandedMonth === m.month ? null : m.month)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: m.color, fontWeight: 700, letterSpacing: '0.04em' }}>MONTH {m.month}</span>
                        {m.current && <span style={{ padding: '2px 8px', background: m.color, borderRadius: 6, fontSize: 10, color: '#fff', fontWeight: 700 }}>CURRENT</span>}
                      </div>
                      <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {m.targetWeightKg ? `${m.targetWeightKg} кг` : '—'}
                      </span>
                    </div>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{m.label}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>{m.focus}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: t.calorieTarget, value: `${m.targetCalories} kcal` },
                        { label: t.workouts, value: `${m.workoutsPerWeek} ${t.days}` },
                      ].map((d) => (
                        <div key={d.label} style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                          <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{d.label}</p>
                          <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {expandedMonth === m.month && m.weeks && m.weeks.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 10px' }}>{t.weekChecklist}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {m.weeks.map((w: any) => (
                          <div key={w.week} style={{ padding: 10, background: 'var(--bg-elevated)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {t.week} {w.week}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {w.calorieTarget} kcal · {w.workoutDays} {t.days}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>{w.focus}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {(w.checkboxes || []).map((c: string, idx: number) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: 10,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-card)',
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                  }}
                                >
                                  ○ {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
