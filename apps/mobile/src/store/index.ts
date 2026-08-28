import { create } from 'zustand'
import { detectLanguage, setCurrentLanguage, type Language } from '../lib/i18n.js'

const initialLanguage = typeof window !== 'undefined' ? (localStorage.getItem('snapcal_language') as Language | null) ?? detectLanguage() : 'en'
setCurrentLanguage(initialLanguage === 'ru' ? 'ru' : 'en')

export interface User {
  id: string
  telegramId?: string | null
  telegramUsername?: string | null
  firstName: string
  lastName?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  languageCode?: string
  role: string
  plan?: string
  subscriptionStatus?: string
  trialEndsAt?: string | null
  createdAt?: string
  profile?: {
    id: string
    birthDate?: string | null
    dateOfBirth?: string | null
    gender?: string | null
    heightCm?: number | null
    currentWeightKg?: number | null
    weightKg?: number | null
    targetWeightKg?: number | null
    primaryGoal?: string | null
    activityLevel?: string | null
    dailyCalories?: number | null
    dailyProteinG?: number | null
    dailyCarbsG?: number | null
    dailyFatG?: number | null
    dailyWaterMl?: number | null
    dailySleepH?: number | null
    sleepGoalH?: number | null
    dailySteps?: number | null
    workoutsPerWeek?: number | null
    dietaryPreferences?: string[]
    allergies?: string[]
    timezone?: string
    units?: string
    goalPlan?: any
  } | null
}

export type Tab = 'home' | 'activity' | 'coach' | 'stats' | 'profile'

interface AppState {
  currentScreen: string
  setScreen: (screen: string) => void
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  user: User | null
  setUser: (user: User | null) => void
  token: string | null
  refreshToken: string | null
  setToken: (token: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  logout: () => void
  language: string
  setLanguage: (language: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'home',
  setScreen: (screen) => set({ currentScreen: screen }),
  activeTab: 'coach',
  setActiveTab: (tab) => set({ activeTab: tab }),
  user: null,
  setUser: (user) => set({ user }),
  language: initialLanguage,
  setLanguage: (language) => {
    setCurrentLanguage(language === 'ru' ? 'ru' : 'en')
    localStorage.setItem('snapcal_language', language)
    set({ language })
  },
  token: localStorage.getItem('snapcal_access_token'),
  refreshToken: localStorage.getItem('snapcal_refresh_token'),
  setToken: (token) => {
    if (token) localStorage.setItem('snapcal_access_token', token)
    else localStorage.removeItem('snapcal_access_token')
    set({ token })
  },
  setRefreshToken: (refreshToken: string | null) => {
    if (refreshToken) localStorage.setItem('snapcal_refresh_token', refreshToken)
    else localStorage.removeItem('snapcal_refresh_token')
    set({ refreshToken })
  },
  logout: () => {
    localStorage.removeItem('snapcal_access_token')
    localStorage.removeItem('snapcal_refresh_token')
    set({ user: null, token: null, refreshToken: null })
  },
}))
