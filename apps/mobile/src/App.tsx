import { useState, createContext, useContext } from 'react'
import { HomeIcon, ActivityIcon, CoachIcon, StatsIcon, ProfileIcon } from './components/ui.js'
import { HomeScreen } from './screens/HomeScreen.js'
import { ActivityScreen } from './screens/ActivityScreen.js'
import { AICoachScreen } from './screens/AICoachScreen.js'
import { StatisticsScreen } from './screens/StatisticsScreen.js'
import { ProfileScreen } from './screens/ProfileScreen.js'
import { LoginScreen } from './screens/LoginScreen.js'
import { MarketplaceScreen } from './screens/MarketplaceScreen.js'
import { useTelegram } from './hooks/useTelegram.js'
import { useAppStore, type Tab } from './store/index.js'
import { t, initLanguage } from './lib/i18n.js'
import './index.css'

initLanguage()

interface AppContextType {
  darkMode: boolean
  setDarkMode: (v: boolean) => void
  activeTab: Tab
  setActiveTab: (t: Tab) => void
  showMarketplace: boolean
  setShowMarketplace: (v: boolean) => void
}

const AppCtx = createContext<AppContextType | null>(null)

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppContext.Provider')
  return ctx
}

const navItems: { id: Tab; label: string; icon: React.FC<{ size?: number }> }[] = [
  { id: 'home', label: t('navHome'), icon: HomeIcon },
  { id: 'activity', label: t('navActivity'), icon: ActivityIcon },
  { id: 'coach', label: t('navCoach'), icon: CoachIcon },
  { id: 'stats', label: t('navStats'), icon: StatsIcon },
  { id: 'profile', label: t('navProfile'), icon: ProfileIcon },
]

export function App() {
  const { ready } = useTelegram()
  const user = useAppStore((s) => s.user)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const [darkMode, setDarkMode] = useState(true)
  const [showMarketplace, setShowMarketplace] = useState(false)

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 500 }}>{t('appName')}</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <AppCtx.Provider value={{ darkMode, setDarkMode, activeTab, setActiveTab, showMarketplace, setShowMarketplace }}>
      <div
        className={darkMode ? '' : 'light'}
        style={{
          background: '#000',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 430,
            height: '100dvh',
            maxHeight: 932,
            background: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 0 80px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div className="screen-enter" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {!showMarketplace && activeTab === 'home' && <HomeScreen />}
              {!showMarketplace && activeTab === 'activity' && <ActivityScreen />}
              {!showMarketplace && activeTab === 'coach' && <AICoachScreen />}
              {!showMarketplace && activeTab === 'stats' && <StatisticsScreen />}
              {!showMarketplace && activeTab === 'profile' && <ProfileScreen />}
              {showMarketplace && <MarketplaceScreen />}
            </div>
          </div>

          {!showMarketplace && (
            <nav
              style={{
                background: 'var(--bg-card)',
                borderTop: '1px solid var(--border)',
                paddingBottom: 'env(safe-area-inset-bottom, 8px)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
                {navItems.map((item) => {
                  const active = activeTab === item.id
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 0 6px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      aria-label={item.label}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 32,
                            height: 2.5,
                            background: 'var(--green)',
                            borderRadius: 0,
                            transition: 'all 0.3s ease',
                          }}
                        />
                      )}
                      <div style={{ color: active ? 'var(--green)' : 'var(--text-muted)', transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'color 0.2s ease, transform 0.2s ease' }}>
                        <Icon size={22} />
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: active ? 600 : 400,
                          color: active ? 'var(--green)' : 'var(--text-muted)',
                          transition: 'color 0.2s ease',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
      </div>
    </AppCtx.Provider>
  )
}
