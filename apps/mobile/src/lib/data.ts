import { useEffect, useState, useCallback } from 'react'
import { api } from './api.js'
import { compressImageFile } from './imageCompression.js'

const IS_RUSSIAN = /^ru/.test(typeof navigator !== 'undefined' ? navigator.language : 'en')

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
  type: 'TEXT' | 'FOOD_ANALYSIS' | 'MACRO_CARD' | 'STRUCTURED'
  content: string
  createdAt: string
  pendingConfirmation?: boolean
  pendingAction?: 'LOG_FOOD' | 'LOG_WATER' | 'LOG_WEIGHT' | 'LOG_STEPS' | 'LOG_SLEEP'
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
      mealType?: string
    }
    imageUrl?: string
    structured?: {
      emoji: string
      mealLabel: string
      foodName: string
      calories: number
      proteinG: number
      carbsG: number
      fatG: number
      serving: string
    }
    pendingConfirmation?: boolean
    pendingAction?: 'LOG_FOOD' | 'LOG_WATER' | 'LOG_WEIGHT' | 'LOG_STEPS' | 'LOG_SLEEP'
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

  useEffect(() => {
    const onRefresh = () => fetch()
    window.addEventListener('snapcal:refreshSummary', onRefresh)
    return () => window.removeEventListener('snapcal:refreshSummary', onRefresh)
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

  useEffect(() => {
    const onRefresh = () => fetch()
    window.addEventListener('snapcal:refreshSummary', onRefresh)
    return () => window.removeEventListener('snapcal:refreshSummary', onRefresh)
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

  const normalizeMessage = (msg: ChatMessage): ChatMessage => {
    const structured = msg.attachments?.structured
    if (structured && !msg.attachments?.foodData) {
    return {
      ...msg,
      attachments: {
        ...msg.attachments,
        foodData: {
          name: structured.foodName,
          calories: structured.calories,
          proteinG: structured.proteinG,
          carbsG: structured.carbsG,
          fatG: structured.fatG,
          serving: structured.serving,
          suggestedMealType: structured.mealLabel,
        },
      },
    }
    }
    // Carry root-level pending flags into message object if not already present
    if ((msg as any).pendingConfirmation != null && msg.pendingConfirmation == null) {
    return { ...msg, pendingConfirmation: (msg as any).pendingConfirmation, pendingAction: (msg as any).pendingAction }
    }
    return msg
  }

  useEffect(() => {
    api.get<{ messages: ChatMessage[] }>('/ai/history')
      .then((res) => setMessages(res.data.messages.reverse().map(normalizeMessage)))
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
      const ai = normalizeMessage(res.data.message)
      setMessages((prev) => [...prev, {
        id: ai.id || `${Date.now()}-ai`,
        role: ai.role || 'AI',
        type: ai.type || 'TEXT',
        content: ai.content || 'Sorry, no response.',
        createdAt: ai.createdAt || new Date().toISOString(),
        attachments: ai.attachments,
        pendingConfirmation: ai.pendingConfirmation,
        pendingAction: ai.pendingAction,
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
        const rawAi = analyzeRes.data.message
        const ai: ChatMessage = {
          ...rawAi,
          attachments: {
            ...rawAi.attachments,
            imageUrl: rawAi.attachments?.imageUrl || (rawAi as any).imageUrl,
            structured: rawAi.attachments?.structured || (rawAi as any).structured,
          },
        }
        const structured = ai.attachments?.structured
        const foodData = ai.attachments?.foodData || (structured ? {
          name: structured.foodName,
          calories: structured.calories,
          proteinG: structured.proteinG,
          carbsG: structured.carbsG,
          fatG: structured.fatG,
          serving: structured.serving,
          suggestedMealType: structured.mealLabel,
        } : undefined)
        const aiWithFoodData = foodData ? { ...ai, attachments: { ...ai.attachments, foodData } } : ai
        setMessages((prev) => [...prev, {
          id: ai.id || `${Date.now()}-ai`,
          role: ai.role || 'AI',
          type: ai.type || 'FOOD_ANALYSIS',
          content: ai.content || 'Here is what I found in your photo.',
          createdAt: ai.createdAt || new Date().toISOString(),
          attachments: aiWithFoodData.attachments,
          pendingConfirmation: ai.pendingConfirmation,
          pendingAction: ai.pendingAction,
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
          const res = await api.get<{ jobId?: string; status?: string; failedReason?: string; message?: ChatMessage; error?: { message?: string } }>(`/ai/analyze-photo/${jobId}`)

          if (res.data?.message) {
            return res.data.message
          }

          const state = res.data?.status
          if (state === 'failed') {
            throw new Error(res.data?.failedReason || 'Photo analysis failed')
          }
          if (res.data?.error?.message) {
            throw new Error(res.data.error.message)
          }
        }
        throw new Error('Photo analysis timed out. Please try again.')
      }

      const rawAi = await poll()
      if (rawAi) {
        // Normalize API response: structured/imageUrl may be at the message root, not inside attachments
        const ai: ChatMessage = {
          ...rawAi,
          attachments: {
            ...rawAi.attachments,
            imageUrl: rawAi.attachments?.imageUrl || (rawAi as any).imageUrl,
            structured: rawAi.attachments?.structured || (rawAi as any).structured,
          },
        }
        const aiImageUrl = ai.attachments?.imageUrl || (ai.attachments?.foodData ? uploadRes.data.url : undefined)
        setMessages((prev) => {
          // Map API structured result into a legacy foodData shape the UI expects
          const structured = ai.attachments?.structured
          const foodData = ai.attachments?.foodData || (structured ? {
            name: structured.foodName,
            calories: structured.calories,
            proteinG: structured.proteinG,
            carbsG: structured.carbsG,
            fatG: structured.fatG,
            serving: structured.serving,
            suggestedMealType: structured.mealLabel,
          } : undefined)
          const aiWithFoodData = foodData ? { ...ai, attachments: { ...ai.attachments, foodData } } : ai

          // If the AI result belongs to a pending photo, enrich the user's photo card instead of duplicating it
          const userPhotoIndex = prev.findIndex((m) => m.role === 'USER' && m.attachments?.imageUrl && (aiImageUrl ? m.attachments.imageUrl === aiImageUrl : false))
          if (userPhotoIndex !== -1 && foodData) {
            const updated = [...prev]
            updated[userPhotoIndex] = {
              ...updated[userPhotoIndex],
              attachments: {
                ...updated[userPhotoIndex].attachments,
                foodData,
              },
            }
            // Also append the AI explanation as a separate text message if it has content
            if (ai.content && ai.content.trim()) {
              updated.push({
                id: ai.id || `${Date.now()}-ai`,
                role: ai.role || 'AI',
                type: ai.type || 'FOOD_ANALYSIS',
                content: ai.content,
                createdAt: ai.createdAt || new Date().toISOString(),
                attachments: aiWithFoodData.attachments,
                pendingConfirmation: ai.pendingConfirmation,
                pendingAction: ai.pendingAction,
              })
            }
            return updated
          }
          return [...prev, {
            id: ai.id || `${Date.now()}-ai`,
            role: ai.role || 'AI',
            type: ai.type || 'FOOD_ANALYSIS',
            content: ai.content || 'Here is what I found in your photo.',
            createdAt: ai.createdAt || new Date().toISOString(),
            attachments: aiWithFoodData.attachments,
            pendingConfirmation: ai.pendingConfirmation,
            pendingAction: ai.pendingAction,
          }]
        })
      }
    } catch (err: any) {
      addErrorMessage(err.message || 'Sorry, I could not analyze this photo. Please try again.')
    } finally {
      setSending(false)
    }
  }, [])

  const logFood = useCallback(async (foodData: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    serving: string
    suggestedMealType?: string
    mealType?: string
    imageUrl?: string
  }) => {
    const mealType = (foodData.suggestedMealType || foodData.mealType || 'SNACK') as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
    try {
      await api.post('/tracking/food', {
        mealType,
        name: foodData.name,
        calories: foodData.calories,
        proteinG: Math.round(foodData.proteinG),
        carbsG: Math.round(foodData.carbsG),
        fatG: Math.round(foodData.fatG),
        imageUrl: foodData.imageUrl,
        aiAnalyzed: true,
      })
      setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: IS_RUSSIAN
          ? `✅ Записал: ${foodData.name} — ${foodData.calories} ккал.`
          : `✅ Logged: ${foodData.name} — ${foodData.calories} kcal.`,
        createdAt: new Date().toISOString(),
      }])
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('snapcal:refreshSummary'))
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now()).toString(),
        role: 'AI',
        type: 'TEXT',
        content: err.message || (IS_RUSSIAN ? 'Не удалось записать приём пищи.' : 'Could not log the meal.'),
        createdAt: new Date().toISOString(),
      }])
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('snapcal:refreshSummary'))
      }
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

  return { messages, sending, loadingHistory, sendMessage, sendPhoto, logMetric, logFood, setMessages, clearHistory }
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
