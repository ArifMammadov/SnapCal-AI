import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import type { DailySummary } from '@snapcal/shared'

export function HomeScreen() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DailySummary>('/tracking/summary')
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!summary) return <div className="p-6 text-slate-400">No data available.</div>

  return (
    <div className="p-5 space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-slate-400">Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        <h1 className="text-2xl font-bold">Good morning! ☀️</h1>
      </header>

      <section className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">Calories today</p>
            <p className="text-3xl font-bold">{summary.caloriesConsumed} / {summary.calorieGoal}</p>
            <p className="text-sm opacity-90 mt-1">Health score: {summary.healthScore}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
            <span className="font-bold">{Math.round((summary.caloriesConsumed / summary.calorieGoal) * 100)}%</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: 'Water', value: `${summary.waterMl} ml`, goal: summary.waterGoalMl },
          { label: 'Sleep', value: `${summary.sleepH} h`, goal: summary.sleepGoalH },
          { label: 'Steps', value: summary.steps, goal: summary.stepsGoal },
          { label: 'Protein', value: `${summary.proteinG} g`, goal: summary.proteinGoal },
        ].map((m) => (
          <div key={m.label} className="bg-slate-900 rounded-xl p-4">
            <p className="text-xs text-slate-400">{m.label}</p>
            <p className="text-lg font-semibold">{m.value}</p>
            <p className="text-xs text-slate-500">Goal {m.goal}</p>
          </div>
        ))}
      </section>

      <section className="bg-slate-900 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Meals</h2>
          <button className="text-emerald-400 text-sm">+ Add</button>
        </div>
        {(summary.foodLogs?.length ?? 0) === 0 ? (
          <p className="text-slate-400 text-sm">No meals logged yet. Ask AI Coach to analyze a photo.</p>
        ) : (
          <ul className="space-y-2">
            {summary.foodLogs.map((log: { id: string; name: string; calories: number }) => (
              <li key={log.id} className="flex justify-between py-2 border-b border-slate-800">
                <span>{log.name}</span>
                <span className="text-slate-400">{log.calories} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
