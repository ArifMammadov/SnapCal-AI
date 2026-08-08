import { useEffect, useMemo, useState } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Card, ScreenHeader } from '../components/ui.js'
import { api } from '../lib/api.js'
import type { TrackingSummary } from '../lib/data.js'

type Period = '7D' | '30D' | '6M'

interface SeriesPoint {
  label: string
  value: number
}

interface StatsData {
  calories: SeriesPoint[]
  weight: SeriesPoint[]
  steps: SeriesPoint[]
  water: SeriesPoint[]
  sleep: SeriesPoint[]
  protein: SeriesPoint[]
}

function weekDayLabel(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function monthDayLabel(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short' })
}

function avg(arr: number[]) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function buildPeriodData(period: Period, summaries: TrackingSummary[]): StatsData {
  const sorted = [...summaries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const labels: string[] = []
  const calories: SeriesPoint[] = []
  const weight: SeriesPoint[] = []
  const steps: SeriesPoint[] = []
  const water: SeriesPoint[] = []
  const sleep: SeriesPoint[] = []
  const protein: SeriesPoint[] = []

  if (period === '7D') {
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const s = sorted.find((x) => x.date === iso)
      labels.push(weekDayLabel(d))
      calories.push({ label: weekDayLabel(d), value: s?.caloriesConsumed ?? 0 })
      weight.push({ label: weekDayLabel(d), value: s?.weightKg ?? 0 })
      steps.push({ label: weekDayLabel(d), value: s?.steps ?? 0 })
      water.push({ label: weekDayLabel(d), value: (s?.waterMl ?? 0) / 1000 })
      sleep.push({ label: weekDayLabel(d), value: s?.sleepH ?? 0 })
      protein.push({ label: weekDayLabel(d), value: s?.proteinG ?? 0 })
    }
  } else if (period === '30D') {
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      const s = sorted.find((x) => x.date === iso)
      const label = monthDayLabel(d)
      labels.push(label)
      calories.push({ label, value: s?.caloriesConsumed ?? 0 })
      weight.push({ label, value: s?.weightKg ?? 0 })
      steps.push({ label, value: s?.steps ?? 0 })
      water.push({ label, value: (s?.waterMl ?? 0) / 1000 })
      sleep.push({ label, value: s?.sleepH ?? 0 })
      protein.push({ label, value: s?.proteinG ?? 0 })
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = monthLabel(d)
      labels.push(key)
      const monthEntries = sorted.filter((x) => monthLabel(new Date(x.date)) === key)
      const caloriesValues = monthEntries.map((x) => x.caloriesConsumed)
      const weightValues = monthEntries.map((x) => x.weightKg)
      const stepsValues = monthEntries.map((x) => x.steps)
      const waterValues = monthEntries.map((x) => x.waterMl / 1000)
      const sleepValues = monthEntries.map((x) => x.sleepH)
      const proteinValues = monthEntries.map((x) => x.proteinG)
      calories.push({ label: key, value: Math.round(avg(caloriesValues)) })
      weight.push({ label: key, value: +(avg(weightValues).toFixed(1)) })
      steps.push({ label: key, value: Math.round(avg(stepsValues)) })
      water.push({ label: key, value: +(avg(waterValues).toFixed(1)) })
      sleep.push({ label: key, value: +(avg(sleepValues).toFixed(1)) })
      protein.push({ label: key, value: Math.round(avg(proteinValues)) })
    }
  }

  return { calories, weight, steps, water, sleep, protein }
}

function aggregateStats(data: StatsData) {
  const avgPoints = (arr: SeriesPoint[]) => arr.reduce((a, b) => a + b.value, 0) / (arr.length || 1)
  return {
    avgCalories: Math.round(avgPoints(data.calories)),
    avgProtein: Math.round(avgPoints(data.protein)),
    avgWater: +(avgPoints(data.water).toFixed(1)),
    avgSteps: Math.round(avgPoints(data.steps)),
    avgSleep: +(avgPoints(data.sleep).toFixed(1)),
  }
}

function CustomTooltip({ active, payload, label, unit }: { active?: boolean; payload?: Array<{ value: number }>; label?: string; unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: 'var(--shadow-elevated)',
      }}
    >
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        {payload[0].value}
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}> {unit}</span>
      </p>
    </div>
  )
}

interface ChartCardProps {
  title: string
  value: string
  delta: string
  positive: boolean
  color: string
  data: SeriesPoint[]
  unit: string
  type?: 'area' | 'bar' | 'line'
}

