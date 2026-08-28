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

export function App() {
  const [token, setToken] = useState(localStorage.getItem('snapcal_admin_token') ?? '')
  const [tab, setTab] = useState('users')

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
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">SnapCal AI Admin</h1>
        <button
          onClick={() => {
            localStorage.removeItem('snapcal_admin_token')
            window.location.reload()
          }}
          className="text-sm text-red-400"
        >
          Logout
        </button>
      </header>

      <div className="p-4 space-y-4">
        <nav className="flex flex-wrap gap-2">
          {['users', 'programs', 'knowledge', 'ai-logs', 'subscriptions'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-emerald-500' : 'bg-slate-800'}`}
            >
              {t.replace('-', ' ')}
            </button>
          ))}
        </nav>

        {tab === 'users' && <UsersPanel />}
        {tab === 'programs' && <ProgramsPanel />}
        {tab === 'knowledge' && <KnowledgePanel />}
        {tab === 'ai-logs' && <AiLogsPanel />}
        {tab === 'subscriptions' && <SubscriptionsPanel />}
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

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<User[]>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = users.filter((u) => {
    const matchesSearch =
      [u.telegramId, u.firstName, u.telegramUsername].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter ? u.role === roleFilter : true
    const matchesStatus = statusFilter ? u.subscriptionStatus === statusFilter : true
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ID, имени, username"
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm min-w-[220px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">Все роли</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="TRIALING">TRIALING</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="CANCELED">CANCELED</option>
        </select>
        <button
          onClick={load}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-700"
        >
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
            {filtered.map((u) => (
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
                  <button
                    onClick={() => setSelected(u)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded"
                  >
                    Детали
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">Пользователь {user.telegramId}</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Роль</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Статус подписки</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIALING">TRIALING</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="CANCELED">CANCELED</option>
          </select>
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

function ProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Program | null>(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<Program[]>('/admin/programs')
      .then((res) => setPrograms(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load programs'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleActive = async (p: Program) => {
    try {
      await api.patch(`/admin/programs/${p.id}`, { isActive: !p.isActive })
      load()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Ошибка')
    }
  }

  const handleDelete = async (p: Program) => {
    if (!confirm(`Удалить программу "${p.name}"?`)) return
    try {
      await api.delete(`/admin/programs/${p.id}`)
      load()
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Ошибка удаления')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {error && <p className="text-red-400">{error}</p>}
        <button
          onClick={() => setCreating(true)}
          className="bg-emerald-500 hover:bg-emerald-600 rounded-lg px-4 py-2 text-sm font-medium"
        >
          + Новая программа
        </button>
      </div>

      {loading && <p className="text-slate-400">Загрузка...</p>}

      <div className="grid gap-3">
        {programs.map((p) => (
          <div key={p.id} className="bg-slate-900 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{p.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${p.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                  {p.isActive ? 'active' : 'inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {p.category || 'no category'} · {p.slug} · {p.priceUsd !== null ? `$${p.priceUsd}` : 'free'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(p)}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded"
              >
                Редактировать
              </button>
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs px-3 py-1.5 rounded ${p.isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}
              >
                {p.isActive ? 'Деактивировать' : 'Активировать'}
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="text-xs bg-red-500/20 text-red-300 px-3 py-1.5 rounded"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <ProgramModal
          program={editing}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSave={() => { load(); setEditing(null); setCreating(false) }}
        />
      )}
    </div>
  )
}

function ProgramModal({ program, onClose, onSave }: { program: Program | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: program?.name || '',
    slug: program?.slug || '',
    instructor: program?.instructor || 'SnapCal Expert',
    category: program?.category || 'Weight Loss',
    description: program?.description || '',
    durationWeeks: program?.durationWeeks || 4,
    priceUsd: program?.priceUsd ?? 0,
    level: program?.level || 'Beginner',
    emoji: program?.emoji || '🎯',
    gradient: program?.gradient || 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    includes: program?.includes || [],
    tag: program?.tag || '',
    isActive: program?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        includes: form.includes.filter(Boolean),
        durationWeeks: Number(form.durationWeeks),
        priceUsd: Number(form.priceUsd),
      }
      if (program) {
        await api.patch(`/admin/programs/${program.id}`, payload)
      } else {
        await api.post('/admin/programs', payload)
      }
      onSave()
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4"
      >
        <h2 className="text-lg font-bold">{program ? 'Редактировать программу' : 'Новая программа'}</h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {[
          { key: 'name', label: 'Название', type: 'text' },
          { key: 'slug', label: 'Slug (опционально)', type: 'text' },
          { key: 'instructor', label: 'Инструктор', type: 'text' },
          { key: 'category', label: 'Категория', type: 'text' },
          { key: 'level', label: 'Уровень', type: 'text' },
          { key: 'emoji', label: 'Emoji', type: 'text' },
          { key: 'gradient', label: 'Gradient CSS', type: 'text' },
          { key: 'tag', label: 'Tag', type: 'text' },
        ].map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="block text-sm text-slate-400">{f.label}</label>
            <input
              type={f.type}
              value={(form as any)[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              required={f.key === 'name'}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className="block text-sm text-slate-400">Описание</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 min-h-[80px]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Длительность (недель)</label>
            <input
              type="number"
              min={1}
              value={form.durationWeeks}
              onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-slate-400">Цена USD (0 = бесплатно)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.priceUsd}
              onChange={(e) => setForm({ ...form, priceUsd: Number(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm text-slate-400">Что включено (через запятую)</label>
          <input
            type="text"
            value={form.includes.join(', ')}
            onChange={(e) => setForm({ ...form, includes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm text-slate-400">Активна</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 bg-slate-800 rounded-lg py-2">Отмена</button>
          <button type="submit" disabled={saving} className="flex-1 bg-emerald-500 rounded-lg py-2 font-medium">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  )
}

function KnowledgePanel() {
  return <p className="text-slate-400">Knowledge base editor will be added here.</p>
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
      <div className="overflow-x-auto">
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

function SubscriptionsPanel() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const loadSubscriptions = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/subscriptions')
      .then((res) => setSubscriptions(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load subscriptions'))
      .finally(() => setLoading(false))
  }, [])

  const loadPayments = useCallback(() => {
    setLoading(true)
    api
      .get('/admin/subscriptions/payments')
      .then((res) => setPayments(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load payments'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'subscriptions') loadSubscriptions()
    else loadPayments()
  }, [activeTab, loadSubscriptions, loadPayments])

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
              {subscriptions.map((s) => (
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
                    <button
                      onClick={() => setSelectedSub(s)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded"
                    >
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
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-900/50">
                  <td className="p-3 font-mono">{p.telegramId || '-'}</td>
                  <td className="p-3">{p.firstName || '-'} {p.telegramUsername ? `(@${p.telegramUsername})` : ''}</td>
                  <td className="p-3">{p.provider}</td>
                  <td className="p-3">
                    {p.amountStars ? `${p.amountStars} ⭐` : p.amountUsd ? `$${p.amountUsd}` : '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{p.paidAt ? new Date(p.paidAt).toLocaleString() : new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    {p.status === 'PAID' && (
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="text-xs bg-red-500/20 text-red-300 px-3 py-1 rounded"
                      >
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
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
          />
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
          <p className="text-sm">
            {payment.amountStars ? `${payment.amountStars} ⭐` : payment.amountUsd ? `$${payment.amountUsd}` : '-'} · {payment.provider}
          </p>
          {payment.provider === 'TELEGRAM_STARS' && (
            <p className="text-xs text-amber-300">⚠️ Telegram Stars возвращаются вручную через @BotFather/Support.</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">Причина</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
            placeholder="Необязательно"
          />
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

