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
  /** Optional post-session RPE ("Wie hart war's wirklich?"): a 4-option tap
   *  (locker 3 / solide 5 / hart 7 / alles 9) that sharpens the session load
   *  beyond the intensity default. */
  feel?: number
  /** User marked "heute eine Übung/Bestzeit gesteigert" — the honest bridge to
   *  mechanical overload without an exercise database. */
  prBeaten?: boolean
  /** Optional mood tap before the session (1–5). */
  moodBefore?: 1 | 2 | 3 | 4 | 5
  /** Optional mood tap after the session (1–5). Affective response predicts
   *  adherence 6–12 months out (PMC2390920). */
  moodAfter?: 1 | 2 | 3 | 4 | 5
}

/**
 * A "Life happened" pause (Gentler Streak): a manual switch for illness/travel.
 * Days inside a pause count as neither active nor inactive — decay and streak
 * freeze without guilt. `to === null` means the pause is still active.
 */
export interface Pause {
  /** ISO date the pause began. */
  from: string
  /** ISO date the pause ended, or null while still active. */
  to: string | null
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
  /** ISO-week keys for which the weekly progress bonus (beating last week's
   *  load) has already been granted — same once-per-week guarantee. */
  progressWeeks: string[]
  /** "Life happened" pauses that freeze decay and streaks. */
  pauses: Pause[]
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
