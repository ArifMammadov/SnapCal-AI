import { useState } from 'react'
import { useAppStore } from '../store/index.js'
import { useApp } from '../App.js'
import { Card, BackIcon, StarIcon, Button } from '../components/ui.js'

type Category = 'All' | 'Yoga' | 'Home Fitness' | 'Gym' | 'Weight Loss' | 'Muscle Gain' | 'Running'

interface MarketplaceProgram {
  id: string
  name: string
  instructor: string
  category: Category
  duration: number
  weeks: number
  price: number
  rating: string
  reviews: number
  emoji: string
  gradient: string
  description: string
  includes: string[]
  level: string
  enrolled: number
  tag: string | null
}

const categories: Category[] = ['All', 'Yoga', 'Home Fitness', 'Gym', 'Weight Loss', 'Muscle Gain', 'Running']

const programs: MarketplaceProgram[] = [
  {
    id: '1',
    name: 'Fat Burn Elite',
    instructor: 'Sarah Chen',
    category: 'Weight Loss',
    duration: 12,
    weeks: 12,
    price: 29,
    rating: '4.9',
    reviews: 2847,
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #ff4d6d 0%, #ff7a45 100%)',
    description: 'High-intensity program combining HIIT, strength, and cardio for maximum fat burning.',
    includes: ['Diet plan', 'Workout plan', 'Exercise videos', 'Weekly schedule', 'Progress tracking'],
    level: 'Intermediate',
    enrolled: 12400,
    tag: 'Best Seller',
  },
  {
    id: '2',
    name: 'Yoga Flow Series',
    instructor: 'Maya Patel',
    category: 'Yoga',
    duration: 8,
    weeks: 8,
    price: 19,
    rating: '4.8',
    reviews: 1923,
    emoji: '🧘',
    gradient: 'linear-gradient(135deg, #7b6ef6 0%, #3dbbf7 100%)',
    description: 'Transform your flexibility and mindfulness with guided daily yoga flows.',
    includes: ['Yoga sequences', 'Breathing exercises', 'Nutrition guide', 'Meditation practices'],
    level: 'Beginner',
    enrolled: 8700,
    tag: 'Popular',
  },
  {
    id: '3',
    name: 'Muscle Builder Pro',
    instructor: 'Jake Morrison',
    category: 'Muscle Gain',
    duration: 16,
    weeks: 16,
    price: 39,
    rating: '4.7',
    reviews: 3102,
    emoji: '💪',
    gradient: 'linear-gradient(135deg, #00d48a 0%, #0da8ed 100%)',
    description: 'Progressive overload program for maximum muscle gain with detailed nutrition timing.',
    includes: ['Macro calculator', 'Gym workout plan', 'Video library', '1-on-1 check-ins'],
    level: 'Advanced',
    enrolled: 9200,
    tag: 'Premium',
  },
  {
    id: '4',
    name: 'Home Shred 30',
    instructor: 'Lisa Torres',
    category: 'Home Fitness',
    duration: 6,
    weeks: 6,
    price: 14,
    rating: '4.6',
    reviews: 4521,
    emoji: '🏠',
    gradient: 'linear-gradient(135deg, #ffbe0b 0%, #ff7a45 100%)',
    description: 'No equipment needed. 30-min daily sessions proven to shred fat from home.',
    includes: ['No equipment needed', 'Daily workouts', 'Meal prep guide', 'Shopping lists'],
    level: 'Beginner',
    enrolled: 21000,
    tag: 'No Equipment',
  },
  {
    id: '5',
    name: 'Marathon Ready',
    instructor: 'Tom Nakamura',
    category: 'Running',
    duration: 20,
    weeks: 20,
    price: 34,
    rating: '4.9',
    reviews: 1240,
    emoji: '🏃',
    gradient: 'linear-gradient(135deg, #3dbbf7 0%, #7b6ef6 100%)',
    description: 'Structured training plan from 5K to full marathon with pacing and nutrition strategies.',
    includes: ['Running schedule', 'Pace calculator', 'Race nutrition', 'Injury prevention'],
    level: 'Intermediate',
    enrolled: 5600,
    tag: 'New',
  },
  {
    id: '6',
    name: 'Gym Fundamentals',
    instructor: 'Chris Walker',
    category: 'Gym',
    duration: 10,
    weeks: 10,
    price: 24,
    rating: '4.7',
    reviews: 2103,
    emoji: '🏋️',
    gradient: 'linear-gradient(135deg, #ff4d6d 0%, #7b6ef6 100%)',
    description: 'Master gym techniques with form videos, progressive programming, and diet guidance.',
    includes: ['Form tutorials', 'Gym workouts', 'Diet guide', 'Supplement advice'],
    level: 'Beginner',
    enrolled: 7300,
    tag: null,
  },
]

