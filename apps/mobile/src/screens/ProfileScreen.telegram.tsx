import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAppStore } from '../store/index.js'
import { Card, Button } from '../components/ui.js'
import type { TelegramWebApp } from '../types/telegram.js'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        fontSize: 14,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Назад
    </button>
  )
}

export function TelegramLinkSection({ onBack }: { onBack: () => void }) {
  const { user, setUser } = useAppStore()
  const [linking, setLinking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [debug, setDebug] = useState('')

  const handleLink = async () => {
    setLinking(true)
    setError('')
    setMessage('')
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
    try {
      webApp?.ready()
      webApp?.expand()
    } catch {
      // ignore
    }
    let attempts = 0
    const maxAttempts = 60
    while (attempts < maxAttempts) {
      const initData = webApp?.initData
      const tgUser = webApp?.initDataUnsafe?.user
      attempts++
      if (initData && tgUser) {
        try {
          const res = await api.post('/auth/link-telegram', { initData })
          setUser(res.data.user)
          setMessage('Telegram успешно привязан!')
          setDebug('')
          setLinking(false)
          return
        } catch (err: any) {
          const serverMsg = err.response?.data?.error?.message || err.message || ''
          if (err.response?.data?.error?.code === 'TELEGRAM_ALREADY_LINKED') {
            setError('Этот Telegram уже привязан к другому аккаунту.')
          } else {
            setError(serverMsg || 'Не удалось привязать Telegram')
          }
          setDebug('')
          setLinking(false)
          return
        }
      }
      await wait(200)
    }
    setError('Не удалось получить данные Telegram. Убедитесь, что вы открыли SnapCal через Telegram.')
    setDebug('initData not received after 60 attempts')
    setLinking(false)
  }

  return (
    <div className="no-scrollbar" style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ padding: '56px 20px 24px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
        <BackButton onBack={onBack} />
        <h1 className="font-display" style={{ margin: '24px 0 0', fontSize: 24, color: 'var(--text-primary)' }}>Telegram</h1>
      </div>
      <div style={{ padding: 24 }}>
        <Card style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✈️</div>
          {user?.telegramId ? (
            <>
              <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 16 }}>✓ Telegram привязан</p>
              {user.telegramUsername && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>@{user.telegramUsername}</p>}
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16 }}>Привяжите Telegram</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
                Это позволит входить в SnapCal напрямую из Telegram и получать напоминания.
              </p>
              <Button variant="primary" size="lg" fullWidth onClick={handleLink} disabled={linking} style={{ marginTop: 20 }}>
                {linking ? 'Получение данных...' : 'Привязать Telegram'}
              </Button>
            </>
          )}

          {message && <p style={{ color: 'var(--green)', marginTop: 16, fontSize: 14 }}>{message}</p>}
          {error && <p style={{ color: 'var(--rose)', marginTop: 16, fontSize: 14 }}>{error}</p>}
          {debug && <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 11, wordBreak: 'break-all' }}>{debug}</p>}
        </Card>
      </div>
    </div>
  )
}
