import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAppStore } from '../store/index.js'
import { Card, Button } from '../components/ui.js'

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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 340,
          padding: '36px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🥗</div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          SnapCal AI
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
          AI nutrition coach, calorie tracker, and transformation plans
        </p>

        {error && <div style={{ marginBottom: 16, padding: '10px 12px', background: 'var(--rose-dim)', borderRadius: 12, color: 'var(--rose)', fontSize: 13 }}>{error}</div>}

        <Button variant="primary" size="lg" fullWidth onClick={demoLogin} disabled={loading}>
          {loading ? 'Signing in...' : 'Demo Login (Browser)'}
        </Button>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          In Telegram Mini App login will be automatic
        </p>
      </Card>
    </div>
  )
}
