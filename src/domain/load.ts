/**
 * Session load & progressive-overload signal — Foster session-RPE model
 * (`Last = Intensitätsgewicht × Minuten`, PMC5673663), Borg-CR10-anchored and
 * validated against heart-rate load across many sports. This gives Momentum an
 * honest, physiological progression proxy WITHOUT set/rep logging.
 *
 * Safety rails are the differentiator: we compute acute:chronic balance,
 * monotony and strain, but only ever surface plain-language nudges — the raw
 * ACWR is deliberately never shown to the user (its predictive evidence is
 * contested, PMC7047972; we use it purely as a heuristic).
 */
import { addDays } from 'date-fns'
import {
  COMEBACK_GAP_DAYS,
  INTENSITY_RPE,
  LOAD_DURATION_CAP_MIN,
  LOAD_RATIO_ELEVATED,
  WHO_POINTS_PER_MIN,
  WHO_WEEKLY_POINTS_TARGET,
} from './constants'
import { dayKey, daysBetween, isInThisWeek, toDate, weekKey } from './dates'
import type { Workout } from './types'

/** Foster session load for a single workout (AU). Uses the post-session `feel`
 *  RPE when the user tapped one, otherwise the intensity default. */
export function sessionLoad(w: Workout): number {
  const rpe = w.feel ?? INTENSITY_RPE[w.intensity]
  return rpe * Math.min(w.durationMin, LOAD_DURATION_CAP_MIN)
}

/** Per-day summed load for the trailing `days` calendar days (oldest first,
 *  0 for rest days), ending on the day of `now`. */
export function dailyLoads(
  workouts: Workout[],
  now: string | Date,
  days: number,
): number[] {
  const byDay = new Map<string, number>()
  for (const w of workouts) {
    const k = dayKey(w.date)
    byDay.set(k, (byDay.get(k) ?? 0) + sessionLoad(w))
  }
  const end = toDate(now)
  const out: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    out.push(byDay.get(dayKey(addDays(end, -i))) ?? 0)
  }
  return out
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

/** Earliest workout day-key, or null for an empty history. */
function firstDay(workouts: Workout[]): string | null {
  if (workouts.length === 0) return null
  let min = dayKey(workouts[0].date)
  for (const w of workouts) {
    const k = dayKey(w.date)
    if (k < min) min = k
  }
  return min
}

/** Acute load = sum of the last 7 days (AU). */
export function acuteLoad(workouts: Workout[], now: string | Date): number {
  return sum(dailyLoads(workouts, now, 7))
}

/**
 * Chronic load = average weekly load over the four preceding 7-day blocks
 * (days 8–35). Returns null while history is shorter than 14 days, where there
 * is no reliable baseline signal.
 */
export function chronicLoad(workouts: Workout[], now: string | Date): number | null {
  const first = firstDay(workouts)
  if (first === null) return null
  if (daysBetween(first, now) < 14) return null
  // 35-day window: the trailing 7 are the acute block, the preceding 28 (days
  // 8–35) form the four chronic blocks. Mean weekly load = their sum / 4.
  const loads = dailyLoads(workouts, now, 35)
  return sum(loads.slice(0, 28)) / 4
}

/** Acute:chronic load ratio (a.k.a. ACWR). Null when chronic is null or ~0. */
export function loadRatio(workouts: Workout[], now: string | Date): number | null {
  const chronic = chronicLoad(workouts, now)
  if (chronic === null || chronic < 1e-6) return null
  return acuteLoad(workouts, now) / chronic
}

/** Population mean and standard deviation of a sample. */
function meanSd(xs: number[]): { mean: number; sd: number } {
  const mean = sum(xs) / xs.length
  const variance = sum(xs.map((x) => (x - mean) ** 2)) / xs.length
  return { mean, sd: Math.sqrt(variance) }
}

/**
 * Training monotony (Foster) = mean / SD of the last 7 daily loads. High
 * monotony (same load every day, no rest variation) predicts staleness. Null
 * with < 7 days of history or when SD is 0 (undefined ratio).
 */
export function monotony(workouts: Workout[], now: string | Date): number | null {
  const first = firstDay(workouts)
  if (first === null || daysBetween(first, now) < 6) return null
  const loads = dailyLoads(workouts, now, 7)
  const { mean, sd } = meanSd(loads)
  if (sd === 0) return null
  return mean / sd
}

