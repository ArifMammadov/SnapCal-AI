import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '../store/index.js'
import { StarIcon, Button } from '../components/ui.js'
import { usePrograms, type MarketplaceProgram } from '../lib/data.js'
import { basicPrograms } from '../lib/basicPrograms.js'
import { api } from '../lib/api.js'

const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en'
const IS_RUSSIAN = /^ru/.test(LOCALE)

type Category = 'All' | 'Yoga' | 'Home Fitness' | 'Gym' | 'Diet'

const categories: Category[] = ['All', 'Yoga', 'Home Fitness', 'Gym', 'Diet']

interface UiProgram {
  id: string
  name: string
  slug: string
  description: string
  category: Category
  level: string
  durationWeeks: number
  duration: number
  weeks: number
  price: number
  rating: string
  reviews: number
  enrolled: number
  emoji: string
  imageUrl?: string
  gradient: string
  includes: string[]
  isActive: boolean
  createdAt: string
  instructor: string
  tag: string | null
}

function basicToUiProgram(p: typeof basicPrograms[number]): UiProgram {
  const ratingStr = p.rating.toFixed(1)
  const category = p.category as Category
  return {
    id: p.id,
    name: p.title,
    slug: p.id,
    description: p.subtitle,
    category,
    level: p.level,
    durationWeeks: p.durationWeeks,
    duration: p.durationWeeks,
    weeks: p.durationWeeks,
    price: p.price,
    rating: ratingStr,
    reviews: p.reviews,
    enrolled: p.enrolled,
    emoji: p.emoji,
    imageUrl: p.imageUrl,
    gradient: p.gradient,
    includes: p.includes,
    isActive: true,
    createdAt: new Date().toISOString(),
    instructor: 'SnapCal Coach',
    tag: 'Free',
  }
}

function toUiProgram(p: MarketplaceProgram): UiProgram {
  const category = (categories.includes(p.category as Category) ? p.category : 'All') as Category
  const fallbackGradients: Record<Category, string> = {
    All: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    Yoga: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    'Home Fitness': 'linear-gradient(135deg, #ffbe0b 0%, #ff7a45 100%)',
    Gym: 'linear-gradient(135deg, #ff4d6d 0%, #7b6ef6 100%)',
    Diet: 'linear-gradient(135deg, #00d48a 0%, #0da8ed 100%)',
  }
  const ratingStr = typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.rating || '4.5')

  return {
    ...p,
    category,
    duration: p.durationWeeks,
    weeks: p.durationWeeks,
    rating: ratingStr,
    emoji: p.emoji || '🎯',
    imageUrl: (p as any).imageUrl,
    gradient: p.gradient || fallbackGradients[category] || fallbackGradients.All,
    includes: p.includes || [],
    tag: p.price === 0 ? 'Free' : (p.tag || null),
  }
}

type DetailState = { type: 'program'; program: UiProgram } | { type: 'enroll'; program: UiProgram } | null

interface Enrollment {
  enrollmentId: string
  status: string
  paymentStatus: string | null
  enrolledAt: string
  program: UiProgram
}

function PurchaseModal({ program, alreadyEnrolled, onClose, onPurchase }: { program: UiProgram; alreadyEnrolled: boolean; onClose: () => void; onPurchase: () => void }) {
  const [purchasing, setPurchasing] = useState(false)
  const handlePurchase = async () => {
    setPurchasing(true)
    if (program.id.startsWith('basic-')) {
      onPurchase()
      return
    }
    try {
      await api.post(`/marketplace/programs/${program.id}/enroll`)
      onPurchase()
    } catch (err: any) {
      alert(err.message || 'Failed to enroll. Please try again.')
      setPurchasing(false)
    }
  }

  return (
    <div
      className="backdrop-in"
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="slide-up"
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 40px',
          maxHeight: '90%',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div
          style={{
            height: 160,
            borderRadius: 18,
            backgroundImage: program.imageUrl ? `url(${program.imageUrl})` : program.gradient,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            padding: 16,
            marginBottom: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.75) 100%)',
              zIndex: 0,
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 44, marginBottom: 4 }}>{program.emoji}</div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>
              {program.name}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '4px 0 0' }}>{program.instructor} · {program.weeks} {IS_RUSSIAN ? 'недель' : 'weeks'} · {program.level}</p>
          </div>
        </div>



        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
          {program.description}
        </p>

        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
              margin: '0 0 10px',
            }}
          >
            INCLUDES
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {program.includes.map((inc) => (
              <div
                key={inc}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                ✓ {inc}
              </div>
            ))}
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={handlePurchase} disabled={purchasing || alreadyEnrolled}>
          {alreadyEnrolled
            ? (IS_RUSSIAN ? 'Вы уже записаны' : 'Already enrolled')
            : purchasing
            ? 'Processing...'
            : IS_RUSSIAN
            ? 'Начать программу'
            : 'Start program'}
        </Button>
      </div>
    </div>
  )
}

