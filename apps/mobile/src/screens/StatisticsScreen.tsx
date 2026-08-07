import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

interface DailySummary {
  date: string
  caloriesConsumed: number
  calorieGoal: number
  waterMl: number
  sleepH: number
  steps: number
  proteinG: number
  activitiesCount: number
  healthScore: number
}

export function StatisticsScreen() {
  const [history, setHistory] = useState<DailySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    })

    Promise.all(
      dates.map((date) =>
        api
          .get<DailySummary>('/tracking/summary', { params: { date } })
          .then((res) => res.data)
          .catch(() => null)
      )
    )
      .then((results) => setHistory(results.filter(Boolean) as DailySummary[]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>

  const avgScore = history.length
    ? Math.round(history.reduce((s, d) => s + d.healthScore, 0) / history.length)
    : 0

  return (
    <div className="p-5 space-y-5 pb-24">
      <h1 className="text-2xl font-bold">Статистика</h1>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <p className="text-sm opacity-90">Средний health score за 7 дней</p>
        <p className="text-4xl font-bold">{avgScore}</p>
      </div>

      <section className="bg-slate-900 rounded-2xl p-5">
        <h2 className="font-semibold mb-4">Последние 7 дней</h2>
        {history.length === 0 ? (
          <p className="text-slate-400 text-sm">Нет данных.</p>
        ) : (
          <div className="space-y-3">
            {history.map((d) => (
              <div key={d.date} className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">{new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{d.caloriesConsumed} ккал</span>
                  <span>{d.waterMl} мл</span>
                  <span className="text-emerald-400">{d.healthScore}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
