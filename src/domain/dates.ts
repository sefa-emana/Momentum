/**
 * Date helpers. All comparisons are done on *calendar days* in the user's
 * local timezone, which is what matters for streaks, decay and weekly goals.
 */
import {
  differenceInCalendarDays,
  startOfDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns'

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** Whole calendar days between two instants (later - earlier). */
export function daysBetween(earlier: string | Date, later: string | Date): number {
  return differenceInCalendarDays(toDate(later), toDate(earlier))
}

export function dayKey(value: string | Date): string {
  const d = startOfDay(toDate(value))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const { start, end } = weekInterval(now)
  return isWithinInterval(toDate(value), { start, end })
}

/** Stable identifier for the ISO week a date falls in (e.g. "2026-W27"). */
export function weekKey(now: string | Date): string {
  const { start } = weekInterval(now)
  // ISO week number.
  const d = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
