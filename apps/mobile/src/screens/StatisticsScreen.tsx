import { useState } from 'react'
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

type Period = '7D' | '30D' | '6M'

const data7D = {
  calories: [
    { label: 'Mon', value: 2100 },
    { label: 'Tue', value: 1980 },
    { label: 'Wed', value: 2250 },
    { label: 'Thu', value: 1850 },
    { label: 'Fri', value: 2050 },
    { label: 'Sat', value: 2180 },
    { label: 'Sun', value: 1847 },
  ],
  weight: [
    { label: 'Mon', value: 86.2 },
    { label: 'Tue', value: 85.9 },
    { label: 'Wed', value: 86.1 },
    { label: 'Thu', value: 85.7 },
    { label: 'Fri', value: 85.4 },
    { label: 'Sat', value: 85.2 },
    { label: 'Sun', value: 85.0 },
  ],
  steps: [
    { label: 'Mon', value: 6200 },
    { label: 'Tue', value: 8432 },
    { label: 'Wed', value: 7100 },
    { label: 'Thu', value: 9800 },
    { label: 'Fri', value: 7300 },
    { label: 'Sat', value: 10400 },
    { label: 'Sun', value: 5600 },
  ],
  water: [
    { label: 'Mon', value: 2.4 },
    { label: 'Tue', value: 1.8 },
    { label: 'Wed', value: 2.8 },
    { label: 'Thu', value: 2.1 },
    { label: 'Fri', value: 2.5 },
    { label: 'Sat', value: 3.0 },
    { label: 'Sun', value: 2.2 },
  ],
  sleep: [
    { label: 'Mon', value: 7.5 },
    { label: 'Tue', value: 7.2 },
    { label: 'Wed', value: 6.8 },
    { label: 'Thu', value: 8.0 },
    { label: 'Fri', value: 7.1 },
    { label: 'Sat', value: 8.3 },
    { label: 'Sun', value: 6.9 },
  ],
  protein: [
    { label: 'Mon', value: 128 },
    { label: 'Tue', value: 112 },
    { label: 'Wed', value: 135 },
    { label: 'Thu', value: 98 },
    { label: 'Fri', value: 142 },
    { label: 'Sat', value: 118 },
    { label: 'Sun', value: 125 },
  ],
}

const data30D = {
  calories: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: 1800 + Math.round(Math.random() * 500) })),
  weight: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: +(87.5 - i * 0.08 + Math.random() * 0.4 - 0.2).toFixed(1) })),
  steps: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: 5000 + Math.round(Math.random() * 7000) })),
  water: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: +(1.5 + Math.random() * 2).toFixed(1) })),
  sleep: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: +(6.5 + Math.random() * 2).toFixed(1) })),
  protein: Array.from({ length: 30 }, (_, i) => ({ label: `${i + 1}`, value: 90 + Math.round(Math.random() * 80) })),
}

const data6M = {
  calories: [
    { label: 'Mar', value: 2300 },
    { label: 'Apr', value: 2150 },
    { label: 'May', value: 2050 },
    { label: 'Jun', value: 1980 },
    { label: 'Jul', value: 1920 },
    { label: 'Aug', value: 1880 },
  ],
  weight: [
    { label: 'Mar', value: 87 },
    { label: 'Apr', value: 85.5 },
    { label: 'May', value: 84.1 },
    { label: 'Jun', value: 82.8 },
    { label: 'Jul', value: 81.3 },
    { label: 'Aug', value: 85.0 },
  ],
  steps: [
    { label: 'Mar', value: 6800 },
    { label: 'Apr', value: 7200 },
    { label: 'May', value: 7900 },
    { label: 'Jun', value: 8400 },
    { label: 'Jul', value: 8800 },
    { label: 'Aug', value: 8200 },
  ],
  water: [
    { label: 'Mar', value: 1.8 },
    { label: 'Apr', value: 2.0 },
    { label: 'May', value: 2.2 },
    { label: 'Jun', value: 2.4 },
    { label: 'Jul', value: 2.6 },
    { label: 'Aug', value: 2.3 },
  ],
  sleep: [
    { label: 'Mar', value: 6.8 },
    { label: 'Apr', value: 7.0 },
    { label: 'May', value: 7.2 },
    { label: 'Jun', value: 7.5 },
    { label: 'Jul', value: 7.4 },
    { label: 'Aug', value: 7.2 },
  ],
  protein: [
    { label: 'Mar', value: 95 },
    { label: 'Apr', value: 108 },
    { label: 'May', value: 118 },
    { label: 'Jun', value: 125 },
    { label: 'Jul', value: 132 },
    { label: 'Aug', value: 120 },
  ],
}

const allData = { '7D': data7D, '30D': data30D, '6M': data6M }

interface ChartCardProps {
  title: string
  value: string
  delta: string
  positive: boolean
  color: string
  data: { label: string; value: number }[]
  unit: string
  type?: 'area' | 'bar' | 'line'
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
  const d = allData[period]

  const chartConfigs: ChartCardProps[] = [
    { title: 'Calories', value: '2,047 kcal', delta: '↓ 6.1%', positive: true, color: 'var(--orange)', data: d.calories, unit: 'kcal', type: 'area' },
    { title: 'Weight', value: '85.0 kg', delta: '↓ 2.3 kg', positive: true, color: 'var(--rose)', data: d.weight, unit: 'kg', type: 'line' },
    { title: 'Protein', value: '122 g / day', delta: '↑ 8.2%', positive: true, color: 'var(--green)', data: d.protein, unit: 'g', type: 'area' },
    { title: 'Water Intake', value: '2.4 L / day', delta: '↑ 15%', positive: true, color: 'var(--blue)', data: d.water, unit: 'L', type: 'bar' },
    { title: 'Sleep', value: '7.4 hrs / night', delta: '+0.4h', positive: true, color: 'var(--purple)', data: d.sleep, unit: 'hrs', type: 'area' },
    { title: 'Daily Steps', value: '7,976 steps', delta: '↑ 12%', positive: true, color: 'var(--amber)', data: d.steps, unit: 'steps', type: 'bar' },
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Avg Calories', value: '2,047', color: 'var(--orange)' },
            { label: 'Weight Lost', value: '2.3 kg', color: 'var(--green)' },
            { label: 'Streak', value: '18 days', color: 'var(--purple)' },
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
              { icon: '📉', text: "Weight trend is excellent — you're averaging 0.54 kg/week loss, perfectly within the healthy 0.5–1 kg range." },
              { icon: '🥩', text: 'Protein intake improved 8.2% this week. Hitting 120g+ consistently will accelerate muscle preservation.' },
              { icon: '😴', text: 'Sleep quality correlates with your best calorie-burning days. Prioritize 8h on workout nights.' },
              { icon: '🔥', text: "At this rate, you'll hit your 75 kg goal in approximately 11 more weeks. Keep the momentum!" },
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
      </div>
    </div>
  )
}
