import { useState, useEffect } from 'react'
import { Card, Button, PlusIcon, ScreenHeader } from '../components/ui.js'
import { api } from '../lib/api.js'
import type { ActivityLog } from '../lib/data.js'
import { useAppStore } from '../store/index.js'

interface ActivityDisplay {
  id: string
  type: string
  icon: string
  color: string
  time: string
  duration: number
  calories: number
  detail: string
}

const activityTypes = [
  { type: 'Running', icon: '🏃', color: 'var(--rose)' },
  { type: 'Walking', icon: '🚶', color: 'var(--green)' },
  { type: 'Gym', icon: '🏋️', color: 'var(--purple)' },
  { type: 'Cycling', icon: '🚴', color: 'var(--blue)' },
  { type: 'Swimming', icon: '🏊', color: 'var(--sky-500)' },
  { type: 'Yoga', icon: '🧘', color: 'var(--amber)' },
  { type: 'Football', icon: '⚽', color: 'var(--green)' },
  { type: 'Tennis', icon: '🎾', color: 'var(--orange)' },
  { type: 'Volleyball', icon: '🏐', color: 'var(--blue)' },
  { type: 'Water', icon: '💧', color: 'var(--blue)' },
  { type: 'Sleep', icon: '🌙', color: 'var(--purple)' },
  { type: 'Weight', icon: '⚖️', color: 'var(--rose)' },
]

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

function estimateCalories(type: string, minutes: number) {
  const multipliers: Record<string, number> = {
    Running: 9,
    Gym: 5,
    Cycling: 6,
    Swimming: 8,
    Walking: 4,
    Yoga: 2.5,
    Football: 7,
    Tennis: 6.5,
    Volleyball: 5,
    Water: 0,
    Sleep: 0,
    Weight: 0,
  }
  return Math.round(minutes * (multipliers[type] ?? 4))
}

function toActivityDisplay(log: ActivityLog): ActivityDisplay {
  const meta = activityTypes.find((a) => a.type === log.type) || { icon: '🔥', color: 'var(--orange)', type: log.type }
  const date = new Date(log.startedAt)
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return {
    id: log.id,
    type: log.type,
    icon: meta.icon,
    color: meta.color,
    time,
    duration: log.durationMin,
    calories: log.caloriesBurned ?? estimateCalories(log.type, log.durationMin),
    detail: log.notes || `${log.durationMin} min session`,
  }
}

function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function AddActivityModal({ onClose, onAdd }: { onClose: () => void; onAdd: (a: ActivityDisplay) => void }) {
  const [selectedType, setSelectedType] = useState(activityTypes[2])
  const [duration, setDuration] = useState('30')
  const [time, setTime] = useState('08:00')
  const [submitting, setSubmitting] = useState(false)

  const handleAdd = async () => {
    const d = Number(duration)
    setSubmitting(true)
    try {
      const [hours, minutes] = time.split(':').map(Number)
      const startedAt = new Date()
      startedAt.setHours(hours, minutes, 0, 0)
      const calories = estimateCalories(selectedType.type, d)

      const res = await api.post<ActivityLog>('/tracking/activity', {
        type: selectedType.type,
        durationMin: d,
        caloriesBurned: calories,
        startedAt: startedAt.toISOString(),
      })

      onAdd(toActivityDisplay(res.data))
      onClose()
    } catch (err: any) {
      alert(err.message || 'Failed to log activity')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="backdrop-in"
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="slide-up" style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', maxHeight: '85%', overflowY: 'auto' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Log Activity
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', margin: '0 0 10px' }}>
          ACTIVITY TYPE
        </p>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
          {activityTypes.map((a) => (
            <button
              key={a.type}
              onClick={() => setSelectedType(a)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '10px 14px',
                background: selectedType.type === a.type ? a.color : 'var(--bg-elevated)',
                borderRadius: 14,
                border: selectedType.type === a.type ? 'none' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: selectedType.type === a.type ? '#fff' : 'var(--text-secondary)',
              }}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 11, whiteSpace: 'nowrap', fontWeight: selectedType.type === a.type ? 600 : 400 }}>{a.type}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', margin: '0 0 8px' }}>DURATION (MIN)</p>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', margin: '0 0 8px' }}>TIME</p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text-primary)',
                fontSize: 16,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            background: 'var(--green-dim)',
            borderRadius: 12,
            border: '1px solid rgba(0,212,138,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Estimated calories burned</span>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
            ~{estimateCalories(selectedType.type, Number(duration))} kcal
          </span>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handleAdd} disabled={submitting}>
          {submitting ? 'Saving...' : 'Log Activity'}
        </Button>
      </div>
    </div>
  )
}

