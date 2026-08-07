import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://snapcal.health/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('snapcal_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res: any) => res,
  async (err: any) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('snapcal_access_token')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)
