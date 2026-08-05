import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
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
      setReady(true)
    } else {
      setTimeout(() => setReady(true), 300)
    }
  }, [])

  return { ready }
}
