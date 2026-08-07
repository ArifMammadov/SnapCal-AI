import { create } from 'zustand'

export interface User {
  id: string
  telegramId: string
  firstName: string
  languageCode: string
  role: string
  subscriptionStatus: string
  trialEndsAt?: string
  profile?: {
    id: string
    birthDate?: string | null
    gender?: string | null
    heightCm?: number | null
    currentWeightKg?: number | null
    targetWeightKg?: number | null
    primaryGoal?: string | null
    activityLevel?: string | null
    dailyCalories?: number | null
    timezone?: string
    units?: string
  } | null
}

interface AppState {
  currentScreen: string
  setScreen: (screen: string) => void
  user: User | null
  setUser: (user: User | null) => void
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'home',
  setScreen: (screen) => set({ currentScreen: screen }),
  user: null,
  setUser: (user) => set({ user }),
  token: localStorage.getItem('snapcal_access_token'),
  setToken: (token) => {
    if (token) localStorage.setItem('snapcal_access_token', token)
    else localStorage.removeItem('snapcal_access_token')
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('snapcal_access_token')
    set({ user: null, token: null })
  },
}))
