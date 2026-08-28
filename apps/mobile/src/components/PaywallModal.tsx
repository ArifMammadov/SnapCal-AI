import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { Button } from './ui.js'

const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null

interface PaywallModalProps {
  code: 'DAILY_SCAN_LIMIT' | 'DAILY_TEXT_LIMIT' | 'DAILY_LIMIT_REACHED' | null
  onClose: () => void
}

export function PaywallModal({ code, onClose }: PaywallModalProps) {
  const [priceStars, setPriceStars] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle')

  useEffect(() => {
    api.get<{ plans: { slug: string; priceStars: number }[] }>('/subscriptions/plans')
      .then((res) => {
        const pro = res.data.plans.find((p) => p.slug === 'pro_monthly')
        if (pro?.priceStars) setPriceStars(pro.priceStars)
      })
      .catch(() => setPriceStars(250))
  }, [])

  const handleSubscribe = async () => {
    if (!tg?.openInvoice || !priceStars) return
    setLoading(true)
    setStatus('pending')
    try {
      const res = await api.post<{ invoiceUrl: string }>('/subscriptions/stars/invoice')
      tg.openInvoice(res.data.invoiceUrl, (paymentStatus: 'paid' | 'cancelled' | 'failed' | 'pending') => {
        setLoading(false)
        if (paymentStatus === 'paid') {
          setStatus('success')
        } else if (paymentStatus === 'pending') {
          setStatus('pending')
        } else {
          setStatus('failed')
        }
      })
    } catch (err: any) {
      setLoading(false)
      setStatus('failed')
    }
  }

  const handleRestore = async () => {
    setLoading(true)
    try {
      const res = await api.get<{ subscription: { status: string } }>('/subscriptions/status')
      if (res.data.subscription?.status === 'active') {
        setStatus('success')
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>{t('subscriptionSuccess')}</h2>
            <Button fullWidth onClick={onClose}>{t('close')}</Button>
          </div>
        </div>
      </div>
    )
  }

  const subtitle = code === 'DAILY_SCAN_LIMIT'
    ? t('paywallScanLimit')
    : code === 'DAILY_TEXT_LIMIT'
    ? t('paywallTextLimit')
    : t('paywallTrialExpired')

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 22 }}>{t('paywallTitle')}</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>{subtitle}</p>
          <p style={{ margin: '0 0 20px', color: 'var(--text-primary)', fontSize: 15, fontWeight: 500 }}>{t('paywallSubtitle')}</p>
          <Button fullWidth size="lg" onClick={handleSubscribe} disabled={loading}>
            {loading ? t('subscriptionPending') : t('subscribeButton', { price: priceStars ?? 250 })}
          </Button>
          <div style={{ height: 12 }} />
          <Button fullWidth variant="secondary" onClick={handleRestore} disabled={loading}>
            {t('restorePurchases')}
          </Button>
          {status === 'failed' && (
            <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 12 }}>{t('subscriptionFailed')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20,
}

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 24,
  border: '1px solid var(--border)',
  width: '100%',
  maxWidth: 360,
  boxShadow: 'var(--shadow-card)',
}
