/**
 * Ghost-value selectors — the "last time you did this" prefill that makes
 * Satz-Modus logging feel like one tap.
 *
 * All pure over the workout history so they can be unit-tested and reused in
 * both the log and edit sheets. A "ghost" is the most recent prior session's
 * working sets for an exercise: the log sheet pre-fills grey, and one tap on ✓
 * confirms them as-is.
 */
import { toEpoch } from './dates'
import { isWorkingSet, sessionsForExercise, workingSetsFor } from './progression'
import type { SetEntry, Workout } from './types'

/** The most recent prior workout that logged `exerciseId` (or undefined). */
export function lastSessionFor(
  workouts: Workout[],
  exerciseId: string,
): Workout | undefined {
  const sessions = sessionsForExercise(workouts, exerciseId)
  return sessions.length > 0 ? sessions[sessions.length - 1] : undefined
}

/**
 * The working sets of the most recent prior session for `exerciseId` — the
 * ghost prefill. Warmups are dropped (they are not the target to beat).
 * Returns [] when the exercise has never been logged.
 */
export function ghostSetsFor(
  workouts: Workout[],
  exerciseId: string,
): SetEntry[] {
  const last = lastSessionFor(workouts, exerciseId)
  if (!last) return []
  return workingSetsFor(last, exerciseId).map((s) => ({ ...s }))
}

/**
 * Recently-used exercise ids, most-recent first, de-duplicated. Drives the
 * "recently used" pins at the top of the exercise picker. `limit` caps the list.
 */
export function recentExerciseIds(
  workouts: Workout[],
  limit = 6,
): string[] {
  const sorted = [...workouts].sort((a, b) => toEpoch(b.date) - toEpoch(a.date))
  const seen: string[] = []
  for (const w of sorted) {
    if (!w.entries) continue
    for (const e of w.entries) {
      if (!seen.includes(e.exerciseId) && e.sets.some(isWorkingSet)) {
        seen.push(e.exerciseId)
        if (seen.length >= limit) return seen
      }
    }
  }
  return seen
}
