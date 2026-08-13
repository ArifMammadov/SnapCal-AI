import { useState } from 'react'
import { useNotifications, useReminderPreferences } from '../lib/data.js'
import { Bell, X, ChevronLeft, Clock, Droplets, Dumbbell, Scale, Utensils } from 'lucide-react'

interface NotificationScreenProps {
  onBack: () => void
}

const days = [
  { value: 'monday', label: 'Пн' },
  { value: 'tuesday', label: 'Вт' },
  { value: 'wednesday', label: 'Ср' },
  { value: 'thursday', label: 'Чт' },
  { value: 'friday', label: 'Пт' },
  { value: 'saturday', label: 'Сб' },
  { value: 'sunday', label: 'Вс' },
]

export function NotificationScreen({ onBack }: NotificationScreenProps) {
  const [activeTab, setActiveTab] = useState<'notifications' | 'settings'>('notifications')
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()
  const { prefs, loading: prefsLoading, saving, save } = useReminderPreferences()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-primary)' }}><ChevronLeft size={24} /></button>
        <h1 style={{ fontSize: 18, margin: 0, flex: 1 }}>Уведомления {unreadCount > 0 && <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>{unreadCount}</span>}</h1>
      </header>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'notifications', label: 'История' },
          { key: 'settings', label: 'Напоминания' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            style={{
              flex: 1,
              padding: 14,
              background: 'none',
              border: 'none',
              color: activeTab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитаны'}</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none' }}>Отметить все прочитанными</button>
              )}
            </div>
            {loading && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Загрузка...</p>}
            {!loading && notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }}
/>
                <p>Пока нет уведомлений</p>
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                style={{
                  background: n.isRead ? 'var(--bg-secondary)' : 'rgba(123, 110, 246, 0.08)',
                  borderRadius: 16,
                  padding: 14,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ReminderIcon type={n.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{n.title}</p>
                    {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--accent)', flexShrink: 0 }}></span>}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.body}</p>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>{new Date(n.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-5">
            {prefsLoading && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Загрузка...</p>}
            {prefs && (
              <>
                <Toggle
                  label="Включить напоминания"
                  checked={prefs.enabled}
                  onChange={(v) => save({ enabled: v })}
                />
                <Toggle
                  label="Напоминания пить воду"
                  icon={<Droplets size={18} />}
                  checked={prefs.waterReminders}
                  onChange={(v) => save({ waterReminders: v })}
                />

                <TimeRow icon={<Utensils size={18} />} label="Завтрак" value={prefs.breakfastAt} onChange={(v) => save({ breakfastAt: v })} />
                <TimeRow icon={<Utensils size={18} />} label="Обед" value={prefs.lunchAt} onChange={(v) => save({ lunchAt: v })} />
                <TimeRow icon={<Utensils size={18} />} label="Ужин" value={prefs.dinnerAt} onChange={(v) => save({ dinnerAt: v })} />
                <TimeRow icon={<Scale size={18} />} label="Взвешивание" value={prefs.weightAt} onChange={(v) => save({ weightAt: v })} />
                <DayPicker label="День взвешивания" value={prefs.weightDay} onChange={(v) => save({ weightDay: v })} />
                <TimeRow icon={<Dumbbell size={18} />} label="Тренировка" value={prefs.workoutAt} onChange={(v) => save({ workoutAt: v })} />
                <DaysMultiPicker label="Дни тренировок" values={prefs.workoutDays} onChange={(v) => save({ workoutDays: v })} />

                <div style={{ paddingTop: 12 }}>
                  <button
                    onClick={() => save(prefs)}
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: 14,
                      borderRadius: 14,
                      border: 'none',
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 600,
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? 'Сохранение...' : 'Сохранить настройки'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReminderIcon({ type }: { type: string }) {
  switch (type) {
    case 'breakfast':
    case 'lunch':
    case 'dinner':
      return <Utensils size={18} color="var(--accent)" />
    case 'weight':
      return <Scale size={18} color="var(--accent)" />
    case 'workout':
      return <Dumbbell size={18} color="var(--accent)" />
    case 'water':
      return <Droplets size={18} color="var(--accent)" />
    default:
      return <Bell size={18} color="var(--accent)" />
  }
}

function Toggle({ label, checked, onChange, icon }: { label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <span style={{ color: 'var(--accent)' }}>{icon}</span>}
        <span style={{ fontSize: 15 }}>{label}</span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          border: 'none',
          background: checked ? 'var(--accent)' : 'var(--bg-tertiary)',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 25 : 3,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  )
}

function TimeRow({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontSize: 15 }}>{label}</span>
      </div>
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

function DayPicker({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 15 }}>{label}</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => (
          <button
            key={d.value}
            onClick={() => onChange(value === d.value ? null : d.value)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              background: value === d.value ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: value === d.value ? '#fff' : 'var(--text-secondary)',
              fontSize: 12,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function DaysMultiPicker({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 15 }}>{label}</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => {
          const active = values.includes(d.value)
          return (
            <button
              key={d.value}
              onClick={() => onChange(active ? values.filter((v) => v !== d.value) : [...values, d.value])}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                border: 'none',
                background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: active ? '#fff' : 'var(--text-secondary)',
                fontSize: 12,
              }}
            >
              {d.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
