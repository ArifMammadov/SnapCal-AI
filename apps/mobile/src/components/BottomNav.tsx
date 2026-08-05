import { Home, Dumbbell, Bot, BarChart3, Store, User } from 'lucide-react'
import { useAppStore } from '../store'

const items = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'activity', icon: Dumbbell, label: 'Activity' },
  { id: 'ai', icon: Bot, label: 'AI Coach' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'marketplace', icon: Store, label: 'Market' },
  { id: 'profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const { currentScreen, setScreen } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 max-w-md mx-auto">
      <ul className="flex justify-around items-center py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = currentScreen === item.id
          return (
            <li key={item.id}>
              <button
                onClick={() => setScreen(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  active ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