function ChartCard({ title, value, delta, positive, color, data, unit, type = 'area' }: ChartCardProps) {
  const id = `grad-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <Card style={{ padding: '16px 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{title}</p>
          <p className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0', lineHeight: 1 }}>
            {value}
          </p>
        </div>
        <div
          style={{
            padding: '4px 10px',
            background: positive ? 'var(--green-dim)' : 'var(--rose-dim)',
            borderRadius: 10,
            fontSize: 12,
            color: positive ? 'var(--green)' : 'var(--rose)',
            fontWeight: 600,
          }}
        >
          {delta}
        </div>
      </div>
      <div style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : type === 'line' ? (
            <LineChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit={unit} />} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function StatisticsScreen() {
  const [period, setPeriod] = useState<Period>('7D')
  const [raw, setRaw] = useState<TrackingSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 90)
    const startStr = start.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]
    api.get<TrackingSummary[]>(`/tracking/summaries?start=${startStr}&end=${endStr}`)
      .then((res) => {
        if (!cancelled) setRaw(res.data)
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load stats:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const d = useMemo(() => buildPeriodData(period, raw), [period, raw])
  const agg = useMemo(() => aggregateStats(d), [d])

  const chartConfigs: ChartCardProps[] = [
    { title: 'Calories', value: `${agg.avgCalories.toLocaleString()} kcal`, delta: '↔', positive: true, color: 'var(--orange)', data: d.calories, unit: 'kcal', type: 'area' },
    { title: 'Protein', value: `${agg.avgProtein} g / day`, delta: '↔', positive: true, color: 'var(--green)', data: d.protein, unit: 'g', type: 'area' },
    { title: 'Water Intake', value: `${agg.avgWater} L / day`, delta: '↔', positive: true, color: 'var(--blue)', data: d.water, unit: 'L', type: 'bar' },
    { title: 'Sleep', value: `${agg.avgSleep} hrs / night`, delta: '↔', positive: true, color: 'var(--purple)', data: d.sleep, unit: 'hrs', type: 'area' },
    { title: 'Daily Steps', value: `${agg.avgSteps.toLocaleString()} steps`, delta: '↔', positive: true, color: 'var(--amber)', data: d.steps, unit: 'steps', type: 'bar' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <ScreenHeader title="Statistics" />

      <div style={{ padding: '12px 20px 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            borderRadius: 14,
            padding: 4,
            gap: 4,
            marginBottom: 16,
          }}
        >
          {(['7D', '30D', '6M'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1,
                padding: '8px',
                background: period === p ? 'var(--bg-card)' : 'transparent',
                borderRadius: 10,
                border: period === p ? '1px solid var(--border)' : 'none',
                color: period === p ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: period === p ? 700 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                boxShadow: period === p ? 'var(--shadow-card)' : 'none',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>Loading statistics...</p>
          </div>
        )}

        {!loading && raw.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>No tracking data yet. Start logging meals and activities to see trends.</p>
          </div>
        )}

        {!loading && raw.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Avg Calories', value: agg.avgCalories.toLocaleString(), color: 'var(--orange)' },
                { label: 'Avg Water', value: `${agg.avgWater} L`, color: 'var(--blue)' },
                { label: 'Avg Sleep', value: `${agg.avgSleep} h`, color: 'var(--purple)' },
              ].map((s) => (
                <Card key={s.label} style={{ padding: '12px 10px', textAlign: 'center' }}>
                  <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{s.label}</p>
                </Card>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {chartConfigs.map((c) => (
                <ChartCard key={c.title} {...c} />
              ))}
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #1a1040 0%, #0d1a2e 100%)',
                borderRadius: 20,
                border: '1px solid rgba(123,110,246,0.3)',
                padding: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff' }}>
                  AI Progress Insights
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '📉', text: `Your average calorie intake is ${agg.avgCalories.toLocaleString()} kcal over the selected period.` },
                  { icon: '💧', text: `Hydration average ${agg.avgWater} L/day. Aim for 2.5–3 L for optimal metabolism.` },
                  { icon: '😴', text: `Sleep average ${agg.avgSleep} hours. Consistent 7–8h improves recovery and appetite control.` },
                  { icon: '🔥', text: 'Keep logging daily to unlock personalized AI trend predictions next week.' },
                ].map((insight, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
                    <p style={{ fontSize: 13, color: 'rgba(240,244,255,0.75)', margin: 0, lineHeight: 1.5 }}>
                      {insight.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
