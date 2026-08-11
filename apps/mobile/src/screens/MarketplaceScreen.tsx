import { useEffect, useState } from 'react'
import { useAppStore } from '../store/index.js'
import { StarIcon, Button } from '../components/ui.js'
import { usePrograms, type MarketplaceProgram } from '../lib/data.js'
import { api } from '../lib/api.js'

type Category = 'All' | 'Yoga' | 'Home Fitness' | 'Gym' | 'Weight Loss' | 'Muscle Gain' | 'Running'

const categories: Category[] = ['All', 'Yoga', 'Home Fitness', 'Gym', 'Weight Loss', 'Muscle Gain', 'Running']

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
  gradient: string
  includes: string[]
  isActive: boolean
  createdAt: string
  instructor: string
  tag: string | null
}

function toUiProgram(p: MarketplaceProgram): UiProgram {
  const category = (categories.includes(p.category as Category) ? p.category : 'All') as Category
  const fallbackGradients: Record<Category, string> = {
    All: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    Yoga: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    'Home Fitness': 'linear-gradient(135deg, #ffbe0b 0%, #ff7a45 100%)',
    Gym: 'linear-gradient(135deg, #ff4d6d 0%, #7b6ef6 100%)',
    'Weight Loss': 'linear-gradient(135deg, #ff4d6d 0%, #ff7a45 100%)',
    'Muscle Gain': 'linear-gradient(135deg, #00d48a 0%, #0da8ed 100%)',
    Running: 'linear-gradient(135deg, #3dbbf7 0%, #7b6ef6 100%)',
  }
  const ratingStr = typeof p.rating === 'number' ? p.rating.toFixed(1) : (p.rating || '4.5')

  return {
    ...p,
    category,
    duration: p.durationWeeks,
    weeks: p.durationWeeks,
    rating: ratingStr,
    emoji: p.emoji || '🎯',
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
  program: MarketplaceProgram
}

function PurchaseModal({ program, alreadyEnrolled, onClose, onPurchase }: { program: UiProgram; alreadyEnrolled: boolean; onClose: () => void; onPurchase: () => void }) {
  const [purchasing, setPurchasing] = useState(false)
  const handlePurchase = async () => {
    setPurchasing(true)
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
            background: program.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 60,
            marginBottom: 20,
          }}
        >
          {program.emoji}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {program.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>by {program.instructor}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="font-display" style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)', margin: 0 }}>
              ${program.price}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>one-time</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StarIcon size={14} />
            <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{program.rating}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({program.reviews.toLocaleString()})</span>
          </div>
          <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{program.weeks} weeks</span>
          <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{program.level}</span>
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
          {alreadyEnrolled ? 'Вы уже записаны' : purchasing ? 'Processing...' : `Enroll for $${program.price}`}
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
          You’re enrolled!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
          {program.name} is now in your library. Start anytime.
        </p>
        <Button variant="primary" size="lg" fullWidth onClick={onClose}>
          Start Program
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
      .then((res) => setEnrollments(res.data))
      .catch(() => setEnrollments([]))
  }, [])

  useEffect(() => {
    if (error) console.error('Marketplace error:', error)
  }, [error])

  const enrolledIds = new Set(enrollments.map((e) => e.program.id))
  const featured = programs[0]
  const rest = programs.slice(1)

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
            {programs.length} programs
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
                const program = toUiProgram(e.program)
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
            <p>Loading programs...</p>
          </div>
        )}

        {!loading && programs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <p>No programs found in this category.</p>
          </div>
        )}

        {!loading && featured && (
          <>
            <div
              className="card-press"
              onClick={() => setDetail({ type: 'program', program: toUiProgram(featured) })}
              style={{
                height: 220,
                borderRadius: 24,
                background: featured.gradient || 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: 16,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  Featured
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

              <div>
                <div style={{ fontSize: 44, marginBottom: 4 }}>{featured.emoji || '🎯'}</div>
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
                      {typeof featured.rating === 'number' ? featured.rating.toFixed(1) : featured.rating}
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>·</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{featured.durationWeeks} weeks</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>·</span>
                  <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                    ${featured.price}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rest.map((p) => {
                const program = toUiProgram(p)
                return (
                  <button
                    key={program.id}
                    onClick={() => setDetail({ type: 'program', program })}
                    className="card-press"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 20,
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 14,
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: program.gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 30,
                        flexShrink: 0,
                      }}
                    >
                      {program.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {program.name}
                        </p>
                        {program.tag && (
                          <div
                            style={{
                              padding: '3px 8px',
                              background: 'var(--green-dim)',
                              borderRadius: 8,
                              fontSize: 10,
                              color: 'var(--green)',
                              fontWeight: 800,
                            }}
                          >
                            {program.tag}
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 4px' }}>
                        {program.instructor} · {program.weeks}w · {program.level}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StarIcon size={12} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {program.rating} ({program.reviews.toLocaleString()})
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {program.includes.slice(0, 2).map((inc) => (
                          <span
                            key={inc}
                            style={{
                              padding: '3px 8px',
                              background: 'var(--bg-elevated)',
                              borderRadius: 8,
                              fontSize: 10,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            ✓ {inc}
                          </span>
                        ))}
                        {program.includes.length > 2 && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>+{program.includes.length - 2} more</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <p className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', margin: 0 }}>
                        ${program.price}
                      </p>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{program.enrolled.toLocaleString()} enrolled</span>
                    </div>
                  </button>
                )
              })}
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
                program: detail.program as unknown as MarketplaceProgram,
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
