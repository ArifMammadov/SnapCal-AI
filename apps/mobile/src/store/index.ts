import { create } from 'zustand'

interface AppState {
  currentScreen: string
  setScreen: (screen: string) => void
  user: {
    id: string
    firstName: string
    languageCode: string
    subscriptionStatus: string
  } | null
  setUser: (user: AppState['user']) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentScreen: 'home',
  setScreen: (screen) => set({ currentScreen: screen }),
  user: null,
  setUser: (user) => set({ user }),
}))
