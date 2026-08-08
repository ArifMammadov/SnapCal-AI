import { useEffect, useState, useCallback } from 'react'
import { api } from './api.js'

export interface TrackingSummary {
  date: string
  caloriesConsumed: number
  calorieGoal: number
  proteinG: number
  proteinGoal: number
  carbsG: number
  fatG: number
  waterMl: number
  waterGoalMl: number
  sleepH: number
  sleepGoalH: number
  steps: number
  stepsGoal: number
  weightKg: number
  activitiesCount: number
  caloriesBurned: number
  healthScore: number
  foodLogs: FoodLog[]
  activities: ActivityLog[]
}

export interface FoodLog {
  id: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  name: string
  calories: number
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  loggedAt: string
  aiAnalyzed: boolean
}

export interface ActivityLog {
  id: string
  type: string
  durationMin: number
  caloriesBurned: number | null
  startedAt: string
  notes: string | null
}

export interface MarketplaceProgram {
  id: string
  name: string
  slug: string
  description: string
  category: string
  level: string
  durationWeeks: number
  price: number
  rating: number
  reviews: number
  enrolled: number
  emoji: string
  gradient: string
  includes: string[]
  isActive: boolean
  createdAt: string
  instructor: string
  tag: string | null
}

export interface ChatMessage {
  id: string
  role: 'USER' | 'AI'
  type: 'TEXT' | 'FOOD_ANALYSIS' | 'MACRO_CARD'
  content: string
  createdAt: string
  attachments?: {
    foodData?: {
      name: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      serving: string
      suggestedMealType: string
    }
    imageUrl?: string
  }
}

export function useTrackingSummary(date?: string) {
  const [data, setData] = useState<TrackingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = date ? `?date=${date}` : ''
      const res = await api.get<TrackingSummary>(`/tracking/summary${query}`)
      setData(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useActivity(date?: string) {
  const [data, setData] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = date ? `?date=${date}` : ''
      const res = await api.get<ActivityLog[]>(`/tracking/activity${query}`)
      setData(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function usePrograms(category?: string) {
  const [data, setData] = useState<MarketplaceProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''
      const res = await api.get<MarketplaceProgram[]>(`/marketplace/programs${query}`)
      setData(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load programs')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    api.get<ChatMessage[]>('/ai/history')
      .then((res) => setMessages(res.data.reverse()))
      .catch(() => setMessages([]))
      .finally(() => setLoadingHistory(false))
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'USER',
      type: 'TEXT',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const res = await api.post<{ message: ChatMessage }>('/ai/chat', { message: content.trim() })
      setMessages((prev) => [...prev, { ...res.data.message, createdAt: res.data.message.createdAt || new Date().toISOString() }])
    } catch (err: any) {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'AI',
        type: 'TEXT',
        content: err.message || 'Sorry, I could not process your message. Please try again.',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setSending(false)
    }
  }, [])

  return { messages, sending, loadingHistory, sendMessage, setMessages }
}
