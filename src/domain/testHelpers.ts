import type { Intensity, Workout, WorkoutType } from './types'

let seq = 0

/** Build a workout for a given ISO date (defaults are chosen so XP is
 *  predictable in tests). */
export function makeWorkout(
  date: string,
  overrides: Partial<Workout> = {},
): Workout {
  seq += 1
  return {
    id: `w${seq}`,
    date: date.includes('T') ? date : `${date}T10:00:00.000Z`,
    type: (overrides.type ?? 'strength') as WorkoutType,
    durationMin: overrides.durationMin ?? 30,
    intensity: (overrides.intensity ?? 'moderate') as Intensity,
    note: overrides.note,
    xpEarned: overrides.xpEarned ?? 0,
    ...overrides,
  }
}

/** ISO string for `day` days after a base date. */
export function dayOffset(base: string, days: number): string {
  const d = new Date(`${base}T10:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}
