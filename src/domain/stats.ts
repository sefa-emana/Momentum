/**
 * Derived analytics for the dashboard and history views.
 */
import { addDays, format } from 'date-fns'
import { dayKey } from './dates'
import type { Workout, WorkoutType } from './types'

export interface DaySeriesPoint {
  date: string
  label: string
  xp: number
  count: number
}

/** XP and session count per day for the last `days` days (oldest first). */
export function dailySeries(
  workouts: Workout[],
  now: string | Date,
  days = 14,
): DaySeriesPoint[] {
  const byDay = new Map<string, { xp: number; count: number }>()
  for (const w of workouts) {
    const key = dayKey(w.date)
    const entry = byDay.get(key) ?? { xp: 0, count: 0 }
    entry.xp += w.xpEarned
    entry.count += 1
    byDay.set(key, entry)
  }

  const end = typeof now === 'string' ? new Date(now) : now
  const points: DaySeriesPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i)
    const key = dayKey(d)
    const entry = byDay.get(key) ?? { xp: 0, count: 0 }
    points.push({
      date: key,
      label: format(d, 'EEE'),
      xp: entry.xp,
      count: entry.count,
    })
  }
  return points
}

export function totalXp(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => sum + w.xpEarned, 0)
}

export interface TypeBreakdown {
  type: WorkoutType
  count: number
  minutes: number
}

export function typeBreakdown(workouts: Workout[]): TypeBreakdown[] {
  const map = new Map<WorkoutType, TypeBreakdown>()
  for (const w of workouts) {
    const entry = map.get(w.type) ?? { type: w.type, count: 0, minutes: 0 }
    entry.count += 1
    entry.minutes += w.durationMin
    map.set(w.type, entry)
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}

export function totalMinutes(workouts: Workout[]): number {
  return workouts.reduce((sum, w) => sum + w.durationMin, 0)
}
