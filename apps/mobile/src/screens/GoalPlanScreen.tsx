import { Card, BackIcon, MiniProgressBar } from '../components/ui.js'
import { useGoalPlan } from '../lib/data.js'

interface GoalPlanScreenProps {
  onBack: () => void
}

const milestones = [
  {
    month: 1,
    label: 'Foundation',
    weight: '84 kg',
    calories: '2,100 kcal',
    workouts: '4× / week',
    focus: 'Build habits, establish baseline, cut processed foods',
    color: 'var(--blue)',
    done: true,
    current: false,
  },
  {
    month: 2,
    label: 'Momentum',
    weight: '82 kg',
    calories: '2,000 kcal',
    workouts: '5× / week',
    focus: 'Increase cardio, optimize protein intake, add HIIT sessions',
    color: 'var(--purple)',
    done: true,
    current: false,
  },
  {
    month: 3,
    label: 'Acceleration',
    weight: '80 kg',
    calories: '1,900 kcal',
    workouts: '5× / week',
    focus: 'Strength training priority, caloric deficit, progressive overload',
    color: 'var(--green)',
    done: false,
    current: true,
  },
  {
    month: 4,
    label: 'Peak',
    weight: '78 kg',
    calories: '1,850 kcal',
    workouts: '6× / week',
    focus: 'Body recomposition, muscle definition, advanced nutrition timing',
    color: 'var(--amber)',
    done: false,
    current: false,
  },
  {
    month: 5,
    label: 'Refinement',
    weight: '76 kg',
    calories: '1,800 kcal',
    workouts: '6× / week',
    focus: 'Fine-tune macros, optimize sleep, add mobility work',
    color: 'var(--orange)',
    done: false,
    current: false,
  },
  {
    month: 6,
    label: 'Goal Achieved',
    weight: '75 kg',
    calories: '1,800 kcal',
    workouts: '5× / week',
    focus: 'Maintenance phase, celebrate transformation, set new goals',
    color: 'var(--rose)',
    done: false,
    current: false,
  },
]

export function GoalPlanScreen({ onBack }: GoalPlanScreenProps) {
  const { data: plan, loading, error } = useGoalPlan()

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка плана...</p>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div style={{ height: '100%', padding: 56, background: 'var(--bg)' }}>
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
          Назад
        </button>
        <p style={{ color: 'var(--rose)' }}>{error || 'Не удалось загрузить план'}</p>
      </div>
    )
  }

  const milestones = plan.milestones.map((m) => ({
    month: m.month,
    label: m.label,
    weight: m.targetWeightKg ? `${m.targetWeightKg} кг` : '—',
    calories: `${m.targetCalories.toLocaleString()} ккал`,
    workouts: `${m.workoutsPerWeek}× / неделю`,
    focus: m.focus,
    color: m.color,
    done: m.month < plan.currentMonth,
    current: m.month === plan.currentMonth,
  }))

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '56px 20px 20px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🎯
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
              6-Month Transformation
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Персональный план трансформации</p>
          </div>
        </div>

        <Card
          style={{
            marginTop: 16,
            padding: '14px 16px',
            background: 'var(--green-dim)',
            border: '1px solid rgba(0,212,138,0.2)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          {[
            { label: 'Начальный вес', value: `${plan.startWeightKg} кг` },
            { label: 'Целевой вес', value: `${plan.targetWeightKg} кг` },
            { label: 'Всего сбросить', value: plan.totalLossKg ? `${plan.totalLossKg} кг` : '—' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {s.value}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{s.label}</p>
            </div>
          ))}
        </Card>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Месяц {plan.currentMonth} из 6</span>
            <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{plan.percentComplete}% завершено</span>
          </div>
          <MiniProgressBar value={plan.currentMonth} max={6} color="var(--green)" height={6} />
        </div>
      </div>

      <div style={{ padding: '20px 20px' }}>
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
          Monthly Milestones
        </h2>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 19,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'var(--border)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 19,
              top: 0,
              width: 2,
              height: '50%',
              background: 'linear-gradient(180deg, var(--green) 0%, var(--blue) 100%)',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {milestones.map((m) => (
              <div key={m.month} style={{ display: 'flex', gap: 16 }}>
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
                      <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: m.current ? '#fff' : 'var(--text-muted)' }}>
                        {m.month}
                      </span>
                    )}
                  </div>
                </div>

                <Card
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    border: m.current ? `1px solid ${m.color}44` : undefined,
                    boxShadow: m.current ? `0 4px 20px ${m.color}22` : undefined,
                    opacity: !m.done && !m.current ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: m.color, fontWeight: 700, letterSpacing: '0.04em' }}>
                        MONTH {m.month}
                      </span>
                      {m.current && (
                        <span
                          style={{
                            padding: '2px 8px',
                            background: m.color,
                            borderRadius: 6,
                            fontSize: 10,
                            color: '#fff',
                            fontWeight: 700,
                          }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>
                    <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {m.weight}
                    </span>
                  </div>
                  <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>{m.focus}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { label: 'Calories', value: m.calories },
                      { label: 'Workouts', value: m.workouts },
                    ].map((d) => (
                      <div key={d.label} style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{d.label}</p>
                        <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                          {d.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
