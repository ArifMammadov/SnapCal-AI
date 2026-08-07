import { useEffect, useState } from 'react'
import { api } from './lib/api.js'

interface User {
  id: string
  telegramId: string
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
  category: string | null
  priceUsd: number | null
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
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<User[]>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load users'))
  }, [])

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="p-3 text-left">Telegram ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-mono">{u.telegramId}</td>
                <td className="p-3">{u.firstName || '-'}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.subscriptionStatus}</td>
                <td className="p-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProgramsPanel() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Program[]>('/admin/programs')
      .then((res) => setPrograms(res.data))
      .catch((err) => setError(err.response?.data?.error?.message || 'Failed to load programs'))
  }, [])

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      <div className="grid gap-3">
        {programs.map((p) => (
          <div key={p.id} className="bg-slate-900 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-slate-400">{p.category || 'no category'} · {p.isActive ? 'active' : 'inactive'}</p>
            </div>
            <span className="font-bold">{p.priceUsd !== null ? `$${p.priceUsd}` : '-'}</span>
          </div>
        ))}
      </div>
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

function SubscriptionsPanel() {
  return <p className="text-slate-400">Subscription management will be added here.</p>
}
