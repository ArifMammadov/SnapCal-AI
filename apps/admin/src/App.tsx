import { useState } from 'react'
import { api } from './lib/api'

export function App() {
  const [token, setToken] = useState(localStorage.getItem('snapcal_admin_token') ?? '')
  const [tab, setTab] = useState('users')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <h1 className="text-xl font-bold">SnapCal AI Admin</h1>
      </header>

      <div className="p-4">
        {!token ? (
          <div className="max-w-md mx-auto mt-20 bg-slate-900 rounded-2xl p-6 space-y-4">
            <p className="text-slate-400">Paste admin access token</p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-slate-800 rounded-lg px-4 py-2"
              placeholder="Access token"
            />
            <button
              onClick={() => localStorage.setItem('snapcal_admin_token', token)}
              className="w-full bg-emerald-500 rounded-lg py-2 font-medium"
            >
              Login
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <nav className="flex gap-2">
              {['users', 'knowledge', 'ai-logs', 'subscriptions'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize ${tab === t ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  {t.replace('-', ' ')}
                </button>
              ))}
            </nav>
            <p className="text-slate-400">{tab} panel will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