/** Training strain = acute load × monotony. Null when monotony is null. */
export function strain(workouts: Workout[], now: string | Date): number | null {
  const m = monotony(workouts, now)
  if (m === null) return null
  return acuteLoad(workouts, now) * m
}

/** WHO activity points for the current ISO week (moderate 1/min, vigorous 2/min). */
export function weeklyWhoPoints(workouts: Workout[], now: string | Date): number {
  return workouts
    .filter((w) => isInThisWeek(w.date, now))
    .reduce((s, w) => s + WHO_POINTS_PER_MIN[w.intensity] * w.durationMin, 0)
}

/**
 * Number of *distinct ISO weeks* in the history that reached the WHO weekly
 * points target (default 150) — an all-time count, derived by iterating the
 * weeks present in the workout log. Pure, so achievements keyed on it replay
 * consistently.
 */
export function whoWeeksMet(
  workouts: Workout[],
  target: number = WHO_WEEKLY_POINTS_TARGET,
): number {
  const byWeek = new Map<string, number>()
  for (const w of workouts) {
    const k = weekKey(w.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + WHO_POINTS_PER_MIN[w.intensity] * w.durationMin)
  }
  let n = 0
  for (const pts of byWeek.values()) if (pts >= target) n += 1
  return n
}

/** Number of comebacks in the history: gaps of ≥ COMEBACK_GAP_DAYS days between
 *  consecutive workouts. Pure/derivable for the comeback-count achievement. */
export function countComebacks(workouts: Workout[]): number {
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  let n = 0
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1].date, sorted[i].date) >= COMEBACK_GAP_DAYS) n += 1
  }
  return n
}

/** Distinct strength sessions logged in the current ISO week (WHO target: 2). */
export function strengthSessionsThisWeek(workouts: Workout[], now: string | Date): number {
  return workouts.filter((w) => w.type === 'strength' && isInThisWeek(w.date, now)).length
}

export interface LoadTrend {
  thisWeek: number
  lastWeek: number
  delta: number
}

/** Total session load for this ISO week vs. the previous one. */
export function loadTrend(workouts: Workout[], now: string | Date): LoadTrend {
  const thisKey = weekKey(now)
  const lastKey = weekKey(addDays(toDate(now), -7))
  let thisWeek = 0
  let lastWeek = 0
  for (const w of workouts) {
    const k = weekKey(w.date)
    if (k === thisKey) thisWeek += sessionLoad(w)
    else if (k === lastKey) lastWeek += sessionLoad(w)
  }
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek }
}

export type OverreachStatus = 'none' | 'elevated'

/**
 * Gentle load-spike nudge. 'elevated' only when the load ratio is genuinely
 * high (> 1.5) AND absolute acute volume is meaningful (≥ 300 AU), so a
 * beginner ramping from near-zero never gets an alarming signal. Returns a
 * typed status, never a UI string.
 */
export function overreachStatus(workouts: Workout[], now: string | Date): OverreachStatus {
  const ratio = loadRatio(workouts, now)
  if (ratio === null) return 'none'
  const acute = acuteLoad(workouts, now)
  return ratio > LOAD_RATIO_ELEVATED && acute >= 300 ? 'elevated' : 'none'
}

export type MonotonyStatus = 'none' | 'samey'

/** Weekly session-load totals for the trailing `weeks` ISO weeks (oldest first). */
function weeklyLoads(workouts: Workout[], now: string | Date, weeks: number): number[] {
  const out: number[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const key = weekKey(addDays(toDate(now), -7 * i))
    out.push(
      workouts.filter((w) => weekKey(w.date) === key).reduce((s, w) => s + sessionLoad(w), 0),
    )
  }
  return out
}

/**
 * "Everything looks the same" nudge — high monotony (> 2.0) while the current
 * week's load sits in the user's own top tercile of the last 8 weeks (i.e. it
 * is a heavy, unvaried block, exactly when a deload helps). Self-referential,
 * so it adapts to each user's baseline.
 */
export function monotonyStatus(workouts: Workout[], now: string | Date): MonotonyStatus {
  const m = monotony(workouts, now)
  if (m === null || m <= 2.0) return 'none'
  const weekly = weeklyLoads(workouts, now, 8).filter((v) => v > 0)
  if (weekly.length < 3) return 'none'
  const sorted = [...weekly].sort((a, b) => a - b)
  const cutoff = sorted[Math.floor((sorted.length * 2) / 3)]
  const acute = acuteLoad(workouts, now)
  return acute > 0 && acute >= cutoff ? 'samey' : 'none'
}
