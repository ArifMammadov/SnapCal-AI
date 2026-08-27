import { useState, useMemo, useEffect } from 'react'
import { Button, Card, CircularRing, MiniProgressBar, ArrowRightIcon, ChevronDownIcon, Avatar } from '../components/ui.js'
import { useApp } from '../App.js'
import { useAppStore } from '../store/index.js'

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)
import { GoalPlanScreen } from './GoalPlanScreen.js'
import { MarketplaceScreen } from './MarketplaceScreen.js'
import { useTrackingSummary, usePrograms } from '../lib/data.js'
import type { FoodLog, ActivityLog } from '../lib/data.js'

interface CircularRingPropsLocal {
  value: number
  max: number
  size: number
  strokeWidth: number
  color: string
}

function AnimatedRing({ value, max, size, strokeWidth, color }: CircularRingPropsLocal) {
  return <CircularRing value={value} max={max} size={size} strokeWidth={strokeWidth} color={color} />
}

const mealTypeLabel: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
  SNACK: 'Snacks',
}

const mealIcons: Record<string, string> = {
  BREAKFAST: '☀️',
  LUNCH: '🌤',
  DINNER: '🌙',
  SNACK: '🍎',
}

const metricConfig = [
  { key: 'water', label: 'Water', unit: 'L', max: 3, color: 'var(--blue)', icon: '💧', get: (s: any) => (s?.waterMl ?? 0) / 1000 },
  { key: 'sleep', label: 'Sleep', unit: 'h', max: 8, color: 'var(--purple)', icon: '🌙', get: (s: any) => s?.sleepH ?? 0 },
  { key: 'protein', label: 'Protein', unit: 'g', max: 150, color: 'var(--green)', icon: '🥩', get: (s: any) => s?.proteinG ?? 0 },
  { key: 'carbs', label: 'Carbs', unit: 'g', max: 250, color: 'var(--amber)', icon: '🌾', get: (s: any) => s?.carbsG ?? 0 },
  { key: 'fat', label: 'Fat', unit: 'g', max: 73, color: 'var(--orange)', icon: '🥑', get: (s: any) => s?.fatG ?? 0 },
  { key: 'steps', label: 'Steps', unit: '', max: 10000, color: 'var(--rose)', icon: '👟', get: (s: any) => s?.steps ?? 0 },
  { key: 'burned', label: 'Burned', unit: 'kcal', max: 800, color: 'var(--rose)', icon: '🔥', get: (s: any) => s?.caloriesBurned ?? 0 },
]

