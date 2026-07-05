/**
 * Mastery tracks — a *per-workout-type* competence display (Thema 3, endgame).
 *
 * Each discipline (Kraft, Cardio, Mobility …) has its own progression, so a
 * high-level user who tries a new type still gets an early, motivating climb
 * (Duolingo day-one-achievement evidence: 33% vs. 20% retention). Deliberately
 * NO XP coupling — mastery is identity/competence, not currency, which avoids
 * reward inflation (the S-curve leitplanke).
 *
 * Curve: cumulative sessions to *reach* level L = round(3 · (L-1)^1.6). Early
 * levels come fast (L2 at 3 sessions, ~L5 by ~25), then stretch out. Display is
 * capped at level 20.
 */
import type { Workout, WorkoutType } from './types'

/** Highest mastery level shown. */
export const MASTERY_MAX_LEVEL = 20

/** Cumulative sessions required to *reach* mastery level `level` (L1 = 0). */
export function masterySessionsToReach(level: number): number {
  if (level <= 1) return 0
  return Math.round(3 * Math.pow(level - 1, 1.6))
}

export interface MasteryInfo {
  /** Current mastery level (1–20). */
  level: number
  /** Sessions accumulated within the current level. */
  sessionsIntoLevel: number
  /** Sessions needed to advance from the current level to the next (0 at cap). */
  sessionsForNextLevel: number
  /** 0–1 progress through the current level (1 at the cap). */
  progress: number
  /** Total sessions logged for this type. */
  totalSessions: number
  /** Total minutes logged for this type. */
  totalMinutes: number
}

/** Mastery state for a given workout type, derived purely from the history. */
export function masteryFor(workouts: Workout[], type: WorkoutType): MasteryInfo {
  let totalSessions = 0
  let totalMinutes = 0
  for (const w of workouts) {
    if (w.type !== type) continue
    totalSessions += 1
    totalMinutes += w.durationMin
  }

  let level = 1
  while (
    level < MASTERY_MAX_LEVEL &&
    masterySessionsToReach(level + 1) <= totalSessions
  ) {
    level += 1
  }

  const floor = masterySessionsToReach(level)
  const ceil = masterySessionsToReach(level + 1)
  const sessionsForNextLevel = level >= MASTERY_MAX_LEVEL ? 0 : ceil - floor
  const sessionsIntoLevel = totalSessions - floor
  const progress =
    sessionsForNextLevel <= 0
      ? 1
      : Math.max(0, Math.min(1, sessionsIntoLevel / sessionsForNextLevel))

  return {
    level,
    sessionsIntoLevel,
    sessionsForNextLevel,
    progress,
    totalSessions,
    totalMinutes,
  }
}

/** German rank name for a mastery level band (identity, not a number). */
export function masteryRank(level: number): string {
  if (level >= 15) return 'Legende'
  if (level >= 10) return 'Meister'
  if (level >= 7) return 'Stark'
  if (level >= 4) return 'Solide'
  if (level >= 2) return 'Lernend'
  return 'Einsteiger'
}

/** Number of workout types that have reached at least the given mastery level. */
export function typesAtMasteryLevel(
  workouts: Workout[],
  types: readonly WorkoutType[],
  minLevel: number,
): number {
  let n = 0
  for (const t of types) {
    if (masteryFor(workouts, t).level >= minLevel) n += 1
  }
  return n
}
