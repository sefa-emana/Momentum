/**
 * Pure derived-state selectors. Kept separate from the store so they can be
 * unit-tested and reused in both React hooks and tests.
 */
import { addDays } from 'date-fns'
import {
  computeMomentumDetail,
  computeStreak,
  dailyLoads,
  dailySeries,
  dayKey,
  daysBetween,
  levelFromXp,
  loadTrend,
  longestStreak,
  momentumTier,
  monotonyStatus,
  overreachStatus,
  strengthSessionsThisWeek,
  suggestWeeklyGoal,
  totalMinutes,
  totalXp as sumWorkoutXp,
  trainedToday,
  typeBreakdown,
  weekInterval,
  weekProgress,
  weeklyWhoPoints,
  type AppState,
  type GoalSuggestion,
  type LevelInfo,
  type LoadTrend,
  type MomentumTier,
  type MonotonyStatus,
  type OverreachStatus,
  type Workout,
} from '../domain'

/** One cell of the current-week strip (Monday-based). */
export interface WeekDay {
  key: string
  /** Single-letter German weekday label (Mo–So). */
  label: string
  trained: boolean
  isToday: boolean
  isFuture: boolean
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** The seven days of the current ISO week with training/today/future flags. */
export function weekStripDays(workouts: Workout[], now: string | Date): WeekDay[] {
  const { start } = weekInterval(now)
  const todayKey = dayKey(now)
  const trainedKeys = new Set(workouts.map((w) => dayKey(w.date)))
  const out: WeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i)
    const key = dayKey(day)
    out.push({
      key,
      label: WEEKDAY_LABELS[i],
      trained: trainedKeys.has(key),
      isToday: key === todayKey,
      isFuture: key > todayKey,
    })
  }
  return out
}

/** Average sessions per week across the trailing 28 days (one decimal). */
export function avgSessionsPerWeek(workouts: Workout[], now: string | Date): number {
  const count = workouts.filter((w) => {
    const d = daysBetween(w.date, now)
    return d >= 0 && d < 28
  }).length
  return Math.round((count / 4) * 10) / 10
}

export interface DerivedState {
  totalXp: number
  level: LevelInfo
  momentum: number
  momentumTier: MomentumTier
  /** Rest Shields currently banked (forgiveness layer). */
  shieldsRemaining: number
  currentStreak: number
  longestStreak: number
  trainedToday: boolean
  /** True while a "Life happened" pause is active. */
  paused: boolean
  week: ReturnType<typeof weekProgress>
  weeklyWhoPoints: number
  /** Distinct strength sessions this ISO week (WHO target: 2). */
  strengthThisWeek: number
  totalWorkouts: number
  totalMinutes: number
  series: ReturnType<typeof dailySeries>
  types: ReturnType<typeof typeBreakdown>
  /** This ISO week's session load vs. last week's (for the progress card). */
  loadTrend: LoadTrend
  /** 14-day daily session-load series (for the sparkline). */
  load14: number[]
  /** Gentle load-spike status ('elevated' → calm nudge, no bonus). */
  overreach: OverreachStatus
  /** "Everything looks the same" deload heuristic. */
  monotony: MonotonyStatus
  /** Adaptive weekly-goal suggestion (raise/lower/keep). */
  goalSuggestion: GoalSuggestion
  /** Current ISO week's day cells (Mo–So). */
  weekStrip: WeekDay[]
  /** Average sessions per week over the trailing 4 weeks. */
  avgSessionsPerWeek: number
}

export function deriveState(state: AppState, now: string | Date): DerivedState {
  const total = sumWorkoutXp(state.workouts) + state.bonusXp
  const pauses = state.pauses ?? []
  const detail = computeMomentumDetail(state.workouts, pauses, now)
  return {
    totalXp: total,
    level: levelFromXp(total),
    momentum: detail.momentum,
    momentumTier: momentumTier(detail.momentum),
    shieldsRemaining: detail.shieldsRemaining,
    currentStreak: computeStreak(state.workouts, now, pauses),
    longestStreak: longestStreak(state.workouts, pauses),
    trainedToday: trainedToday(state.workouts, now),
    paused: pauses.some((p) => p.to === null),
    week: weekProgress(
      state.workouts,
      state.settings.weeklyGoal.workoutsPerWeek,
      now,
    ),
    weeklyWhoPoints: weeklyWhoPoints(state.workouts, now),
    strengthThisWeek: strengthSessionsThisWeek(state.workouts, now),
    totalWorkouts: state.workouts.length,
    totalMinutes: totalMinutes(state.workouts),
    series: dailySeries(state.workouts, now, 14),
    types: typeBreakdown(state.workouts),
    loadTrend: loadTrend(state.workouts, now),
    load14: dailyLoads(state.workouts, now, 14),
    overreach: overreachStatus(state.workouts, now),
    monotony: monotonyStatus(state.workouts, now),
    goalSuggestion: suggestWeeklyGoal(
      state.workouts,
      state.settings.weeklyGoal.workoutsPerWeek,
      now,
    ),
    weekStrip: weekStripDays(state.workouts, now),
    avgSessionsPerWeek: avgSessionsPerWeek(state.workouts, now),
  }
}