const weekSteps = [6200, 8432, 4100, 9800, 7300, 5600, 0]

export function ActivityScreen() {
  const [selectedDay, setSelectedDay] = useState(todayIndex)
  const [activities, setActivities] = useState<ActivityDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const profile = useAppStore((s) => s.user?.profile)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const date = new Date()
    date.setDate(date.getDate() - (todayIndex - selectedDay))
    api.get<ActivityLog[]>(`/tracking/activity?date=${formatDateISO(date)}`)
      .then((res) => {
        if (!cancelled) setActivities(res.data.map(toActivityDisplay))
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load activities:', err)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [selectedDay])

  const totalCalories = activities.reduce((s, a) => s + a.calories, 0)
  const totalDuration = activities.reduce((s, a) => s + a.duration, 0)
  const stepsToday = profile?.dailySteps ?? 10000

  const weekData = weekDays.map((label, i) => ({
    label,
    index: i,
    active: i <= todayIndex,
    steps: weekSteps[i],
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <ScreenHeader title="Activity" />

      <div style={{ padding: '12px 20px 16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {weekData.map((d) => (
            <button
              key={d.label}
              onClick={() => setSelectedDay(d.index)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '8px 4px',
                background: selectedDay === d.index ? 'var(--green)' : 'transparent',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: selectedDay === d.index ? '#fff' : 'var(--text-secondary)',
                  fontWeight: selectedDay === d.index ? 700 : 400,
                }}
              >
                {d.label}
              </span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background:
                    selectedDay === d.index
                      ? 'rgba(255,255,255,0.2)'
                      : d.active && d.index !== todayIndex
                        ? 'var(--green-dim)'
                        : 'var(--bg-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="font-display"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: selectedDay === d.index ? '#fff' : d.active ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {d.index + 3}
                </span>
              </div>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(d.steps / 10000) * 100}%`,
                    background: selectedDay === d.index ? '#fff' : 'var(--green)',
                    borderRadius: 2,
                    opacity: d.active ? 1 : 0.2,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        className="no-scrollbar"
        style={{ display: 'flex', gap: 12, padding: '12px 20px', overflowX: 'auto', flexShrink: 0 }}
      >
        {[
          { label: 'Calories', value: `${totalCalories} kcal`, color: 'var(--orange)' },
          { label: 'Active Time', value: `${totalDuration} min`, color: 'var(--green)' },
          { label: 'Steps', value: stepsToday.toLocaleString(), color: 'var(--rose)' },
          { label: 'Distance', value: `${(stepsToday * 0.0008).toFixed(1)} km`, color: 'var(--blue)' },
        ].map((s) => (
          <Card key={s.label} style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 14, minWidth: 90 }}>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0, letterSpacing: '0.04em' }}>{s.label}</p>
            <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: s.color, margin: '3px 0 0' }}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {selectedDay === todayIndex ? "Today's Timeline" : `${weekDays[selectedDay]}'s Timeline`}
          </h2>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>Loading activities...</p>
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <p className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
              No activities yet
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Tap + to log your first activity</p>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {activities.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 19,
                top: 20,
                bottom: 20,
                width: 2,
                background: 'var(--border)',
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'var(--bg-card)',
                      border: `2px solid ${a.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {a.icon}
                  </div>
                </div>
                <Card style={{ flex: 1, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {a.type}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      {a.detail}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      {a.time} · {a.duration} min
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: a.color, margin: 0 }}>
                      {a.calories}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0 }}>kcal</p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowModal(true)}
        aria-label="Add activity"
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--green)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0,212,138,0.35)',
          color: '#fff',
        }}
      >
        <PlusIcon size={24} />
      </button>

      {showModal && <AddActivityModal onClose={() => setShowModal(false)} onAdd={(a) => setActivities((p) => [...p, a])} />}
    </div>
  )
}
