export type TelegramWebApp = {
  initData?: string
  initDataUnsafe?: { user?: any; start_param?: string }
  ready: () => void
  expand: () => void
  onEvent?: (event: string, handler: () => void) => void
  offEvent?: (event: string, handler: () => void) => void
  isReady?: boolean
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}