function groupFoodLogsByMeal(logs: FoodLog[]) {
  const grouped: Record<string, FoodLog[]> = { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] }
  for (const log of logs) {
    if (!grouped[log.mealType]) grouped[log.mealType] = []
    grouped[log.mealType].push(log)
  }
  return Object.entries(grouped)
    .filter(([, items]) => items.length > 0)
    .map(([type, items]) => {
      const total = items.reduce(
        (acc, i) => ({
          calories: acc.calories + i.calories,
          proteinG: acc.proteinG + (i.proteinG ?? 0),
          carbsG: acc.carbsG + (i.carbsG ?? 0),
          fatG: acc.fatG + (i.fatG ?? 0),
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
      )
      return {
        type,
        items,
        total,
      }
    })
}

function formatMealTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const emptySummary = {
  caloriesConsumed: 0,
  calorieGoal: 2200,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  waterMl: 0,
  sleepH: 0,
  steps: 0,
  healthScore: 0,
  foodLogs: [] as FoodLog[],
  activities: [] as ActivityLog[],
  caloriesBurned: 0,
}

export function HomeScreen() {
  const { setActiveTab, setShowMarketplace } = useApp()
  const user = useAppStore((s) => s.user)
  const { data: summary, loading } = useTrackingSummary()
  const { data: programs } = usePrograms()
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [showGoalPlan, setShowGoalPlan] = useState(false)

  const s = summary ?? emptySummary
  const calorieGoal = s.calorieGoal || 2200
  const totalCalories = s.caloriesConsumed || 0
  const healthScore = s.healthScore || 0
  const proteinG = s.proteinG || 0
  const carbsG = s.carbsG || 0
  const fatG = s.fatG || 0
  const steps = s.steps || 0
  const waterL = (s.waterMl || 0) / 1000

  const meals = useMemo(() => groupFoodLogsByMeal(s.foodLogs || []), [s.foodLogs])
  const featuredPrograms = programs.slice(0, 4)
  const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), [])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const firstName = user?.firstName || 'Friend'

  if (showGoalPlan) return <GoalPlanScreen onBack={() => setShowGoalPlan(false)} />

  return (
    <div
      className="no-scrollbar"
      style={{
        height: '100%',
        overflowY: 'auto',
        background: 'var(--bg)',
        paddingBottom: 24,
      }}
    >
      <header style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {today}
          </p>
          <h1
            className="font-display"
            style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0', letterSpacing: '-0.5px' }}
          >
            {greeting}, {firstName} 👋
          </h1>
        </div>
        <button
          onClick={() => setActiveTab('profile')}
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
            overflow: 'hidden',
            padding: 0,
          }}
        >
          <Avatar src={user?.avatarUrl || undefined} fallback={firstName[0] || '👤'} size={42} />
        </button>
      </header>

      <Card
        style={{
          margin: '24px 20px 0',
          padding: '24px 20px',
          borderRadius: 24,
        }}
      >
        {loading && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading your day...
          </div>
        )}

        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <AnimatedRing value={totalCalories} max={calorieGoal} size={140} strokeWidth={12} color="var(--green)" />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                <AnimatedRing value={proteinG} max={150} size={108} strokeWidth={8} color="var(--purple)" />
              </div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
                <AnimatedRing value={steps} max={10000} size={80} strokeWidth={6} color="var(--rose)" />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  textAlign: 'center',
                }}
              >
                <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {totalCalories.toLocaleString()}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 2px' }}>Calorie Goal</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {totalCalories.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/ {calorieGoal.toLocaleString()}</span>
                </div>
                <MiniProgressBar value={totalCalories} max={calorieGoal} color="var(--green)" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Protein', value: `${Math.round(proteinG)}g`, color: 'var(--purple)' },
                  { label: 'Carbs', value: `${Math.round(carbsG)}g`, color: 'var(--amber)' },
                  { label: 'Fat', value: `${Math.round(fatG)}g`, color: 'var(--orange)' },
                  { label: 'Steps', value: steps.toLocaleString(), color: 'var(--rose)' },
                ].map((s) => (
                  <div key={s.label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</span>
                    </div>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0 14px' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 20,
            padding: '12px 16px',
            background: 'var(--green-dim)',
            borderRadius: 14,
            border: '1px solid rgba(0,212,138,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✦</span>
            <div>
              <p style={{ fontSize: 11, color: 'var(--green)', margin: 0, fontWeight: 500, letterSpacing: '0.04em' }}>HEALTH SCORE</p>
              <p className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {healthScore}%
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>Excellent today</p>
            <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: 'flex-end' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: i < 6 ? 16 + i * 3 : 14,
                    background: i < 5 ? 'var(--green)' : 'var(--border)',
                    borderRadius: 2,
                    opacity: i < 5 ? 0.4 + i * 0.15 : 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ padding: '16px 20px 0' }}>
        <button
          onClick={() => setShowGoalPlan(true)}
          className="card-press"
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, var(--green) 0%, #00a86b 100%)',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, letterSpacing: '0.06em' }}>6-MONTH PLAN</p>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '2px 0 0' }}>
              View Full Transformation Plan
            </p>
          </div>
          <ArrowRightIcon size={20} />
        </button>
      </div>

      <section style={{ padding: '20px 0 0' }}>
        <div style={{ padding: '0 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Today's Overview
          </h2>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px' }}>
          {metricConfig.map((m) => {
            const value = m.get(s)
            return (
              <Card
                key={m.key}
                onClick={() => setActiveTab('activity')}
                style={{
                  flexShrink: 0,
                  width: 110,
                  padding: '14px 14px 12px',
                  borderRadius: 18,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 8 }}>{m.icon}</div>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                  {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>{m.unit}</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{m.label}</p>
                <MiniProgressBar value={value} max={m.max} color={m.color} />
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
                  / {m.max}
                  {m.unit}
                </p>
              </Card>
            )
          })}
        </div>
      </section>

      {s.activities && s.activities.length > 0 && (
        <section style={{ padding: '24px 20px 0' }}>
          <div style={{ padding: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {IS_RUSSIAN ? 'Сегодняшняя активность' : "Today's Activity"}
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {s.activities.map((activity) => (
              <Card key={activity.id} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--rose-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    🏃
                  </div>
                  <div>
                    <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {activity.type}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {formatMealTime(activity.startedAt)} · {activity.durationMin} min
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {activity.caloriesBurned ?? 0}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Today's Meals
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meals.length === 0 && (
            <Card
              onClick={() => setActiveTab('coach')}
              style={{ padding: 20, textAlign: 'center', cursor: 'pointer', border: '1px dashed var(--border)' }}
            >
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {IS_RUSSIAN ? 'Нет еды на сегодня. Скажите ИИ, что вы ели или кушаете.' : 'No meals logged yet today. Tell the AI what you ate or are eating.'}
              </p>
            </Card>
          )}
          {meals.map(({ type, items, total }) => (
            <Card
              key={type}
              onClick={() => setExpandedMeal(expandedMeal === type ? null : type)}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'var(--green-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {mealIcons[type] || '🍽️'}
                  </div>
                  <div>
                    <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {mealTypeLabel[type] || type}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {Math.round(total.calories)}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    style={{
                      color: 'var(--text-muted)',
                      transform: expandedMeal === type ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {expandedMeal === type && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }} className="fade-in">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'P', value: `${Math.round(total.proteinG)}g`, color: 'var(--green)' },
                      { label: 'C', value: `${Math.round(total.carbsG)}g`, color: 'var(--amber)' },
                      { label: 'F', value: `${Math.round(total.fatG)}g`, color: 'var(--orange)' },
                    ].map((m) => (
                      <div
                        key={m.label}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 10,
                          textAlign: 'center',
                        }}
                      >
                        <p style={{ fontSize: 10, color: m.color, margin: 0, fontWeight: 600 }}>{m.label}</p>
                        <p className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {m.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {items.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.calories} kcal</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section style={{ padding: '24px 0 0' }}>
        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Expert Programs
          </h2>
          <button
            onClick={() => setShowMarketplace(true)}
            style={{ fontSize: 13, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            See All
          </button>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px' }}>
          {featuredPrograms.length === 0 && (
            <Card style={{ flexShrink: 0, width: 180, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>No programs available</p>
            </Card>
          )}
          {featuredPrograms.map((p) => (
            <Card
              key={p.id}
              style={{
                flexShrink: 0,
                width: 180,
                overflow: 'hidden',
                padding: 0,
                borderRadius: 18,
              }}
            >
              <div
                style={{
                  height: 110,
                  background: p.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  position: 'relative',
                }}
              >
                {p.emoji}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '3px 8px',
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  ${p.price}
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {p.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{p.durationWeeks} weeks</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
                  <span style={{ color: 'var(--amber)', fontSize: 12 }}>★</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.rating}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
