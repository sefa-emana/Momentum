/**
 * App icon badging — the single reliable glanceability channel for an installed
 * PWA (iOS 16.4+, Chromium desktop/Android). We show a *dot* (no count) as a
 * calm "you haven't trained today" nudge, and clear it the moment a workout is
 * logged or the conditions no longer hold.
 *
 * Rest-protecting philosophy: the nudge only appears from 16:00 local time and
 * only when there is an active streak to protect — never in the morning, never
 * during a "Life happened" pause, never when there is nothing at stake. It is a
 * silent no-op everywhere the API is unsupported.
 */

/** Minimal typing for the Badging API (not in every lib.dom.d.ts revision). */
interface BadgingNavigator {
  setAppBadge?: (count?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function badgeSupported(): boolean {
  return typeof navigator !== 'undefined' && 'setAppBadge' in navigator
}

/** Hour (local, 24h) from which the "come train" nudge may show. */
export const BADGE_FROM_HOUR = 16

export interface BadgeConditions {
  /** Has the user already logged a session today? */
  trainedToday: boolean
  /** Current streak length (0 = nothing to protect). */
  currentStreak: number
  /** Is a "Life happened" pause active? */
  paused: boolean
  /** The moment to evaluate against (local time). */
  now: Date
}

/**
 * Pure decision: should the badge dot be shown right now? Kept side-effect-free
 * so the time/streak/pause rules can be unit-tested exhaustively.
 */
export function shouldShowBadge({
  trainedToday,
  currentStreak,
  paused,
  now,
}: BadgeConditions): boolean {
  if (paused) return false // protect rest — no guilt during a pause
  if (trainedToday) return false // nothing left to nudge
  if (currentStreak <= 0) return false // no streak at stake
  return now.getHours() >= BADGE_FROM_HOUR // evenings only
}

/**
 * Apply the desired badge state. `show === true` sets a countless dot; `false`
 * clears it. Fully feature-detected and swallows every error, so callers can
 * fire-and-forget on any platform.
 */
export async function applyBadge(show: boolean): Promise<void> {
  if (typeof navigator === 'undefined') return
  const nav = navigator as Navigator & BadgingNavigator
  try {
    if (show) {
      await nav.setAppBadge?.()
    } else {
      await nav.clearAppBadge?.()
    }
  } catch {
    /* unsupported or transiently failed — silent no-op by design */
  }
}
