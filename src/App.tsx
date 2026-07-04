import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
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
  const [reward, setReward] = useState<
    { reward: WorkoutReward; moodAfter?: 1 | 2 | 3 | 4 | 5 } | null
  >(null)

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
        <Plus size={28} strokeWidth={2} aria-hidden />
      </button>

      <BottomNav tab={tab} onChange={setTab} />

      <AnimatePresence>
        {logOpen && (
          <LogWorkoutSheet
            key="log-sheet"
            onClose={() => setLogOpen(false)}
            onLogged={(r, moodAfter) => {
              setLogOpen(false)
              setReward({ reward: r, moodAfter })
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reward && (
          <RewardOverlay
            key="reward"
            reward={reward.reward}
            moodAfter={reward.moodAfter}
            onClose={() => setReward(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
