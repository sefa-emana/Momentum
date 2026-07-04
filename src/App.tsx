import { useState } from 'react'
import { useStore } from './state/store'
import { Onboarding } from './components/Onboarding'
import { Dashboard } from './components/Dashboard'
import { History } from './components/History'
import { Achievements } from './components/Achievements'
import { Profile } from './components/Profile'
import { BottomNav, type Tab } from './components/BottomNav'
import { LogWorkoutSheet } from './components/LogWorkoutSheet'
import { RewardOverlay } from './components/RewardOverlay'
import type { WorkoutReward } from './state/store'

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  const [tab, setTab] = useState<Tab>('home')
  const [logOpen, setLogOpen] = useState(false)
  const [reward, setReward] = useState<WorkoutReward | null>(null)

  if (!onboarded) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    )
  }

  return (
    <div className="app-shell">
      {tab === 'home' && <Dashboard onLog={() => setLogOpen(true)} />}
      {tab === 'history' && <History />}
      {tab === 'achievements' && <Achievements />}
      {tab === 'profile' && <Profile />}

      <button
        className="fab"
        aria-label="Training loggen"
        onClick={() => setLogOpen(true)}
      >
        +
      </button>

      <BottomNav tab={tab} onChange={setTab} />

      {logOpen && (
        <LogWorkoutSheet
          onClose={() => setLogOpen(false)}
          onLogged={(r) => {
            setLogOpen(false)
            setReward(r)
          }}
        />
      )}

      {reward && (
        <RewardOverlay reward={reward} onClose={() => setReward(null)} />
      )}
    </div>
  )
}
