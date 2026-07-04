/**
 * Pure derived-state selectors. Kept separate from the store so they can be
 * unit-tested and reused in both React hooks and tests.
 */
import {
  computeMomentum,
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
  type AppState,
  type LevelInfo,
  type MomentumTier,
} from '../domain'

export interface DerivedState {
  totalXp: number
  level: LevelInfo
  momentum: number
  momentumTier: MomentumTier
  currentStreak: number
  longestStreak: number
  trainedToday: boolean
  week: ReturnType<typeof weekProgress>
  totalWorkouts: number
  totalMinutes: number
  series: ReturnType<typeof dailySeries>
  types: ReturnType<typeof typeBreakdown>
}

export function deriveState(state: AppState, now: string | Date): DerivedState {
  const total = sumWorkoutXp(state.workouts) + state.bonusXp
  const momentum = computeMomentum(state.workouts, now)
  return {
    totalXp: total,
    level: levelFromXp(total),
    momentum,
    momentumTier: momentumTier(momentum),
    currentStreak: computeStreak(state.workouts, now),
    longestStreak: longestStreak(state.workouts),
    trainedToday: trainedToday(state.workouts, now),
    week: weekProgress(
      state.workouts,
      state.settings.weeklyGoal.workoutsPerWeek,
      now,
    ),
    totalWorkouts: state.workouts.length,
    totalMinutes: totalMinutes(state.workouts),
    series: dailySeries(state.workouts, now, 14),
    types: typeBreakdown(state.workouts),
  }
}
