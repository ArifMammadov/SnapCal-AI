import { useState, useMemo } from 'react'
import { Button, Card, CircularRing, MiniProgressBar, ArrowRightIcon, ChevronDownIcon } from '../components/ui.js'
import { useApp } from '../App.js'
import { GoalPlanScreen } from './GoalPlanScreen.js'
import { MarketplaceScreen } from './MarketplaceScreen.js'

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

const metrics = [
  { label: 'Water', value: 1.8, max: 3.0, unit: 'L', color: 'var(--blue)', icon: '💧', key: 'water' },
  { label: 'Sleep', value: 7.2, max: 8, unit: 'h', color: 'var(--purple)', icon: '🌙', key: 'sleep' },
  { label: 'Protein', value: 112, max: 150, unit: 'g', color: 'var(--green)', icon: '🥩', key: 'protein' },
  { label: 'Carbs', value: 198, max: 250, unit: 'g', color: 'var(--amber)', icon: '🌾', key: 'carbs' },
  { label: 'Fat', value: 64, max: 73, unit: 'g', color: 'var(--orange)', icon: '🥑', key: 'fat' },
  { label: 'Steps', value: 8432, max: 10000, unit: '', color: 'var(--rose)', icon: '👟', key: 'steps' },
]

const meals = [
  {
    type: 'Breakfast',
    time: '8:30 AM',
    calories: 420,
    icon: '☀️',
    items: ['Oatmeal with blueberries', 'Greek yogurt', 'Black coffee'],
    macros: { p: 28, c: 62, f: 12 },
    logged: true,
  },
  {
    type: 'Lunch',
    time: '12:45 PM',
    calories: 680,
    icon: '🌤',
    items: ['Grilled chicken salad', 'Quinoa', 'Lemon dressing'],
    macros: { p: 52, c: 58, f: 22 },
    logged: true,
  },
  {
    type: 'Dinner',
    time: '7:00 PM',
    calories: 590,
    icon: '🌙',
    items: ['Salmon fillet', 'Steamed broccoli', 'Brown rice'],
    macros: { p: 48, c: 54, f: 18 },
    logged: true,
  },
  {
    type: 'Snacks',
    time: 'Throughout day',
    calories: 157,
    icon: '🍎',
    items: ['Apple', 'Almonds (20g)', 'Protein bar'],
    macros: { p: 12, c: 24, f: 8 },
    logged: false,
  },
]

const featuredPrograms = [
  { name: 'Fat Burn Elite', duration: 12, price: 29, rating: '4.9', emoji: '🔥', gradient: 'linear-gradient(135deg,#ff4d6d,#ff7a45)' },
  { name: 'Yoga Flow Series', duration: 8, price: 19, rating: '4.8', emoji: '🧘', gradient: 'linear-gradient(135deg,#7b6ef6,#3dbbf7)' },
  { name: 'Muscle Builder', duration: 16, price: 39, rating: '4.7', emoji: '💪', gradient: 'linear-gradient(135deg,#00d48a,#0da8ed)' },
  { name: 'Home Shred', duration: 6, price: 14, rating: '4.6', emoji: '🏠', gradient: 'linear-gradient(135deg,#ffbe0b,#ff7a45)' },
]

export function HomeScreen() {
  const { setActiveTab, setShowMarketplace } = useApp()
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [showGoalPlan, setShowGoalPlan] = useState(false)

  const totalCalories = 1847
  const calorieGoal = 2200
  const healthScore = 84
  const today = useMemo(() => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), [])

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
            Good morning, Alex 👋
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
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=84&h=84&fit=crop&auto=format"
            alt="Profile"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </button>
      </header>

      <Card
        style={{
          margin: '24px 20px 0',
          padding: '24px 20px',
          borderRadius: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AnimatedRing value={totalCalories} max={calorieGoal} size={140} strokeWidth={12} color="var(--green)" />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <AnimatedRing value={112} max={150} size={108} strokeWidth={8} color="var(--purple)" />
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
              <AnimatedRing value={8432} max={10000} size={80} strokeWidth={6} color="var(--rose)" />
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
                { label: 'Protein', value: '112g', color: 'var(--purple)' },
                { label: 'Carbs', value: '198g', color: 'var(--amber)' },
                { label: 'Fat', value: '64g', color: 'var(--orange)' },
                { label: 'Steps', value: '8,432', color: 'var(--rose)' },
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
          {metrics.map((m) => (
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
                {m.value.toLocaleString()}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>{m.unit}</span>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 8px' }}>{m.label}</p>
              <MiniProgressBar value={m.value} max={m.max} color={m.color} />
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0', textAlign: 'right' }}>
                / {m.max}
                {m.unit}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Today's Meals
          </h2>
          <button style={{ fontSize: 13, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            + Add
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meals.map((meal) => (
            <Card
              key={meal.type}
              onClick={() => setExpandedMeal(expandedMeal === meal.type ? null : meal.type)}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: meal.logged ? 'var(--green-dim)' : 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {meal.icon}
                  </div>
                  <div>
                    <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {meal.type}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{meal.time}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {meal.calories}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    style={{
                      color: 'var(--text-muted)',
                      transform: expandedMeal === meal.type ? 'rotate(180deg)' : 'rotate(0)',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {expandedMeal === meal.type && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }} className="fade-in">
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'P', value: meal.macros.p + 'g', color: 'var(--green)' },
                      { label: 'C', value: meal.macros.c + 'g', color: 'var(--amber)' },
                      { label: 'F', value: meal.macros.f + 'g', color: 'var(--orange)' },
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
                  {meal.items.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section style={{ padding: '20px 20px 0' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1040 0%, #0d1a2e 100%)',
            borderRadius: 22,
            border: '1px solid rgba(123,110,246,0.3)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,110,246,0.4) 0%, transparent 70%)',
              top: -20,
              right: -20,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <span style={{ fontSize: 11, color: 'var(--purple)', fontWeight: 600, letterSpacing: '0.06em' }}>AI INSIGHT</span>
          </div>
          <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: '#f0f4ff', margin: '0 0 8px', lineHeight: 1.4 }}>
            You're 353 kcal under goal today
          </p>
          <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.6)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Add a protein-rich evening snack — try cottage cheese with walnuts (≈180 kcal, 20g protein) to hit your macros.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" size="sm">Log Snack</Button>
            <Button
              variant="secondary"
              size="sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,244,255,0.7)' }}
              onClick={() => setActiveTab('coach')}
            >
              Ask AI Coach
            </Button>
          </div>
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
          {featuredPrograms.map((p) => (
            <Card
              key={p.name}
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
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{p.duration} weeks</p>
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
