import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        initDataUnsafe?: { user?: any }
      }
    }
  }
}

export function useTelegram() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const webApp = window.Telegram?.WebApp
    if (webApp) {
      webApp.ready()
      webApp.expand()
    }
    // Always mark ready so browser fallback works
    setTimeout(() => setReady(true), 200)
  }, [])

  return { ready }
}
