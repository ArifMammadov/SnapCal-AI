import { useEffect, useState, useCallback } from 'react'
import { api } from './lib/api.js'

interface User {
  id: string
  telegramId: string
  telegramUsername: string | null
  firstName: string | null
  languageCode: string
  role: string
  subscriptionStatus: string
  createdAt: string
}

interface Program {
  id: string
  name: string
  slug: string
  instructor: string
  category: string | null
  description: string
  durationWeeks: number
  priceUsd: number | null
  level: string
  emoji: string
  gradient: string
  includes: string[]
  tag: string | null
  isActive: boolean
}

interface AuditLog {
  id: string
  skillName: string | null
  model: string | null
  tokensInput: number | null
  tokensOutput: number | null
  costUsd: number | null
  latencyMs: number | null
  flagged: boolean
  createdAt: string
}

interface Subscription {
  id: string
  userId: string
  telegramId: string | null
  telegramUsername: string | null
  firstName: string | null
  status: string
  paymentMethod: string | null
  planName: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  createdAt: string
}

interface Payment {
  id: string
  userId: string
  telegramId: string | null
  telegramUsername: string | null
  firstName: string | null
  languageCode: string
  provider: string
  providerTransactionId: string | null
  telegramChargeId: string | null
  amountStars: number | null
  amountUsd: number | null
  currency: string | null
  status: string
  paidAt: string | null
  createdAt: string
}

interface AdminStats {
  totalUsers: number
  activeSubscriptions: number
  trialUsers: number
  totalPaymentsToday: number
  totalRevenueTodayUsd: number
  totalPayments: number
  totalRevenueUsd: number
}

const TABS = [
  { id: 'overview', label: 'Обзор', icon: '◇' },
  { id: 'users', label: 'Пользователи', icon: '👤' },
  { id: 'subscriptions', label: 'Подписки и платежи', icon: '💳' },
  { id: 'programs', label: 'Программы', icon: '📚' },
  { id: 'knowledge', label: 'База знаний', icon: '🧠' },
  { id: 'ai-logs', label: 'AI логи', icon: '📊' },
]

