import { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { deriveState, type DerivedState } from '../state/selectors'

/**
 * A "now" that refreshes periodically and on tab focus, so momentum decay and
 * streak status stay live without a manual reload.
 */
export function useNow(intervalMs = 60_000): string {
  const [now, setNow] = useState(() => new Date().toISOString())

  useEffect(() => {
    const tick = () => setNow(new Date().toISOString())
    const id = window.setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', tick)
    }
  }, [intervalMs])

  return now
}

/** Derived view-model recomputed whenever the store or the clock changes. */
export function useDerived(): DerivedState {
  const now = useNow()
  const workouts = useStore((s) => s.workouts)
  const bonusXp = useStore((s) => s.bonusXp)
  const goalMetWeeks = useStore((s) => s.goalMetWeeks)
  const progressWeeks = useStore((s) => s.progressWeeks)
  const pauses = useStore((s) => s.pauses)
  const unlocked = useStore((s) => s.unlocked)
  const settings = useStore((s) => s.settings)
  const createdAt = useStore((s) => s.createdAt)
  const version = useStore((s) => s.version)
  const onboarded = useStore((s) => s.onboarded)

  return deriveState(
    {
      version,
      createdAt,
      workouts,
      bonusXp,
      goalMetWeeks,
      progressWeeks,
      pauses,
      unlocked,
      settings,
      onboarded,
    },
    now,
  )
}
