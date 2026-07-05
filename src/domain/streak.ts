/**
 * Streaks with the evidence-based "never miss twice" rule (Atomic Habits).
 *
 * A streak counts distinct active days and survives a *single* rest day
 * between sessions — rest is healthy for training. It only breaks when two
 * calendar days in a row are missed. This keeps the loss-aversion pull of a
 * streak without the all-or-nothing quitting a rigid daily streak provokes.
 */
import { dayKey, daysBetween, pausedDaysBetween } from './dates'
import type { Pause, Workout } from './types'

/** Unique active day keys, chronologically sorted. */
function activeDays(workouts: Workout[]): string[] {
  return [...new Set(workouts.map((w) => dayKey(w.date)))].sort()
}

/**
 * Effective gap between two active days: paused days ("Life happened") count as
 * neither active nor inactive, so they are subtracted — a pause freezes the
 * streak instead of breaking it. Always at least 1 for two distinct days.
 */
function effectiveGap(earlier: string, later: string | Date, pauses: Pause[]): number {
  return Math.max(1, daysBetween(earlier, later) - pausedDaysBetween(earlier, later, pauses))
}

/**
 * Current streak as of `now`. Alive while the gap to the most recent active
 * day is at most 2 calendar days (today open + one forgiven rest day). Pauses
 * freeze the streak: their days don't count toward the gap.
 */
export function computeStreak(
  workouts: Workout[],
  now: string | Date,
  pauses: Pause[] = [],
): number {
  const days = activeDays(workouts)
  if (days.length === 0) return 0

  const last = days[days.length - 1]
  // The gap to now excludes paused days; use Math.max(0, …) since `now` itself
  // is the open observation day, not a completed active day.
  const gapToNow = Math.max(
    0,
    daysBetween(last, now) - pausedDaysBetween(last, now, pauses),
  )
  if (gapToNow > 2) return 0

  let streak = 1
  for (let i = days.length - 1; i > 0; i--) {
    const gap = effectiveGap(days[i - 1], days[i], pauses)
    // gap 1 = consecutive days, gap 2 = one forgiven rest day. Both continue.
    if (gap <= 2) streak += 1
    else break
  }
  return streak
}

/** Longest streak ever achieved, using the same "never miss twice" rule. */
export function longestStreak(workouts: Workout[], pauses: Pause[] = []): number {
  const days = activeDays(workouts)
  if (days.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    const gap = effectiveGap(days[i - 1], days[i], pauses)
    if (gap <= 2) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** Whether today still needs a workout to keep momentum toward the streak. */
export function trainedToday(workouts: Workout[], now: string | Date): boolean {
  const today = dayKey(now)
  return workouts.some((w) => dayKey(w.date) === today)
}
