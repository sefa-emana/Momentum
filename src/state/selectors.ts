/**
 * Pure derived-state selectors. Kept separate from the store so they can be
 * unit-tested and reused in both React hooks and tests.
 */
import {
  computeMomentumDetail,
  computeStreak,
  dailySeries,
  levelFromXp,
  longestStreak,
  momentumTier,
  totalMinutes,
  totalXp as sumWorkoutXp,
  trainedToday,
  typeBreakdown,
  weekProgress,
  weeklyWhoPoints,
  type AppState,
  type LevelInfo,
  type MomentumTier,
} from '../domain'

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
  totalWorkouts: number
  totalMinutes: number
  series: ReturnType<typeof dailySeries>
  types: ReturnType<typeof typeBreakdown>
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
    totalWorkouts: state.workouts.length,
    totalMinutes: totalMinutes(state.workouts),
    series: dailySeries(state.workouts, now, 14),
    types: typeBreakdown(state.workouts),
  }
}
