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
    api.get<{ messages: ChatMessage[] }>('/ai/history')
      .then((res) => setMessages(res.data.messages.reverse()))
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
      const ai = res.data.message
      setMessages((prev) => [...prev, {
        id: ai.id || `${Date.now()}-ai`,
        role: ai.role || 'AI',
        type: ai.type || 'TEXT',
        content: ai.content || 'Sorry, no response.',
        createdAt: ai.createdAt || new Date().toISOString(),
        attachments: ai.attachments,
      }])
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

  const sendPhoto = useCallback(async (file: File) => {
    const localUrl = URL.createObjectURL(file)
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'USER',
      type: 'TEXT',
      content: '[food photo]',
      createdAt: new Date().toISOString(),
      attachments: { imageUrl: localUrl },
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)

    try {
      const form = new FormData()
      form.append('file', file)
      const uploadRes = await api.post<{ url: string }>('/tracking/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const analyzeRes = await api.post<{ message: ChatMessage }>('/ai/analyze-photo', { imageUrl: uploadRes.data.url })
      const ai = analyzeRes.data.message
      setMessages((prev) => [...prev, {
        id: ai.id || `${Date.now()}-ai`,
        role: ai.role || 'AI',
        type: ai.type || 'FOOD_ANALYSIS',
        content: ai.content || 'Here is what I found in your photo.',
        createdAt: ai.createdAt || new Date().toISOString(),
        attachments: ai.attachments,
      }])
    } catch (err: any) {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'AI',
        type: 'TEXT',
        content: err.message || 'Sorry, I could not analyze this photo. Please try again.',
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } finally {
      setSending(false)
    }
  }, [])

  const logMetric = useCallback(async (metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS', value: number) => {
    try {
      await api.post('/tracking/metric', { metricType, value })
      const labels: Record<string, string> = {
        WATER_ML: 'Вода',
        SLEEP_H: 'Сон',
        WEIGHT_KG: 'Вес',
        STEPS: 'Шаги',
      }
      setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: `Записал: ${labels[metricType]} ${value}${metricType === 'WATER_ML' ? ' мл' : metricType === 'STEPS' ? '' : metricType === 'WEIGHT_KG' ? ' кг' : ' ч'}.`,
        createdAt: new Date().toISOString(),
      }])
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: err.message || 'Не удалось записать метрику.',
        createdAt: new Date().toISOString(),
      }])
    }
  }, [])

  return { messages, sending, loadingHistory, sendMessage, sendPhoto, logMetric, setMessages }
}