export function App() {
  const [token, setToken] = useState(localStorage.getItem('snapcal_admin_token') ?? '')
  const [tab, setTab] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 rounded-2xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-center">SnapCal AI Admin</h1>
          <p className="text-slate-400 text-sm">Вставьте admin access token</p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full bg-slate-800 rounded-lg px-4 py-2"
            placeholder="Access token"
          />
          <button
            onClick={() => {
              localStorage.setItem('snapcal_admin_token', token)
              window.location.reload()
            }}
            className="w-full bg-emerald-500 rounded-lg py-2 font-medium"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {!collapsed && <h1 className="text-lg font-bold">SnapCal</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white text-sm">
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                tab === t.id ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
              title={collapsed ? t.label : undefined}
            >
              <span className="w-5 text-center">{t.icon}</span>
              {!collapsed && <span>{t.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={() => {
              localStorage.removeItem('snapcal_admin_token')
              window.location.reload()
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-slate-800"
            title={collapsed ? 'Logout' : undefined}
          >
            <span className="w-5 text-center">⏻</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center px-6">
          <h2 className="text-lg font-semibold">{TABS.find((t) => t.id === tab)?.label}</h2>
        </header>
        <div className="p-6">
          {tab === 'overview' && <OverviewPanel />}
          {tab === 'users' && <UsersPanel />}
          {tab === 'subscriptions' && <SubscriptionsPanel />}
          {tab === 'programs' && <ProgramsPanel />}
          {tab === 'knowledge' && <KnowledgePanel />}
          {tab === 'ai-logs' && <AiLogsPanel />}
        </div>
      </main>
    </div>
  )
}

function OverviewPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<AdminStats>('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const cards = stats
    ? [
        { label: 'Всего пользователей', value: stats.totalUsers },
        { label: 'Активных подписок', value: stats.activeSubscriptions },
        { label: 'На пробном периоде', value: stats.trialUsers },
        { label: 'Платежей сегодня', value: stats.totalPaymentsToday },
        { label: 'Выручка сегодня, $', value: stats.totalRevenueTodayUsd.toFixed(2) },
        { label: 'Всего платежей', value: stats.totalPayments },
        { label: 'Общая выручка, $', value: stats.totalRevenueUsd.toFixed(2) },
      ]
    : []

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={load} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-700">
          Обновить
        </button>
      </div>
      {loading && <p className="text-slate-400">Загрузка...</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-sm">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | 'USER' | 'ADMIN'>('')
  const [statusFilter, setStatusFilter] = useState<'' | 'ACTIVE' | 'TRIALING' | 'INACTIVE' | 'CANCELED'>('')
  const [selected, setSelected] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    if (statusFilter) params.set('status', statusFilter)
    params.set('page', String(page))
    params.set('limit', '20')
    api
      .get(`/admin/users?${params.toString()}`)
      .then((res) => {
        setUsers(res.data.data)
        setTotalPages(res.data.pagination.totalPages)
      })
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [search, roleFilter, statusFilter, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Поиск по ID, имени, @username"
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm min-w-[260px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1) }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">Все роли</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1) }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="TRIALING">TRIALING</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <button onClick={load} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-700">
          Обновить
        </button>
      </div>

      {loading && <p className="text-slate-400">Загрузка...</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3 text-left">Telegram ID</th>
              <th className="p-3 text-left">Имя / Username</th>
              <th className="p-3 text-left">Роль</th>
              <th className="p-3 text-left">Подписка</th>
              <th className="p-3 text-left">Регистрация</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/50">
                <td className="p-3 font-mono">{u.telegramId}</td>
                <td className="p-3">
                  {u.firstName || '-'} {u.telegramUsername ? `(@${u.telegramUsername})` : ''}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${u.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                    {u.subscriptionStatus}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <button onClick={() => setSelected(u)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">
                    Детали
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40">
          Назад
        </button>
        <span className="text-sm text-slate-400">Страница {page} из {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40">
          Вперёд
        </button>
      </div>

      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} onUpdate={load} />}
    </div>
  )
}

function UserDetailModal({ user, onClose, onUpdate }: { user: User; onClose: () => void; onUpdate: () => void }) {
  const [role, setRole] = useState(user.role)
  const [status, setStatus] = useState(user.subscriptionStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    api.get(`/admin/subscriptions/payments?userId=${user.id}`).then((res) => setPayments(res.data.data)).catch(() => {})
    api.get(`/admin/users/${user.id}/subscriptions`).then((res) => setSubscriptions(res.data)).catch(() => {})
    api.get(`/admin/audit-logs?userId=${user.id}`).then((res) => setLogs(res.data.data)).catch(() => {})
  }, [user.id])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.patch(`/admin/users/${user.id}`, { role, subscriptionStatus: status })
      onUpdate()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold">Пользователь</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400">Telegram ID</p>
            <p className="font-mono">{user.telegramId}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400">Username</p>
            <p>{user.telegramUsername ? `@${user.telegramUsername}` : '-'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400">Имя</p>
            <p>{user.firstName || '-'}</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-slate-400">Язык</p>
            <p>{user.languageCode}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-400">Роль</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Статус подписки</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIALING">TRIALING</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 rounded-lg py-2">Закрыть</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 rounded-lg py-2 font-medium">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        <h3 className="font-semibold pt-2">Подписки</h3>
        {subscriptions.length === 0 && <p className="text-slate-400 text-sm">Нет подписок</p>}
        <div className="space-y-2">
          {subscriptions.map((s) => (
            <div key={s.id} className="bg-slate-800/50 rounded-lg p-3 text-sm flex justify-between">
              <span>{s.planName || 'Подписка'} · <span className={s.status === 'ACTIVE' ? 'text-emerald-300' : 'text-slate-400'}>{s.status}</span></span>
              <span className="text-slate-400">до {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '-'}</span>
            </div>
          ))}
        </div>

        <h3 className="font-semibold pt-2">Платежи</h3>
        {payments.length === 0 && <p className="text-slate-400 text-sm">Нет платежей</p>}
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-slate-800/50 rounded-lg p-3 text-sm flex justify-between">
              <span>{p.provider} · <span className={p.status === 'PAID' ? 'text-emerald-300' : 'text-slate-400'}>{p.status}</span></span>
              <span>{p.amountStars ? `${p.amountStars} ⭐` : p.amountUsd ? `$${p.amountUsd}` : '-'}</span>
            </div>
          ))}
        </div>

        <h3 className="font-semibold pt-2">Последние AI-запросы</h3>
        {logs.length === 0 && <p className="text-slate-400 text-sm">Нет логов</p>}
        <div className="space-y-2">
          {logs.slice(0, 5).map((l) => (
            <div key={l.id} className="bg-slate-800/50 rounded-lg p-3 text-sm flex justify-between">
              <span>{l.skillName || 'AI'} · {(l.tokensInput || 0) + (l.tokensOutput || 0)} токенов</span>
              <span className="text-slate-400">{new Date(l.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Program | null>(null)

  useEffect(() => {
    api
      .get<Program[]>('/admin/programs')
      .then((res) => setPrograms(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load programs'))
  }, [])

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setSelected({} as Program)} className="bg-emerald-500 rounded-lg px-4 py-2 text-sm font-medium">
          + Добавить программу
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3 text-left">Название</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Категория</th>
              <th className="p-3 text-left">Цена</th>
              <th className="p-3 text-left">Активна</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {programs.map((p) => (
              <tr key={p.id} className="hover:bg-slate-900/50">
                <td className="p-3">{p.name}</td>
                <td className="p-3 font-mono text-slate-400">{p.slug}</td>
                <td className="p-3">{p.category || '-'}</td>
                <td className="p-3">{p.priceUsd ? `$${p.priceUsd}` : '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                    {p.isActive ? 'Да' : 'Нет'}
                  </span>
                </td>
                <td className="p-3">
                  <button onClick={() => setSelected(p)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">
                    Редактировать
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && <ProgramModal program={selected} onClose={() => setSelected(null)} onSave={() => {
        api.get<Program[]>('/admin/programs').then((res) => setPrograms(res.data))
      }} />}
    </div>
  )
}

function ProgramModal({ program, onClose, onSave }: { program: Program | null; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState(program?.name || '')
  const [description, setDescription] = useState(program?.description || '')
  const [instructor, setInstructor] = useState(program?.instructor || '')
  const [category, setCategory] = useState(program?.category || '')
  const [durationWeeks, setDurationWeeks] = useState(program?.durationWeeks || 4)
  const [priceUsd, setPriceUsd] = useState(program?.priceUsd || 0)
  const [level, setLevel] = useState(program?.level || 'beginner')
  const [emoji, setEmoji] = useState(program?.emoji || '')
  const [gradient, setGradient] = useState(program?.gradient || '')
  const [includes, setIncludes] = useState((program?.includes || []).join('\n'))
  const [isActive, setIsActive] = useState(program?.isActive !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const payload = {
      name,
      description,
      instructor,
      category,
      durationWeeks,
      priceUsd,
      level,
      emoji,
      gradient,
      includes: includes.split('\n').map((s) => s.trim()).filter(Boolean),
      isActive,
    }
    try {
      if (program?.id) {
        await api.patch(`/admin/programs/${program.id}`, payload)
      } else {
        await api.post('/admin/programs', payload)
      }
      onSave()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <h2 className="text-lg font-bold">{program?.id ? 'Редактировать программу' : 'Новая программа'}</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Название</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Инструктор</label>
            <input type="text" value={instructor} onChange={(e) => setInstructor(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Категория</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Недель</label>
            <input type="number" value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Цена USD</label>
            <input type="number" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-400">Включено (по строкам)</label>
          <textarea value={includes} onChange={(e) => setIncludes(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
        </div>
        <div className="flex items-center gap-2">
          <input id="isActive" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="isActive" className="text-sm">Активна</label>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 rounded-lg py-2">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 rounded-lg py-2 font-medium">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KnowledgePanel() {
  return (
    <div className="space-y-4">
      <p className="text-slate-400">Knowledge base editor will be added here.</p>
    </div>
  )
}

function SubscriptionsPanel() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')

  const loadSubscriptions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    api
      .get(`/admin/subscriptions?${params.toString()}`)
      .then((res) => setSubscriptions(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const loadPayments = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (providerFilter) params.set('provider', providerFilter)
    api
      .get(`/admin/subscriptions/payments?${params.toString()}`)
      .then((res) => setPayments(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load payments'))
      .finally(() => setLoading(false))
  }, [statusFilter, providerFilter])

  useEffect(() => {
    if (activeTab === 'subscriptions') loadSubscriptions()
    else loadPayments()
  }, [activeTab, loadSubscriptions, loadPayments])

  const filteredSubscriptions = subscriptions.filter((s) => {
    const hay = [s.telegramId, s.telegramUsername, s.firstName].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  const filteredPayments = payments.filter((p) => {
    const hay = [p.telegramId, p.telegramUsername, p.firstName].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {(['subscriptions', 'payments'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm capitalize ${activeTab === t ? 'bg-emerald-500' : 'bg-slate-800'}`}
          >
            {t === 'subscriptions' ? 'Подписки' : 'Платежи'}
          </button>
        ))}
        <button
          onClick={() => (activeTab === 'subscriptions' ? loadSubscriptions() : loadPayments())}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-700"
        >
          Обновить
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ID, имени, @username"
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm min-w-[260px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          {activeTab === 'subscriptions'
            ? [<option key="ACTIVE" value="ACTIVE">ACTIVE</option>, <option key="TRIALING" value="TRIALING">TRIALING</option>, <option key="INACTIVE" value="INACTIVE">INACTIVE</option>, <option key="CANCELED" value="CANCELED">CANCELED</option>]
            : [<option key="PAID" value="PAID">PAID</option>, <option key="PENDING" value="PENDING">PENDING</option>, <option key="FAILED" value="FAILED">FAILED</option>, <option key="REFUNDED" value="REFUNDED">REFUNDED</option>]}
        </select>
        {activeTab === 'payments' && (
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
          >
            <option value="">Все провайдеры</option>
            <option value="TELEGRAM_STARS">Telegram Stars</option>
            <option value="STRIPE">Stripe</option>
          </select>
        )}
      </div>

      {loading && <p className="text-slate-400">Загрузка...</p>}

      {activeTab === 'subscriptions' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-left">Telegram ID</th>
                <th className="p-3 text-left">Имя / Username</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">План</th>
                <th className="p-3 text-left">Окончание</th>
                <th className="p-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSubscriptions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-mono">{s.telegramId || '-'}</td>
                  <td className="p-3">
                    {s.firstName || '-'} {s.telegramUsername ? `(@${s.telegramUsername})` : ''}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${s.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3">{s.planName || '-'}</td>
                  <td className="p-3 text-slate-400">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '-'}</td>
                  <td className="p-3">
                    <button onClick={() => setSelectedSub(s)} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded">
                      Продлить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && !loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-left">Telegram ID</th>
                <th className="p-3 text-left">Имя</th>
                <th className="p-3 text-left">Провайдер</th>
                <th className="p-3 text-left">Сумма</th>
                <th className="p-3 text-left">Статус</th>
                <th className="p-3 text-left">Дата</th>
                <th className="p-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-mono">{p.telegramId || '-'}</td>
                  <td className="p-3">{p.firstName || '-'} {p.telegramUsername ? `(@${p.telegramUsername})` : ''}</td>
                  <td className="p-3">{p.provider}</td>
                  <td className="p-3">{p.amountStars ? `${p.amountStars} ⭐` : p.amountUsd ? `$${p.amountUsd}` : '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    {p.status === 'PAID' && (
                      <button onClick={() => setSelectedPayment(p)} className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded">
                        Возврат
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSub && <SubscriptionExtendModal subscription={selectedSub} onClose={() => setSelectedSub(null)} onUpdated={loadSubscriptions} />}
      {selectedPayment && <PaymentRefundModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} onUpdated={loadPayments} />}
    </div>
  )
}

function SubscriptionExtendModal({ subscription, onClose, onUpdated }: { subscription: Subscription; onClose: () => void; onUpdated: () => void }) {
  const [days, setDays] = useState(30)
  const [status, setStatus] = useState(subscription.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/subscriptions/${subscription.id}/extend`, { days, status })
      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка продления')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Продлить подписку</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Пользователь</label>
          <p className="text-sm">{subscription.firstName || '-'} {subscription.telegramUsername ? `(@${subscription.telegramUsername})` : ''}</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Дней продления</label>
          <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Статус</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIALING">TRIALING</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 rounded-lg py-2">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 rounded-lg py-2 font-medium">
            {saving ? 'Сохранение...' : 'Продлить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentRefundModal({ payment, onClose, onUpdated }: { payment: Payment; onClose: () => void; onUpdated: () => void }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post(`/admin/subscriptions/payments/${payment.id}/refund`, { reason })
      onUpdated()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка возврата')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Возврат платежа</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Платёж</label>
          <p className="text-sm">{payment.amountStars ? `${payment.amountStars} ⭐` : payment.amountUsd ? `$${payment.amountUsd}` : '-'} · {payment.provider}</p>
          {payment.provider === 'TELEGRAM_STARS' && <p className="text-xs text-amber-300">⚠️ Telegram Stars возвращаются вручную через @BotFather/Support.</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Причина</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2" placeholder="Необязательно" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 bg-slate-800 rounded-lg py-2">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-red-500 rounded-lg py-2 font-medium">
            {saving ? 'Обработка...' : 'Возврат'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AiLogsPanel() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<AuditLog[]>('/admin/audit-logs')
      .then((res) => setLogs(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load logs'))
  }, [])

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3 text-left">Skill</th>
              <th className="p-3 text-left">Model</th>
              <th className="p-3 text-left">Tokens</th>
              <th className="p-3 text-left">Cost</th>
              <th className="p-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((l) => (
              <tr key={l.id} className={l.flagged ? 'bg-red-500/10' : ''}>
                <td className="p-3">{l.skillName || '-'}</td>
                <td className="p-3">{l.model || '-'}</td>
                <td className="p-3">{(l.tokensInput || 0) + (l.tokensOutput || 0)}</td>
                <td className="p-3">{l.costUsd ? `$${l.costUsd}` : '-'}</td>
                <td className="p-3 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
