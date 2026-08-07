import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import type { DailySummary } from '@snapcal/shared'

interface FoodForm {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  name: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export function HomeScreen() {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FoodForm>({
    mealType: 'LUNCH',
    name: '',
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  })

  const loadSummary = () => {
    setLoading(true)
    api
      .get<DailySummary>('/tracking/summary')
      .then((res) => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSummary()
  }, [])

  const addFood = async () => {
    if (!form.name || form.calories <= 0) return
    await api.post('/tracking/food', form)
    setShowForm(false)
    setForm({ mealType: 'LUNCH', name: '', calories: 0, proteinG: 0, carbsG: 0, fatG: 0 })
    loadSummary()
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>
  if (!summary) return <div className="p-6 text-slate-400">No data available.</div>

  const pct = Math.round((summary.caloriesConsumed / summary.calorieGoal) * 100)

  return (
    <div className="p-5 space-y-6 pb-24">
      <header className="space-y-1">
        <p className="text-sm text-slate-400">{new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
        <h1 className="text-2xl font-bold">Доброе утро! ☀️</h1>
      </header>

      <section className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-90">Калории сегодня</p>
            <p className="text-3xl font-bold">{summary.caloriesConsumed} / {summary.calorieGoal}</p>
            <p className="text-sm opacity-90 mt-1">Health score: {summary.healthScore}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center">
            <span className="font-bold">{pct}%</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { label: 'Вода', value: `${summary.waterMl} мл`, goal: summary.waterGoalMl },
          { label: 'Сон', value: `${summary.sleepH} ч`, goal: summary.sleepGoalH },
          { label: 'Шаги', value: summary.steps, goal: summary.stepsGoal },
          { label: 'Белки', value: `${summary.proteinG} г`, goal: summary.proteinGoal },
        ].map((m) => (
          <div key={m.label} className="bg-slate-900 rounded-xl p-4">
            <p className="text-xs text-slate-400">{m.label}</p>
            <p className="text-lg font-semibold">{m.value}</p>
            <p className="text-xs text-slate-500">Цель {m.goal}</p>
          </div>
        ))}
      </section>

      <section className="bg-slate-900 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Приёмы пищи</h2>
          <button onClick={() => setShowForm(true)} className="text-emerald-400 text-sm">+ Добавить</button>
        </div>

        {showForm && (
          <div className="space-y-2 mb-4">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Название еды"
              className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={form.calories || ''}
                onChange={(e) => setForm((f) => ({ ...f, calories: Number(e.target.value) }))}
                placeholder="Ккал"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={form.mealType}
                onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value as FoodForm['mealType'] }))}
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              >
                <option value="BREAKFAST">Завтрак</option>
                <option value="LUNCH">Обед</option>
                <option value="DINNER">Ужин</option>
                <option value="SNACK">Перекус</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={form.proteinG || ''}
                onChange={(e) => setForm((f) => ({ ...f, proteinG: Number(e.target.value) }))}
                placeholder="Белки"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={form.carbsG || ''}
                onChange={(e) => setForm((f) => ({ ...f, carbsG: Number(e.target.value) }))}
                placeholder="Углеводы"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={form.fatG || ''}
                onChange={(e) => setForm((f) => ({ ...f, fatG: Number(e.target.value) }))}
                placeholder="Жиры"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addFood} className="flex-1 bg-emerald-500 rounded-lg py-2 text-sm text-white">Сохранить</button>
              <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 rounded-lg py-2 text-sm">Отмена</button>
            </div>
          </div>
        )}

        {(summary.foodLogs?.length ?? 0) === 0 ? (
          <p className="text-slate-400 text-sm">Ещё нет записей. Спросите AI-коуча или добавьте вручную.</p>
        ) : (
          <ul className="space-y-2">
            {summary.foodLogs.map((log: { id: string; name: string; calories: number }) => (
              <li key={log.id} className="flex justify-between py-2 border-b border-slate-800">
                <span>{log.name}</span>
                <span className="text-slate-400">{log.calories} ккал</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
