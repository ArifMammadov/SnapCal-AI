import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://snapcal.health/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('snapcal_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: { code: string; message: string } }>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('snapcal_access_token')
      window.location.reload()
    }
    const message = err.response?.data?.error?.message || err.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export interface ApiError {
  code: string
  message: string
}
