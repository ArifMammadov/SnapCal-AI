import { useState } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'

export function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUser = useAppStore((s) => s.setUser)
  const setToken = useAppStore((s) => s.setToken)

  const demoLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/demo')
      const { accessToken, user } = res.data
      setToken(accessToken)
      setUser(user)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-8 text-center border border-slate-800 shadow-xl">
        <div className="text-4xl mb-4">🥗</div>
        <h1 className="text-2xl font-bold text-white mb-2">SnapCal AI</h1>
        <p className="text-slate-400 mb-8">Трекер питания, активности и AI-коуч</p>

        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

        <button
          onClick={demoLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {loading ? 'Вход...' : 'Demo вход (браузер)'}
        </button>

        <p className="mt-6 text-xs text-slate-500">
          В Telegram Mini App вход будет автоматическим
        </p>
      </div>
    </div>
  )
}
