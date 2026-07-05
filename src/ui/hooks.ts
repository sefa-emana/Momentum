import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/store'
import { deriveState, type DerivedState } from '../state/selectors'
import { computeStreak, trainedToday } from '../domain'
import { applyBadge, shouldShowBadge } from './badge'

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

/**
 * True when motion should be suppressed — either the user's in-app
 * "Animationen reduzieren" setting or the OS `prefers-reduced-motion`. Used by
 * the Ticker, confetti and other motion primitives to fall back to an instant,
 * static render.
 */
export function useReducedMotion(): boolean {
  const setting = useStore((s) => s.settings.reducedMotion)
  const [osReduced, setOsReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setOsReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return setting || osReduced
}

/**
 * Derived view-model. Memoized on the individual store slices plus the
 * minute-`now`, so it only recomputes when an input actually changes — an
 * unrelated re-render (e.g. a local `useState` elsewhere) reuses the last
 * derivation instead of re-running the whole selector chain. Zustand returns
 * stable slice references until a slice mutates, which keeps the memo honest.
 */
export function useDerived(): DerivedState {
  const now = useNow()
  const workouts = useStore((s) => s.workouts)
  const bonusXp = useStore((s) => s.bonusXp)
  const goalMetWeeks = useStore((s) => s.goalMetWeeks)
  const progressWeeks = useStore((s) => s.progressWeeks)
  const pauses = useStore((s) => s.pauses)
  const acceptedQuests = useStore((s) => s.acceptedQuests)
  const questsDone = useStore((s) => s.questsDone)
  const unlocked = useStore((s) => s.unlocked)
  const customExercises = useStore((s) => s.customExercises)
  const settings = useStore((s) => s.settings)
  const createdAt = useStore((s) => s.createdAt)
  const version = useStore((s) => s.version)
  const onboarded = useStore((s) => s.onboarded)

  return useMemo(
    () =>
      deriveState(
        {
          version,
          createdAt,
          workouts,
          bonusXp,
          goalMetWeeks,
          progressWeeks,
          pauses,
          acceptedQuests,
          questsDone,
          unlocked,
          customExercises,
          settings,
          onboarded,
        },
        now,
      ),
    [
      version,
      createdAt,
      workouts,
      bonusXp,
      goalMetWeeks,
      progressWeeks,
      pauses,
      acceptedQuests,
      questsDone,
      unlocked,
      customExercises,
      settings,
      onboarded,
      now,
    ],
  )
}

/**
 * Track async persist hydration. IndexedDB rehydration is asynchronous, so the
 * app must wait for it before rendering — otherwise an existing user briefly
 * sees the onboarding flash. `true` once the persisted state has been applied
 * (or immediately, if there was nothing to hydrate).
 */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated())

  useEffect(() => {
    const unsubFinish = useStore.persist.onFinishHydration(() => setHydrated(true))
    // Cover the race where hydration finished between initial state and effect.
    if (useStore.persist.hasHydrated()) setHydrated(true)
    return unsubFinish
  }, [])

  return hydrated
}

/**
 * Keep the PWA app-icon badge in sync with the "come train" conditions. Driven
 * by the live workout/pause slices and the minute-`now` (which also refreshes
 * on visibilitychange/focus via {@link useNow}), so the badge clears the moment
 * a session is logged and re-evaluates the 16:00 evening rule over time. Silent
 * no-op where the Badging API is unsupported.
 */
export function useAppBadge(): void {
  const workouts = useStore((s) => s.workouts)
  const pauses = useStore((s) => s.pauses)
  const now = useNow()

  useEffect(() => {
    const show = shouldShowBadge({
      trainedToday: trainedToday(workouts, now),
      currentStreak: computeStreak(workouts, now, pauses),
      paused: pauses.some((p) => p.to === null),
      now: new Date(now),
    })
    void applyBadge(show)
  }, [workouts, pauses, now])
}