function EnrollSuccess({ program, onClose }: { program: UiProgram; onClose: () => void }) {
  return (
    <div
      className="backdrop-in"
      style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="pop-in"
        style={{
          width: 'calc(100% - 40px)',
          maxWidth: 340,
          background: 'var(--bg-card)',
          borderRadius: 24,
          padding: 28,
          textAlign: 'center',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          {IS_RUSSIAN ? 'Вы записаны!' : "You're enrolled!"}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          {program.name} {IS_RUSSIAN ? 'добавлена в вашу библиотеку. Начните в любое время.' : 'is now in your library. Start anytime.'}
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={onClose}>
          {IS_RUSSIAN ? 'Начать программу' : 'Start Program'}
        </Button>
      </div>
    </div>
  )
}

export function MarketplaceScreen() {
  const [category, setCategory] = useState<Category>('All')
  const [detail, setDetail] = useState<DetailState>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const { user } = useAppStore()

  const { data: programs, loading, error } = usePrograms(category)

  useEffect(() => {
    api.get<Enrollment[]>('/marketplace/my-enrollments')
      .then((res) => setEnrollments((res.data as any[]).map((e) => ({ ...e, program: toUiProgram(e.program as MarketplaceProgram) }))))
      .catch(() => setEnrollments([]))
  }, [])

  useEffect(() => {
    if (error) console.error('Marketplace error:', error)
  }, [error])

  const enrolledIds = new Set(enrollments.map((e) => e.program.id))
  const basicUiPrograms = basicPrograms
    .filter((p) => category === 'All' || p.category === category)
    .map((p) => basicToUiProgram(p))
  const combinedPrograms = [...basicUiPrograms, ...programs.map(toUiProgram)]
  const featured = combinedPrograms[0]
  const rest = combinedPrograms.slice(1)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      <div
        style={{
          padding: '56px 20px 16px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            Marketplace
          </h1>
          <div
            style={{
              padding: '4px 10px',
              background: 'var(--green-dim)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--green)',
              fontWeight: 600,
            }}
          >
            {combinedPrograms.length} programs
          </div>
        </div>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                background: category === c ? 'var(--green)' : 'var(--bg-elevated)',
                borderRadius: 18,
                border: category === c ? 'none' : '1px solid var(--border)',
                color: category === c ? '#fff' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: category === c ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {enrollments.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '0.04em',
                margin: '0 0 10px',
                textTransform: 'uppercase',
              }}
            >
              Мои программы
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enrollments.slice(0, 3).map((e) => {
                const program = e.program
                return (
                  <button
                    key={e.enrollmentId}
                    onClick={() => setDetail({ type: 'program', program })}
                    style={{
                      width: '100%',
                      padding: 10,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: program.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      {program.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {program.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        {e.paymentStatus === 'free' ? 'Бесплатно' : 'Оплачено'} · {program.weeks} недель
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>{IS_RUSSIAN ? 'Загрузка программ...' : 'Loading programs...'}</p>
          </div>
        )}

        {!loading && combinedPrograms.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>{IS_RUSSIAN ? 'В этой категории пока нет программ.' : 'No programs found in this category.'}</p>
          </div>
        )}

        {!loading && featured && (
          <>
            <div
              className="card-press"
              onClick={() => setDetail({ type: 'program', program: featured })}
              style={{
                height: 220,
                borderRadius: 24,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: 16,
                position: 'relative',
                overflow: 'hidden',
                backgroundImage: featured.imageUrl ? `url(${featured.imageUrl})` : featured.gradient,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)',
                  zIndex: 0,
                }}
              />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    padding: '5px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 10,
                    backdropFilter: 'blur(10px)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {IS_RUSSIAN ? 'Рекомендуем' : 'Featured'}
                </div>
                {featured.tag && (
                  <div
                    style={{
                      padding: '5px 10px',
                      background: '#ffd700',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#000',
                    }}
                  >
                    {featured.tag}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 36, marginBottom: 4 }}>{featured.emoji || '🎯'}</div>
                <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
                  {featured.name}
                </h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '0 0 10px' }}>
                  {featured.description?.slice(0, 80)}...
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StarIcon size={14} />
                    <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {featured.rating}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>·</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{featured.durationWeeks} {IS_RUSSIAN ? 'недель' : 'weeks'}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rest.map((program) => (
                <button
                key={program.id}
                onClick={() => setDetail({ type: 'program', program })}
                className="card-press"
                style={{
                  width: '100%',
                  padding: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  color: 'inherit',
                }}
                >
                <div
                  style={{
                    height: 120,
                    backgroundImage: program.imageUrl ? `url(${program.imageUrl})` : program.gradient,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                      zIndex: 0,
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{program.emoji} {program.name}</span>
                    {program.tag && (
                      <span
                        style={{
                          padding: '3px 8px',
                          background: '#ffd700',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 800,
                          color: '#000',
                        }}
                      >
                        {program.tag}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.35 }}>
                    {program.description?.slice(0, 90)}...
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <StarIcon size={12} />
                    <span>{program.rating} ({program.reviews.toLocaleString()})</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>{program.weeks} {IS_RUSSIAN ? 'недель' : 'weeks'}</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>{program.level}</span>
                  </div>
                </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {detail?.type === 'program' && (
        <PurchaseModal
          program={detail.program}
          alreadyEnrolled={enrolledIds.has(detail.program.id)}
          onClose={() => setDetail(null)}
          onPurchase={() => {
            setEnrollments((prev) => [
              ...prev,
              {
                enrollmentId: `new-${Date.now()}`,
                status: 'active',
                paymentStatus: detail.program.price === 0 ? 'free' : 'pending',
                enrolledAt: new Date().toISOString(),
                program: detail.program as UiProgram,
              },
            ])
            setDetail({ type: 'enroll', program: detail.program })
          }}
        />
      )}
      {detail?.type === 'enroll' && <EnrollSuccess program={detail.program} onClose={() => setDetail(null)} />}
    </div>
  )
}