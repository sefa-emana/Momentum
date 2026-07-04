/**
 * Core domain types for Momentum.
 *
 * All dates are stored as ISO strings (`YYYY-MM-DD...`) so state serialises
 * cleanly to localStorage. Domain functions accept explicit `now` values to
 * stay pure and fully testable.
 */

export type WorkoutType =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'sport'
  | 'other'

export type Intensity = 'light' | 'moderate' | 'vigorous'

export interface Workout {
  id: string
  /** ISO timestamp of when the session took place. */
  date: string
  type: WorkoutType
  /** Duration in minutes. */
  durationMin: number
  intensity: Intensity
  note?: string
  /** XP awarded for this workout at the time it was logged. */
  xpEarned: number
}

export type MomentumTier = 'cold' | 'warm' | 'hot' | 'blazing'

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** Emoji icon. */
  icon: string
  /** Bonus XP granted when unlocked. */
  bonusXp: number
}

export interface UnlockedAchievement {
  id: string
  /** ISO timestamp of unlock. */
  unlockedAt: string
}

export interface WeeklyGoal {
  /** Target number of workouts per ISO week. */
  workoutsPerWeek: number
}

export interface Settings {
  weeklyGoal: WeeklyGoal
  /** User-facing display name. */
  name: string
  reducedMotion: boolean
}

export interface AppState {
  version: number
  createdAt: string
  workouts: Workout[]
  /** XP from achievement + weekly-goal bonuses (workout XP lives on each
   *  workout). Total XP = sum(workout.xpEarned) + bonusXp. */
  bonusXp: number
  /** ISO-week keys for which the weekly-goal bonus has already been granted,
   *  so it is awarded at most once per week. */
  goalMetWeeks: string[]
  unlocked: UnlockedAchievement[]
  settings: Settings
  /** True once the user has finished onboarding. */
  onboarded: boolean
}

export interface LevelInfo {
  level: number
  /** XP accumulated within the current level. */
  xpIntoLevel: number
  /** XP required to advance from the current level to the next. */
  xpForNextLevel: number
  /** 0–1 progress through the current level. */
  progress: number
  /** Total XP represented. */
  totalXp: number
}