function PurchaseModal({ program, onClose, onPurchase }: { program: MarketplaceProgram; onClose: () => void; onPurchase: () => void }) {
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
              margin: '0 0 10px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            What's included
          </p>
          {program.includes.map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'var(--green-dim)',
                  border: '1px solid rgba(0,212,138,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth={3} strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item}</span>
            </div>
          ))}
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={onPurchase}>
          Enroll Now — ${program.price}
        </Button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '10px 0 0' }}>
          30-day money-back guarantee · {program.enrolled.toLocaleString()} enrolled
        </p>
      </div>
    </div>
  )
}

export function MarketplaceScreen({ onBack }: { onBack?: () => void }) {
  const [category, setCategory] = useState<Category>('All')
  const [selectedProgram, setSelectedProgram] = useState<MarketplaceProgram | null>(null)
  const [purchased, setPurchased] = useState<Set<string>>(new Set())
  const { user } = useAppStore()

  const filtered = category === 'All' ? programs : programs.filter((p) => p.category === category)

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
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              color: 'var(--green)',
              fontSize: 15,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
              marginBottom: 12,
            }}
          >
            <BackIcon size={18} />
            Back
          </button>
        )}
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
                padding: '7px 14px',
                background: category === c ? 'var(--green)' : 'var(--bg-elevated)',
                borderRadius: 20,
                border: category === c ? 'none' : '1px solid var(--border)',
                color: category === c ? '#fff' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: category === c ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
        {category === 'All' && (
          <div
            className="card-press"
            onClick={() => setSelectedProgram(programs[0])}
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              background: programs[0].gradient,
              boxShadow: '0 8px 30px rgba(255,77,109,0.3)',
              cursor: 'pointer',
              position: 'relative',
              marginBottom: 20,
            }}
          >
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 60 }}>{programs[0].emoji}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#fff',
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  ⭐ {programs[0].tag}
                </div>
                <p className="font-display" style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                  {programs[0].name}
                </p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px' }}>by {programs[0].instructor}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <StarIcon size={12} />
                    <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{programs[0].rating}</span>
                  </div>
                  <span className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
                    ${programs[0].price}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(category === 'All' ? filtered.slice(1) : filtered).map((program) => (
            <Card
              key={program.id}
              onClick={() => setSelectedProgram(program)}
              style={{
                display: 'flex',
                gap: 14,
                padding: '14px',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 16,
                  background: program.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {program.emoji}
                {program.tag && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      padding: '2px 5px',
                      background: 'var(--amber)',
                      borderRadius: 5,
                      fontSize: 9,
                      color: '#000',
                      fontWeight: 800,
                    }}
                  >
                    {program.tag}
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {program.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 4px' }}>
                  {program.instructor} · {program.weeks}w · {program.level}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <StarIcon size={12} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {program.rating} ({program.reviews.toLocaleString()})
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {purchased.has(program.id) ? (
                  <div
                    style={{
                      padding: '6px 12px',
                      background: 'var(--green-dim)',
                      borderRadius: 10,
                      fontSize: 12,
                      color: 'var(--green)',
                      fontWeight: 600,
                    }}
                  >
                    Enrolled ✓
                  </div>
                ) : (
                  <p className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    ${program.price}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedProgram && <PurchaseModal program={selectedProgram} onClose={() => setSelectedProgram(null)} onPurchase={() => {
        setPurchased((prev) => new Set([...prev, selectedProgram.id]))
        setSelectedProgram(null)
      }} />}
    </div>
  )
}
