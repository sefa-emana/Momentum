/**
 * Core domain types for Momentum.
 *
 * All dates are stored as ISO strings (`YYYY-MM-DD...`) so state serialises
 * cleanly to localStorage. Domain functions accept explicit `now` values to
 * stay pure and fully testable.
 */

import type { ExerciseDef } from './exercises'

export type WorkoutType =
  | 'strength'
  | 'cardio'
  | 'mobility'
  | 'sport'
  | 'other'

export type Intensity = 'light' | 'moderate' | 'vigorous'

/**
 * A single logged set (Progression Engine v2). All measure fields are optional
 * so one shape covers strength (weight/reps/rir), cardio (duration/distance/rpe)
 * and bodyweight (reps only). `kind` drives progression math: `warmup` sets are
 * excluded from e1RM / PR / volume, `failure` sets count as working sets.
 */
export interface SetEntry {
  /** External load in kg (strength). Absent for bodyweight/cardio. */
  weightKg?: number
  reps?: number
  /** Reps-in-reserve (autoregulation signal; 0 ≈ to failure). */
  rir?: number
  /** Cardio duration in seconds. */
  durationSec?: number
  /** Cardio distance in metres. */
  distanceM?: number
  /** Cardio rate of perceived exertion (Borg CR10). */
  rpe?: number
  kind: 'normal' | 'warmup' | 'failure'
}

/** All sets logged for one exercise within a single workout. */
export interface ExerciseEntry {
  exerciseId: string
  sets: SetEntry[]
}

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
  /** Optional per-exercise set log (Progression Engine v2). Absent on older
   *  workouts, which stay 100% valid — the session-level fields above remain the
   *  source for Foster sRPE/momentum; entries add progression intelligence. */
  entries?: ExerciseEntry[]
  /** True when the workout was logged with a past date (date < today−1). A
   *  backfilled workout can SET progression baselines but never yields
   *  celebration flags or bonus XP (anti-exploit). Preserved through replay and
   *  edits (an edited workout keeps its original flag). */
  backfilled?: boolean
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

/**
 * A weekly quest the user has opted into. `week` is the ISO-week key the quest
 * belongs to; `acceptedAt` is the acceptance timestamp — a workout only counts
 * toward completion if it is logged at/after this moment, which keeps live and
 * replayed state identical (both compare persisted facts only).
 */
export interface AcceptedQuest {
  id: string
  week: string
  acceptedAt: string
}

/** A completed quest, tracked once per (week, id) so its bonus is granted once. */
export interface QuestRef {
  id: string
  week: string
}

export interface WeeklyGoal {
  /** Target number of workouts per ISO week. */
  workoutsPerWeek: number
}

/**
 * How the user primarily trains — set during onboarding. Drives the default
 * logging mode: Kraft/Gemischt default to Satz-Modus (per-set logging), Cardio
 * defaults to the lighter duration-only quick log. The user can always switch
 * per session, so this is only a sensible starting point (autonomy preserved).
 */
export type TrainingFocus = 'strength' | 'cardio' | 'mixed'

export interface Settings {
  weeklyGoal: WeeklyGoal
  /** User-facing display name. */
  name: string
  reducedMotion: boolean
  /** ISO timestamp of the last data export ("Backup"). Undefined = never.
   *  Drives the gentle backup-freshness nudge (data lives only on this device). */
  lastBackupAt?: string
  /** Primary training style (onboarding step 3). Defaults to 'mixed' when unset,
   *  so Satz-Modus stays the sensible default for strength sessions. */
  trainingFocus?: TrainingFocus
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
  /** Weekly quests the user has opted into (raw user input, passed through
   *  replay like settings/pauses). */
  acceptedQuests: AcceptedQuest[]
  /** Completed quests — derived accumulator, re-derived by rebuildFromWorkouts
   *  exactly like `progressWeeks`, so each quest bonus is granted at most once. */
  questsDone: QuestRef[]
  unlocked: UnlockedAchievement[]
  settings: Settings
  /** User-defined custom exercises (ids prefixed 'custom-'). Raw user data,
   *  carried through replay like settings/pauses — not a derived accumulator. */
  customExercises: ExerciseDef[]
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
