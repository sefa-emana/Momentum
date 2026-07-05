/**
 * Date helpers. All comparisons are done on *calendar days* in the user's
 * local timezone, which is what matters for streaks, decay and weekly goals.
 */
import {
  addDays,
  differenceInCalendarDays,
  startOfDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import type { Pause } from './types'

/**
 * Date parsing is by far the hottest operation in the domain layer: momentum,
 * load, streak and quest folds each iterate the full history and re-parse the
 * same ISO strings thousands of times. `parseISO` is ~50–100× costlier than a
 * Map lookup, so memoizing the parse (and the derived day/week keys) by their
 * *string* input turns the replay path from tens of seconds into milliseconds —
 * a pure constant-factor win that changes no observable result (these are pure
 * functions of a string, and the runtime timezone is fixed within a session).
 * Only string inputs are cached; Date inputs pass straight through untouched.
 */
const epochCache = new Map<string, number>()

/** Cached epoch millis for a string date — for sort comparators on hot paths. */
export function toEpoch(value: string | Date): number {
  if (typeof value !== 'string') return value.getTime()
  let ms = epochCache.get(value)
  if (ms === undefined) {
    ms = parseISO(value).getTime()
    epochCache.set(value, ms)
  }
  return ms
}

export function toDate(value: string | Date): Date {
  // Return a *fresh* Date (never a shared, mutable instance) built from the
  // cached epoch, so callers that pass it into date-fns stay isolated.
  return typeof value === 'string' ? new Date(toEpoch(value)) : value
}

/** Fixed reference for calendar-day numbering (arbitrary, only used as an
 *  origin so day-numbers are additive across the codebase). */
const DAY_NUMBER_EPOCH = new Date(2000, 0, 1)
const dayNumberCache = new Map<string, number>()

/**
 * Calendar-day index relative to a fixed origin (local time, DST-correct via
 * date-fns). Cached per string input. `daysBetween` becomes a subtraction of
 * two cached integers instead of a per-call `differenceInCalendarDays`, which
 * is the single hottest operation in the momentum/streak folds — a transparent
 * constant-factor win (day-difference is additive, so the result is identical).
 */
function dayNumber(value: string | Date): number {
  if (typeof value !== 'string') {
    return differenceInCalendarDays(value, DAY_NUMBER_EPOCH)
  }
  let n = dayNumberCache.get(value)
  if (n === undefined) {
    n = differenceInCalendarDays(toDate(value), DAY_NUMBER_EPOCH)
    dayNumberCache.set(value, n)
  }
  return n
}

/** Whole calendar days between two instants (later - earlier). */
export function daysBetween(earlier: string | Date, later: string | Date): number {
  return dayNumber(later) - dayNumber(earlier)
}

const dayKeyCache = new Map<string, string>()

export function dayKey(value: string | Date): string {
  if (typeof value === 'string') {
    const hit = dayKeyCache.get(value)
    if (hit !== undefined) return hit
  }
  const d = startOfDay(toDate(value))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const key = `${y}-${m}-${day}`
  if (typeof value === 'string') dayKeyCache.set(value, key)
  return key
}

/** Monday-based week, matching ISO weeks and a "fresh start" every Monday. */
export function weekInterval(now: string | Date): { start: Date; end: Date } {
  const d = toDate(now)
  return {
    start: startOfWeek(d, { weekStartsOn: 1 }),
    end: endOfWeek(d, { weekStartsOn: 1 }),
  }
}

export function isInThisWeek(value: string | Date, now: string | Date): boolean {
  // Equivalent to "same Monday-based week", but via the memoized weekKey so a
  // full-history scan doesn't re-run date-fns interval math per element.
  return weekKey(value) === weekKey(now)
}

/** Whether a given calendar day (by dayKey) falls inside any pause. An open
 *  pause (`to === null`) extends indefinitely into the future. */
export function isPausedDay(day: string | Date, pauses: Pause[]): boolean {
  const key = dayKey(day)
  return pauses.some((p) => {
    const from = dayKey(p.from)
    const to = p.to === null ? '9999-12-31' : dayKey(p.to)
    return key >= from && key <= to
  })
}

/**
 * Count the paused calendar days strictly between two instants (exclusive of
 * both endpoints, which are themselves active/observation days). This is what
 * lets a pause "freeze" decay and streaks: paused days are subtracted from the
 * gap so they count as neither active nor inactive.
 */
export function pausedDaysBetween(
  earlier: string | Date,
  later: string | Date,
  pauses: Pause[],
): number {
  if (pauses.length === 0) return 0
  const total = daysBetween(earlier, later)
  const start = startOfDay(toDate(earlier))
  let count = 0
  for (let i = 1; i < total; i++) {
    if (isPausedDay(addDays(start, i), pauses)) count += 1
  }
  return count
}

const weekKeyCache = new Map<string, string>()

/** Stable identifier for the ISO week a date falls in (e.g. "2026-W27"). */
export function weekKey(now: string | Date): string {
  if (typeof now === 'string') {
    const hit = weekKeyCache.get(now)
    if (hit !== undefined) return hit
  }
  const key = computeWeekKey(now)
  if (typeof now === 'string') weekKeyCache.set(now, key)
  return key
}

function computeWeekKey(now: string | Date): string {
  const { start } = weekInterval(now)
  // ISO week number.
  const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
