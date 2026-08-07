import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

interface Program {
  id: string
  name: string
  description: string | null
  category: string | null
  durationWeeks: number | null
  priceUsd: number | null
  includes: string[]
  level: string | null
  rating: number | null
  reviewsCount: number
  emoji: string | null
  gradient: string | null
  tag: string | null
}

export function MarketplaceScreen() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Program[]>('/marketplace/programs')
      .then((res) => setPrograms(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>

  return (
    <div className="p-5 space-y-5 pb-24">
      <h1 className="text-2xl font-bold">Маркетплейс программ</h1>

      {programs.length === 0 ? (
        <p className="text-slate-400">Программы скоро появятся.</p>
      ) : (
        <div className="space-y-4">
          {programs.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl p-5 text-white bg-gradient-to-br ${p.gradient || 'from-slate-700 to-slate-800'}`}
            >
              <div className="flex justify-between items-start">
                <div className="text-3xl">{p.emoji || '📋'}</div>
                {p.tag && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{p.tag}</span>
                )}
              </div>
              <h2 className="text-lg font-bold mt-2">{p.name}</h2>
              <p className="text-sm opacity-90 mt-1 line-clamp-2">{p.description}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {p.includes.slice(0, 3).map((item) => (
                  <span key={item} className="text-xs bg-black/20 px-2 py-1 rounded">{item}</span>
                ))}
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm opacity-90">
                  {p.durationWeeks && <span>{p.durationWeeks} недель · </span>}
                  {p.level && <span>{p.level}</span>}
                </div>
                <div className="font-bold">{p.priceUsd !== null ? `$${p.priceUsd}` : 'Free'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
