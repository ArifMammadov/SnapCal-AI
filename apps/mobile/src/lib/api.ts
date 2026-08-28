import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://snapcal.health/api'

const ACCESS_TOKEN_KEY = 'snapcal_access_token'
const REFRESH_TOKEN_KEY = 'snapcal_refresh_token'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null
let failedQueue: Array<{
  resolve: (token: string | null) => void
  reject: (err: Error) => void
}> = []

function readTokens() {
  return {
    access: localStorage.getItem(ACCESS_TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_TOKEN_KEY),
  }
}

function saveTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

async function doRefresh(): Promise<string | null> {
  const { refresh } = readTokens()
  if (!refresh) return null

  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${API_URL}/auth/refresh`,
      { refreshToken: refresh },
      { headers: { 'Content-Type': 'application/json' } }
    )
    const { accessToken, refreshToken } = res.data
    saveTokens(accessToken, refreshToken)
    return accessToken
  } catch {
    clearAuth()
    return null
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { access } = readTokens()
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ error?: { code: string; message: string } }>) => {
    const originalRequest = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = err.response?.status
    const errorCode = err.response?.data?.error?.code

    // Server-side business limit (e.g. daily free limit). Do not attempt refresh.
    if (status === 429 || errorCode === 'DAILY_LIMIT_REACHED' || errorCode === 'AI_LIMIT_REACHED' || errorCode === 'DAILY_SCAN_LIMIT' || errorCode === 'DAILY_TEXT_LIMIT') {
      const code = errorCode === 'DAILY_SCAN_LIMIT' || errorCode === 'DAILY_TEXT_LIMIT' ? errorCode : 'DAILY_LIMIT_REACHED'
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('snapcal:paywall', { detail: { code } }))
      }
      const message = err.response?.data?.error?.message || err.message || 'Request failed'
      return Promise.reject(new Error(message))
    }

    if (status !== 401 || originalRequest._retry || originalRequest.url?.includes('/auth/refresh')) {
      const message = err.response?.data?.error?.message || err.message || 'Request failed'
      return Promise.reject(new Error(message))
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        if (token && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`
        }
        return api(originalRequest)
      })
    }

    isRefreshing = true
    refreshPromise = doRefresh()

    try {
      const newToken = await refreshPromise
      processQueue(newToken ? null : new Error('Unable to refresh session'), newToken)

      if (!newToken) {
        window.location.reload()
        return Promise.reject(new Error('Session expired. Please log in again.'))
      }

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      }
      return api(originalRequest)
    } catch (refreshErr) {
      processQueue(refreshErr instanceof Error ? refreshErr : new Error('Refresh failed'), null)
      clearAuth()
      window.location.reload()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }
)

export function setAuthTokens(accessToken: string, refreshToken: string) {
  saveTokens(accessToken, refreshToken)
}

export function clearAuthTokens() {
  clearAuth()
}

export interface ApiError {
  code: string
  message: string
}
