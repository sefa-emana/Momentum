/**
 * Weekly goals — Goal-Setting Theory (Locke & Latham): specific, self-set,
 * moderately challenging, with live feedback and a Monday "fresh start".
 */
import { isInThisWeek, weekKey } from './dates'
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
