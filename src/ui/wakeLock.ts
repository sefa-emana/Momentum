/**
 * Screen Wake Lock helper — feature-detected, best-effort.
 *
 * TODO(future): not wired into any UI yet. Momentum has no in-app timer or
 * live-session screen that would need to keep the display awake. This is kept
 * as a small, tested-shape utility so that when a rest-timer / live-workout
 * feature lands it can hold a wake lock without re-deriving the feature
 * detection and re-acquire-on-visibility dance. Intentionally exported and
 * unused for now (documented dead code, not accidental).
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
