import { useEffect, useState } from 'react'
import { WebApp } from '@vkruglikov/react-telegram-web-app'

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
      // Fallback for browser development
      setTimeout(() => setReady(true), 300)
    }
  }, [])

  return { ready, WebApp }
}
