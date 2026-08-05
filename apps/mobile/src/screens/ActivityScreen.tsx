import { useState } from 'react'

export function ActivityScreen() {
  const [_activities] = useState([])

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">Activity</h1>
      <p className="text-slate-400">Activity tracking will be implemented here.</p>
    </div>
  )
}
