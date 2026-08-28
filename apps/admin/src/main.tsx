import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { App } from './App.js'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN && import.meta.env.VITE_SENTRY_DSN !== 'placeholder') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  })
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <App />
)
