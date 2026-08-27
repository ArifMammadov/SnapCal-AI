import { useState, useMemo, useEffect } from 'react'
import { Button, Card, CircularRing, MiniProgressBar, ArrowRightIcon, ChevronDownIcon, Avatar } from '../components/ui.js'
import { useApp } from '../App.js'
import { useAppStore } from '../store/index.js'

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)
import { GoalPlanScreen } from './GoalPlanScreen.js'
import { MarketplaceScreen } from './MarketplaceScreen.js'
import { useTrackingSummary, usePrograms } from '../lib/data.js'
import { basicPrograms, type BasicProgram as SharedBasicProgram } from '../lib/basicPrograms.js'
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

type HomeBasicProgram = SharedBasicProgram

const metricConfig = [
  { key: 'water', label: 'Water', unit: 'L', max: 3, color: 'var(--blue)', icon: '💧', get: (s: any) => (s?.waterMl ?? 0) / 1000 },
  { key: 'sleep', label: 'Sleep', unit: 'h', max: 8, color: 'var(--purple)', icon: '🌙', get: (s: any) => s?.sleepH ?? 0 },
  { key: 'protein', label: 'Protein', unit: 'g', max: 150, color: 'var(--green)', icon: '🥩', get: (s: any) => s?.proteinG ?? 0 },
  { key: 'carbs', label: 'Carbs', unit: 'g', max: 250, color: 'var(--amber)', icon: '🌾', get: (s: any) => s?.carbsG ?? 0 },
  { key: 'fat', label: 'Fat', unit: 'g', max: 73, color: 'var(--orange)', icon: '🥑', get: (s: any) => s?.fatG ?? 0 },
  { key: 'activity', label: 'Activity', unit: 'kcal', max: 500, color: 'var(--rose)', icon: '🏃', get: (s: any) => s?.caloriesBurned ?? 0 },
  { key: 'steps', label: 'Steps', unit: '', max: 10000, color: 'var(--rose)', icon: '👟', get: (s: any) => s?.steps ?? 0 },
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
  proteinGoal: 150,
  carbsG: 0,
  fatG: 0,
  waterMl: 0,
  waterGoalMl: 3000,
  sleepH: 0,
  sleepGoalH: 8,
  steps: 0,
  stepsGoal: 10000,
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
  const [selectedProgram, setSelectedProgram] = useState<HomeBasicProgram | null>(null)
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
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{IS_RUSSIAN ? 'Сегодня' : 'Today'}</p>
          <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: 'flex-end', alignItems: 'flex-end', height: 28 }}>
            {[
              { value: totalCalories, goal: calorieGoal, color: '#4ade80' },
              { value: proteinG, goal: s.proteinGoal || 150, color: '#818cf8' },
              { value: waterL, goal: (s.waterGoalMl || 3000) / 1000, color: '#60a5fa' },
              { value: s.sleepH || 0, goal: s.sleepGoalH || 8, color: '#facc15' },
              { value: steps, goal: s.stepsGoal || 10000, color: '#fb7185' },
              { value: s.caloriesBurned || 0, goal: calorieGoal * 0.5, color: '#f97316' },
            ].map((m, i) => {
              const pct = Math.min(1, m.goal > 0 ? m.value / m.goal : 0)
              return (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: Math.max(4, Math.round(pct * 24)),
                    background: pct > 0 ? m.color : 'var(--border)',
                    borderRadius: 2,
                    opacity: pct > 0 ? 0.5 + pct * 0.5 : 0.2,
                  }}
                />
              )
            })}
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
          {[...metricConfig]
            .sort((a, b) => {
              const av = a.get(s)
              const bv = b.get(s)
              return (bv > 0 ? 1 : 0) - (av > 0 ? 1 : 0)
            })
            .map((m) => {
              const value = m.get(s)
            let label = m.label
            let icon = m.icon
            if (m.key === 'activity' && s.activities?.length) {
              const a = s.activities[0]
              label = `${a.type} · ${a.durationMin || 0} ${IS_RUSSIAN ? 'мин' : 'min'}`
              const activityIcons: Record<string, string> = {
                Running: '🏃',
                Walking: '🚶',
                Cycling: '🚴',
                Swimming: '🏊',
                Gym: '🏋️',
                Yoga: '🧘',
                Football: '⚽',
                Tennis: '🎾',
                Volleyball: '🏐',
              }
              icon = activityIcons[a.type] || '🏃'
            }
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
                <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                  {value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>{m.unit}</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{label}</p>
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
          {basicPrograms.map((p) => (
            <Card
              key={p.id}
              onClick={() => setSelectedProgram(p)}
              style={{
                flexShrink: 0,
                width: 150,
                overflow: 'hidden',
                padding: 0,
                borderRadius: 18,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  height: 100,
                  backgroundImage: `url(${p.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    padding: '3px 8px',
                    background: 'rgba(0,0,0,0.45)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {IS_RUSSIAN ? 'Базовая' : 'Basic'}
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {IS_RUSSIAN ? p.titleRu : p.title}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>
                  {p.durationWeeks} {IS_RUSSIAN ? 'недель' : 'weeks'}
                </p>
              </div>
            </Card>
          ))}
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

      {selectedProgram && (
        <div
          onClick={() => setSelectedProgram(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              maxHeight: '80vh',
              overflowY: 'auto',
              borderRadius: 24,
              padding: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-elevated)',
            }}
          >
            <div
              style={{
                height: 160,
                backgroundImage: `url(${selectedProgram.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                borderRadius: '24px 24px 0 0',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.1) 100%)',
                  borderRadius: '24px 24px 0 0',
                }}
              />
              <button
                onClick={() => setSelectedProgram(null)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px 20px 24px' }}>
              <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {IS_RUSSIAN ? selectedProgram.titleRu : selectedProgram.title}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 18px' }}>
                {(IS_RUSSIAN ? selectedProgram.subtitleRu : selectedProgram.subtitle)} · {selectedProgram.durationWeeks} {IS_RUSSIAN ? 'недель' : 'weeks'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(IS_RUSSIAN ? selectedProgram.tipsRu : selectedProgram.tips).map((tip, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 13, color: selectedProgram.color, fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
