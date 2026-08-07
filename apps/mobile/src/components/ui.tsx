import { useEffect, useState } from 'react'

// === Icons ===

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

export const HomeIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
)

export const ActivityIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

export const CoachIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
    <circle cx="12" cy="15" r="1.5" fill="currentColor" />
  </svg>
)

export const StatsIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

export const ProfileIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 24, className, style }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={style}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export const BackIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
)

export const PlusIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const CameraIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export const MicIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
  </svg>
)

export const SendIcon: React.FC<IconProps> = ({ size = 24, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

export const StarIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

// === Circular Ring ===

interface CircularRingProps {
  value: number
  max: number
  size: number
  strokeWidth: number
  color: string
  trackColor?: string
  className?: string
}

export function CircularRing({ value, max, size, strokeWidth, color, trackColor = 'var(--ring-track)', className }: CircularRingProps) {
  const [rendered, setRendered] = useState(0)
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, max > 0 ? value / max : 0))
  const dash = c * pct
  const gap = c - dash

  useEffect(() => {
    const t = setTimeout(() => setRendered(dash), 80)
    return () => clearTimeout(t)
  }, [dash])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${rendered} ${gap}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
    </svg>
  )
}

// === Progress Bar ===

interface MiniProgressBarProps {
  value: number
  max: number
  color?: string
  trackColor?: string
  height?: number
}

export function MiniProgressBar({ value, max, color = 'var(--green)', trackColor = 'var(--border)', height = 4 }: MiniProgressBarProps) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  return (
    <div style={{ width: '100%', height, background: trackColor, borderRadius: height / 2, overflow: 'hidden' }}>
      <div
        className="bar-fill"
        style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: height / 2,
        }}
      />
    </div>
  )
}

// === Card ===

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: () => void
}

export function Card({ children, style, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// === Button ===

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

const buttonVariantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: { background: 'var(--green)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
  danger: { background: 'var(--red)', color: '#fff', border: 'none' },
}

const buttonSizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { padding: '8px 12px', fontSize: 13, borderRadius: 10 },
  md: { padding: '12px 16px', fontSize: 14, borderRadius: 12 },
  lg: { padding: '16px', fontSize: 16, borderRadius: 16 },
}

export function Button({ children, variant = 'primary', size = 'md', fullWidth, style, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        fontFamily: 'inherit',
        fontWeight: 600,
        cursor: 'pointer',
        width: fullWidth ? '100%' : undefined,
        ...buttonVariantStyles[variant],
        ...buttonSizeStyles[size],
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// === Screen Header ===

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <div
      style={{
        padding: '56px 20px 16px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}
          >
            {title}
          </h1>
          {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}

// === Avatar ===

interface AvatarProps {
  src?: string
  fallback?: string
  size?: number
}

export function Avatar({ src, fallback = '👤', size = 40 }: AvatarProps) {
  const [err, setErr] = useState(false)
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        fontSize: size * 0.45,
      }}
    >
      {src && !err ? <img src={src} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} /> : fallback}
    </div>
  )
}
