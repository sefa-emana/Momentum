import { useCallback, useEffect, useRef, useState } from 'react'
import { requestWakeLock } from './wakeLock'

interface WakeSentinel {
  released: boolean
  release: () => Promise<void>
}

export interface RestTimerApi {
  running: boolean
  remaining: number
  total: number
  start: (seconds: number) => void
  add: (seconds: number) => void
  skip: () => void
}

/**
 * A dismissible rest countdown. Holds a screen Wake Lock while running (and
 * re-acquires it on visibility change), vibrates once on completion where
 * supported, and never blocks the rest of the UI. Pure interval-based so it
 * stays testable and cheap.
 */
export function useRestTimer(): RestTimerApi {
  const [total, setTotal] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const wakeRef = useRef<WakeSentinel | null>(null)
  const tickRef = useRef<number | null>(null)

  const releaseWake = useCallback(() => {
    const w = wakeRef.current
    wakeRef.current = null
    if (w && !w.released) void w.release()
  }, [])

  const stop = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    setRunning(false)
    releaseWake()
  }, [releaseWake])

  const start = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return
      setTotal(seconds)
      setRemaining(seconds)
      setRunning(true)
      void requestWakeLock().then((s) => {
        if (s) wakeRef.current = s
        else releaseWake()
      })
    },
    [releaseWake],
  )

  const add = useCallback((seconds: number) => {
    setRemaining((r) => r + seconds)
    setTotal((t) => t + seconds)
  }, [])

  const skip = useCallback(() => stop(), [stop])

  // Countdown loop.
  useEffect(() => {
    if (!running) return
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // Completed — buzz once, drop the wake lock, stop.
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate?.(120)
            } catch {
              /* no-op */
            }
          }
          window.setTimeout(() => stop(), 0)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [running, stop])

  // Re-acquire the wake lock when the tab becomes visible again mid-rest.
  useEffect(() => {
    if (!running) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !wakeRef.current) {
        void requestWakeLock().then((s) => {
          if (s) wakeRef.current = s
        })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [running])

  // Release on unmount.
  useEffect(() => releaseWake, [releaseWake])

  return { running, remaining, total, start, add, skip }
}
