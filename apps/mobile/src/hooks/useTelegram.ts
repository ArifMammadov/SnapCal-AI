import { useEffect, useState } from 'react'

export interface TelegramUser {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
  region?: string
}

export function useTelegram() {
  const [ready, setReady] = useState(false)
  const [tgUser, setTgUser] = useState<TelegramUser | undefined>(undefined)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const webApp = window.Telegram?.WebApp
    if (webApp) {
      webApp.ready()
      webApp.expand()
      setTgUser(webApp.initDataUnsafe?.user)
    }
    // Always mark ready so browser fallback works
    setTimeout(() => setReady(true), 200)
  }, [])

  return { ready, tgUser }
}

export function detectTelegramLanguage(tgUser?: TelegramUser): string {
  const code = tgUser?.language_code || (typeof navigator !== 'undefined' ? navigator.language : '')
  if (!code) return 'en'
  const normalized = code.toLowerCase().split('-')[0]
  const supported = ['en', 'ru', 'uz', 'kk', 'az', 'tr', 'ar']
  if (supported.includes(normalized)) return normalized
  // Regional fallbacks
  if (['ru', 'uk', 'be'].includes(normalized)) return 'ru'
  return 'en'
}

/** @deprecated use detectTelegramLanguage to avoid conflict with i18n.detectLanguage */
export const detectLanguage = detectTelegramLanguage
