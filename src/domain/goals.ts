/**
 * Weekly goals — Goal-Setting Theory (Locke & Latham): specific, self-set,
 * moderately challenging, with live feedback and a Monday "fresh start".
 */
import { addDays } from 'date-fns'
import { ADAPTIVE_GOAL_MAX, ADAPTIVE_GOAL_MIN } from './constants'
import { isInThisWeek, toDate, weekKey } from './dates'
import type { Workout } from './types'

export interface WeekProgress {
  /** Workout sessions logged in the current week counting toward the goal
   *  (a two-a-day counts as two — see the count in weekProgress). */
  completed: number
  target: number
  /** 0–1, clamped. */
  ratio: number
  met: boolean
  weekKey: string
}

export function weekProgress(
  workouts: Workout[],
  target: number,
  now: string | Date,
): WeekProgress {
  // Count sessions (not distinct days) so two-a-days still progress the goal,
  // but a sane target keeps it honest.
  const completed = workouts.filter((w) => isInThisWeek(w.date, now)).length
  const ratio = target <= 0 ? 1 : Math.min(1, completed / target)
  return {
    completed,
    target,
    ratio,
    met: completed >= target,
    weekKey: weekKey(now),
  }
}

export interface GoalSuggestion {
  suggestion: number
  reason: 'raise' | 'lower' | 'keep'
}

/**
 * Adaptive weekly-goal suggestion (adaptive goals beat static ones in RCTs,
 * PMC8820277). Looks at the four completed ISO weeks before the current one and
 * counts how many hit `currentGoal` (by session count):
 *   ≥ 3 hits → nudge up (capped at 6 to protect ≥ 1 rest day)
 *   ≤ 1 hit  → nudge down (floored at 2)
 *   else     → keep.
 * Pure suggestion only — the user always keeps the final word (autonomy).
 */
export function suggestWeeklyGoal(
  workouts: Workout[],
  currentGoal: number,
  now: string | Date,
): GoalSuggestion {
  let hits = 0
  for (let w = 1; w <= 4; w++) {
    const key = weekKey(addDays(toDate(now), -7 * w))
    const count = workouts.filter((x) => weekKey(x.date) === key).length
    if (count >= currentGoal) hits += 1
  }

  if (hits >= 3) {
    return { suggestion: Math.min(currentGoal + 1, ADAPTIVE_GOAL_MAX), reason: 'raise' }
  }
  if (hits <= 1) {
    return { suggestion: Math.max(currentGoal - 1, ADAPTIVE_GOAL_MIN), reason: 'lower' }
  }
  return { suggestion: currentGoal, reason: 'keep' }
}
