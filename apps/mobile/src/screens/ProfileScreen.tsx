import { useEffect, useState } from 'react'
import { useAppStore } from '../store/index.js'
import { api } from '../lib/api.js'

interface UserProfile {
  id: string
  firstName: string | null
  languageCode: string
  subscriptionStatus: string
  trialEndsAt: string | null
  profile: {
    birthDate: string | null
    gender: string | null
    heightCm: number | null
    currentWeightKg: number | null
    targetWeightKg: number | null
    primaryGoal: string | null
    activityLevel: string | null
    dailyCalories: number | null
    dailyWaterMl: number | null
    dailySteps: number | null
  } | null
}

export function ProfileScreen() {
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    api
      .get<UserProfile>('/users/me')
      .then((res) => setProfile(res.data))
      .catch(console.error)
  }, [])

  return (
    <div className="p-5 space-y-5 pb-24">
      <h1 className="text-2xl font-bold">Профиль</h1>

      <div className="bg-slate-900 rounded-2xl p-5 text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl">
          {user?.firstName?.[0] || '👤'}
        </div>
        <h2 className="text-xl font-semibold">{user?.firstName || 'Пользователь'}</h2>
        <p className="text-sm text-slate-400 mt-1">{user?.subscriptionStatus || 'FREE'}</p>
        {profile?.trialEndsAt && (
          <p className="text-xs text-emerald-400 mt-1">
            Пробный период до {new Date(profile.trialEndsAt).toLocaleDateString('ru-RU')}
          </p>
        )}
      </div>

      {profile?.profile && (
        <div className="bg-slate-900 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold">Цели и параметры</h3>
          {[
            { label: 'Рост', value: profile.profile.heightCm ? `${profile.profile.heightCm} см` : '-' },
            { label: 'Текущий вес', value: profile.profile.currentWeightKg ? `${profile.profile.currentWeightKg} кг` : '-' },
            { label: 'Целевой вес', value: profile.profile.targetWeightKg ? `${profile.profile.targetWeightKg} кг` : '-' },
            { label: 'Цель', value: profile.profile.primaryGoal || '-' },
            { label: 'Активность', value: profile.profile.activityLevel || '-' },
            { label: 'Калории/день', value: profile.profile.dailyCalories || '-' },
            { label: 'Вода/день', value: profile.profile.dailyWaterMl ? `${profile.profile.dailyWaterMl} мл` : '-' },
            { label: 'Шаги/день', value: profile.profile.dailySteps || '-' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-400">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={logout}
        className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition"
      >
        Выйти
      </button>
    </div>
  )
}
