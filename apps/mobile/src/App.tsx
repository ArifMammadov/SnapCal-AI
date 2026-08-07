import { useTelegram } from './hooks/useTelegram'
import { HomeScreen } from './screens/HomeScreen'
import { ActivityScreen } from './screens/ActivityScreen'
import { AICoachScreen } from './screens/AICoachScreen'
import { StatisticsScreen } from './screens/StatisticsScreen'
import { MarketplaceScreen } from './screens/MarketplaceScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { BottomNav } from './components/BottomNav'
import { LoginScreen } from './screens/LoginScreen'
import { useAppStore } from './store'
import './index.css'

type Screen = 'home' | 'activity' | 'ai' | 'stats' | 'marketplace' | 'profile'

export function App() {
  const { ready } = useTelegram()
  const currentScreen = useAppStore((s) => s.currentScreen) as Screen
  const user = useAppStore((s) => s.user)

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-lg font-medium">SnapCal AI</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col max-w-md mx-auto shadow-2xl">
      <main className="flex-1 overflow-y-auto pb-20">
        {currentScreen === 'home' && <HomeScreen />}
        {currentScreen === 'activity' && <ActivityScreen />}
        {currentScreen === 'ai' && <AICoachScreen />}
        {currentScreen === 'stats' && <StatisticsScreen />}
        {currentScreen === 'marketplace' && <MarketplaceScreen />}
        {currentScreen === 'profile' && <ProfileScreen />}
      </main>
      <BottomNav />
    </div>
  )
}
