import { useState, useRef } from 'react'
import { Send, Camera, Mic } from 'lucide-react'
import { api } from '../lib/api.js'
import { useAppStore } from '../store/index.js'

interface LocalMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  foodData?: {
    name: string
    calories: number
    proteinG: number
    carbsG: number
    fatG: number
    serving: string
    suggestedMealType: string
  }
}

export function AICoachScreen() {
  const user = useAppStore((s: { user: { firstName?: string } | null }) => s.user)
  const [messages, setMessages] = useState<LocalMessage[]>([
    { id: 'welcome', role: 'ai', content: `Hi ${user?.firstName ?? 'there'}! I'm your SnapCal AI coach. How can I help you today?` },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg: LocalMessage = { id: Date.now().toString(), role: 'user', content: input }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setTyping(true)

    try {
      const { data } = await api.post('/ai/chat', { message: input })
      setMessages((m) => [
        ...m,
        {
          id: data.message.id,
          role: 'ai',
          content: data.message.content,
          foodData: data.message.foodData,
        },
      ])
    } catch {
      setMessages((m) => [...m, { id: 'err', role: 'ai', content: 'Sorry, I could not process that. Please try again.' }])
    } finally {
      setTyping(false)
    }
  }

  const handlePhoto = () => {
    fileRef.current?.click()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-900">
        <h1 className="text-lg font-bold">AI Coach</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-100'
              }`}
            >
              {msg.content}
              {msg.foodData && (
                <div className="mt-2 bg-slate-900/50 rounded-lg p-2 text-xs">
                  <p>{msg.foodData.name} — {msg.foodData.calories} kcal</p>
                  <p>P {msg.foodData.proteinG}g · C {msg.foodData.carbsG}g · F {msg.foodData.fatG}g</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && <div className="text-slate-500 text-sm">AI is typing...</div>}
      </div>

      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={() => {}} />
          <button onClick={handlePhoto} className="p-2 text-slate-400 hover:text-white">
            <Camera size={20} />
          </button>
          <button className="p-2 text-slate-400 hover:text-white">
            <Mic size={20} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask SnapCal AI..."
            className="flex-1 bg-slate-800 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={sendMessage} className="p-2 bg-emerald-500 rounded-full text-white">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
