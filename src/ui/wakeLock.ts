/**
 * Screen Wake Lock helper — feature-detected, best-effort.
 *
 * Used by the Satz-Modus rest timer (see `useRestTimer`): the lock is held while
 * a rest countdown runs and re-acquired on visibilitychange (the browser
 * auto-releases on tab hide). Silent no-op where the Wake Lock API is absent.
 */

/** Minimal typings — Wake Lock is absent from some lib.dom.d.ts revisions. */
interface WakeLockSentinelLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}
interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>
}

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

/**
 * Acquire a screen wake lock. Returns the sentinel (call `.release()` to drop
 * it) or `null` when unsupported / denied. The caller owns re-acquiring after a
 * visibilitychange, since the browser auto-releases on tab hide.
 */
export async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
  if (!wakeLockSupported()) return null
  try {
    const nav = navigator as Navigator & { wakeLock: WakeLockLike }
    return await nav.wakeLock.request('screen')
  } catch {
    return null
  }
}
