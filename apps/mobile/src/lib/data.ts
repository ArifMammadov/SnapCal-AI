import { useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import { compressImageFile } from './imageCompression.js'

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
  metadata?: {
    pendingMetric?: { metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS'; value: number }
    [key: string]: any
  }
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

export interface GoalPlan {
  startWeightKg: number
  targetWeightKg: number
  totalLossKg: number | null
  currentMonth: number
  percentComplete: number
  milestones: {
    month: number
    label: string
    targetWeightKg: number | null
    targetCalories: number
    workoutsPerWeek: number
    focus: string
    color: string
  }[]
}

export interface ReminderPreferences {
  breakfastAt: string | null
  lunchAt: string | null
  dinnerAt: string | null
  weightDay: string | null
  weightAt: string | null
  workoutDays: string[]
  workoutAt: string | null
  waterReminders: boolean
  enabled: boolean
  timezone: string
}

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  data: any
  isRead: boolean
  sentVia: string
  createdAt: string
  readAt: string | null
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications')
      setNotifications(res.data.notifications)
      setUnreadCount(res.data.unreadCount)
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const markRead = useCallback(async (id: string) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all')
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, loading, error, refetch: fetch, markRead, markAllRead }
}

export function useReminderPreferences() {
  const [prefs, setPrefs] = useState<ReminderPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ReminderPreferences>('/notifications/preferences')
      setPrefs(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const save = useCallback(async (data: Partial<ReminderPreferences>) => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.put<ReminderPreferences>('/notifications/preferences', data)
      setPrefs(res.data)
      return true
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { prefs, loading, saving, error, refetch: fetch, save }
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

export function useGoalPlan() {
  const [data, setData] = useState<GoalPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<GoalPlan>('/goals/plan')
      setData(res.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load goal plan')
    } finally {
      setLoading(false)
    }
  }, [])

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

  const clearHistory = useCallback(async () => {
    try {
      await api.post('/ai/clear-history')
      setMessages([])
      return true
    } catch (err: any) {
      return false
    }
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
    let localUrl: string | null = null
    setSending(true)

    const addErrorMessage = (text: string) => {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'AI',
        type: 'TEXT',
        content: text,
        createdAt: new Date().toISOString(),
      }])
    }

    let jobId: string | null = null

    try {
      const compressed = await compressImageFile(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 })
      localUrl = URL.createObjectURL(compressed)

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'USER',
        type: 'TEXT',
        content: '[food photo]',
        createdAt: new Date().toISOString(),
        attachments: { imageUrl: localUrl },
      }
      setMessages((prev) => [...prev, userMsg])

      const form = new FormData()
      form.append('file', compressed)
      const uploadRes = await api.post<{ url: string }>('/tracking/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const analyzeRes = await api.post<{ accepted?: boolean; jobId?: string; statusUrl?: string; messageId?: string; message?: ChatMessage }>('/ai/analyze-photo', { imageUrl: uploadRes.data.url })

      // Fallback: old sync behavior (if server returns message immediately)
      if (analyzeRes.data?.message) {
        const ai = analyzeRes.data.message
        setMessages((prev) => [...prev, {
          id: ai.id || `${Date.now()}-ai`,
          role: ai.role || 'AI',
          type: ai.type || 'FOOD_ANALYSIS',
          content: ai.content || 'Here is what I found in your photo.',
          createdAt: ai.createdAt || new Date().toISOString(),
          attachments: ai.attachments,
        }])
        return
      }

      if (!analyzeRes.data?.jobId) {
        throw new Error('No response from photo analysis service')
      }

      jobId = analyzeRes.data.jobId

      // Poll async vision analysis status
      const poll = async (): Promise<ChatMessage | null> => {
        const maxAttempts = 30
        const delayMs = 1000
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          const res = await api.get<{ jobId?: string; state?: string; failedReason?: string; message?: ChatMessage; error?: { message?: string } }>(`/ai/analyze-photo/${jobId}`)

          if (res.data?.message) {
            return res.data.message
          }

          const state = res.data?.state
          if (state === 'failed') {
            throw new Error(res.data?.failedReason || 'Photo analysis failed')
          }
          if (res.data?.error?.message) {
            throw new Error(res.data.error.message)
          }
        }
        throw new Error('Photo analysis timed out. Please try again.')
      }

      const ai = await poll()
      if (ai) {
        setMessages((prev) => [...prev, {
          id: ai.id || `${Date.now()}-ai`,
          role: ai.role || 'AI',
          type: ai.type || 'FOOD_ANALYSIS',
          content: ai.content || 'Here is what I found in your photo.',
          createdAt: ai.createdAt || new Date().toISOString(),
          attachments: ai.attachments,
        }])
      }
    } catch (err: any) {
      addErrorMessage(err.message || 'Sorry, I could not analyze this photo. Please try again.')
    } finally {
      if (localUrl) {
        URL.revokeObjectURL(localUrl)
      }
      setSending(false)
    }
  }, [])

  const logMetric = useCallback(async (metricType: 'WATER_ML' | 'SLEEP_H' | 'WEIGHT_KG' | 'STEPS', value: number, confirmed = true) => {
    if (!confirmed) {
      return setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: formatMetricConfirmation(metricType, value),
        createdAt: new Date().toISOString(),
        metadata: { pendingMetric: { metricType, value } },
      }])
    }

    try {
      await api.post('/tracking/metric', { metricType, value })
      const labels: Record<string, string> = {
        WATER_ML: 'Вода',
        SLEEP_H: 'Сон',
        WEIGHT_KG: 'Вес',
        STEPS: 'Шаги',
      }
      const unit = metricType === 'WATER_ML' ? ' мл' : metricType === 'STEPS' ? '' : metricType === 'WEIGHT_KG' ? ' кг' : ' ч'
      setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: `✅ Записал: ${labels[metricType]} ${value}${unit}.`,
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

  return { messages, sending, loadingHistory, sendMessage, sendPhoto, logMetric, setMessages, clearHistory }
}

function formatMetricConfirmation(metricType: string, value: number): string {
  switch (metricType) {
    case 'WATER_ML':
      return `Записать ${value} мл воды в дневной рацион? Ответьте «да» для подтверждения.`
    case 'SLEEP_H':
      return `Записать ${value} ч сна? Ответьте «да» для подтверждения.`
    case 'WEIGHT_KG':
      return `Записать вес ${value} кг? Ответьте «да» для подтверждения.`
    case 'STEPS':
      return `Записать ${value} шагов? Ответьте «да» для подтверждения.`
    default:
      return `Записать значение ${value}? Ответьте «да» для подтверждения.`
  }
}
