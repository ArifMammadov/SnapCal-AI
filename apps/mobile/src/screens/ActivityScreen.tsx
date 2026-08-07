import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

interface ActivityLog {
  id: string
  type: string
  durationMin: number
  caloriesBurned: number | null
  startedAt: string
}

interface MetricLog {
  id: string
  metricType: string
  value: number
}

export function ActivityScreen() {
  const [tab, setTab] = useState<'activity' | 'metric'>('activity')
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [metrics, setMetrics] = useState<MetricLog[]>([])
  const [loading, setLoading] = useState(true)

  const [activityForm, setActivityForm] = useState({
    type: '',
    durationMin: 30,
    caloriesBurned: 0,
  })

  const [metricForm, setMetricForm] = useState<{
    metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS'
    value: number
  }>({ metricType: 'WATER_ML', value: 0 })

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get<ActivityLog[]>('/tracking/activity'),
      api.get<MetricLog[]>('/tracking/metric'),
    ])
      .then(([a, m]) => {
        setActivities(a.data)
        setMetrics(m.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const addActivity = async () => {
    if (!activityForm.type) return
    await api.post('/tracking/activity', {
      ...activityForm,
      startedAt: new Date().toISOString(),
    })
    setActivityForm({ type: '', durationMin: 30, caloriesBurned: 0 })
    load()
  }

  const addMetric = async () => {
    if (metricForm.value <= 0) return
    await api.post('/tracking/metric', {
      ...metricForm,
      loggedAt: new Date().toISOString(),
    })
    setMetricForm({ metricType: 'WATER_ML', value: 0 })
    load()
  }

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>

  return (
    <div className="p-5 space-y-5 pb-24">
      <h1 className="text-2xl font-bold">Активность и метрики</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-2 rounded-lg text-sm ${tab === 'activity' ? 'bg-emerald-500 text-white' : 'bg-slate-900'}`}
        >
          Активность
        </button>
        <button
          onClick={() => setTab('metric')}
          className={`flex-1 py-2 rounded-lg text-sm ${tab === 'metric' ? 'bg-emerald-500 text-white' : 'bg-slate-900'}`}
        >
          Метрики
        </button>
      </div>

      {tab === 'activity' ? (
        <>
          <div className="bg-slate-900 rounded-xl p-4 space-y-2">
            <input
              value={activityForm.type}
              onChange={(e) => setActivityForm((f) => ({ ...f, type: e.target.value }))}
              placeholder="Тип активности (бег, йога...)"
              className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={activityForm.durationMin}
                onChange={(e) => setActivityForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                placeholder="Минут"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={activityForm.caloriesBurned || ''}
                onChange={(e) => setActivityForm((f) => ({ ...f, caloriesBurned: Number(e.target.value) }))}
                placeholder="Сожжено ккал"
                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button onClick={addActivity} className="w-full bg-emerald-500 rounded-lg py-2 text-sm text-white">Добавить активность</button>
          </div>

          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-slate-400 text-sm">Нет активности за сегодня.</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="bg-slate-900 rounded-xl p-4 flex justify-between">
                  <div>
                    <p className="font-medium">{a.type}</p>
                    <p className="text-xs text-slate-400">{a.durationMin} мин</p>
                  </div>
                  <span className="text-sm text-emerald-400">+{a.caloriesBurned ?? 0} ккал</span>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="bg-slate-900 rounded-xl p-4 space-y-2">
            <select
              value={metricForm.metricType}
              onChange={(e) => setMetricForm((f) => ({ ...f, metricType: e.target.value as typeof metricForm.metricType }))}
              className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="WATER_ML">Вода (мл)</option>
              <option value="SLEEP_H">Сон (ч)</option>
              <option value="WEIGHT_KG">Вес (кг)</option>
              <option value="STEPS">Шаги</option>
            </select>
            <input
              type="number"
              step={metricForm.metricType === 'WEIGHT_KG' ? '0.1' : '1'}
              value={metricForm.value || ''}
              onChange={(e) => setMetricForm((f) => ({ ...f, value: Number(e.target.value) }))}
              placeholder="Значение"
              className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={addMetric} className="w-full bg-emerald-500 rounded-lg py-2 text-sm text-white">Добавить метрику</button>
          </div>

          <div className="space-y-2">
            {metrics.length === 0 ? (
              <p className="text-slate-400 text-sm">Нет метрик за сегодня.</p>
            ) : (
              metrics.map((m) => (
                <div key={m.id} className="bg-slate-900 rounded-xl p-4 flex justify-between">
                  <span className="text-sm text-slate-300">{m.metricType}</span>
                  <span className="font-medium">{m.value}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
