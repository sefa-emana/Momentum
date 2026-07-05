/**
 * XP awarding and level progression.
 */
import {
  LEVEL_XP_COEF,
  LEVEL_XP_EXP,
  MOMENTUM_XP_DIVISOR,
  SAME_DAY_FACTORS,
  SAME_DAY_MIN_FACTOR,
  XP_BASE,
  XP_DURATION_CAP_MIN,
  XP_PER_MIN,
} from './constants'
import type { Intensity, LevelInfo } from './types'

export interface WorkoutXpInput {
  durationMin: number
  intensity: Intensity
  /** Current momentum (0–100) at the moment of logging. */
  momentum: number
  /** How many workouts are already logged for the same calendar day. */
  priorSameDayCount: number
}

/**
 * XP for a single workout.
 *
 * effort = base + cappedMinutes * intensityRate, scaled down for repeated
 * same-day sessions (anti-gaming), plus a momentum bonus so consistency
 * compounds into faster progression.
 */
export function xpForWorkout({
  durationMin,
  intensity,
  momentum,
  priorSameDayCount,
}: WorkoutXpInput): number {
  const minutes = Math.max(0, Math.min(durationMin, XP_DURATION_CAP_MIN))
  const effort = XP_BASE + minutes * XP_PER_MIN[intensity]

  const factor =
    SAME_DAY_FACTORS[priorSameDayCount] ?? SAME_DAY_MIN_FACTOR

  const momentumBonus = Math.floor(Math.max(0, momentum) / MOMENTUM_XP_DIVISOR)

  return Math.max(1, Math.round(effort * factor) + momentumBonus)
}

/** Deterministic FNV-1a hash of a string → unsigned 32-bit int. */
export function stableHash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Whether a workout earns the ethical „Überraschungsbonus". Triggered by a
 * stable hash of the (preserved) workout id ≈ 1 in 8 — deterministic and
 * replay-safe, never `Math.random`. Always additive, never punishing.
 */
export function surpriseBonusFor(workoutId: string): boolean {
  return stableHash(workoutId) % 8 === 0
}

/** Total XP required to *reach* the given level (level 1 = 0 XP). */
export function totalXpToReachLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(LEVEL_XP_COEF * Math.pow(level - 1, LEVEL_XP_EXP))
}

/** Resolve a total XP amount into level + progress info. */
export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp))

  // Levels grow monotonically; a simple forward scan is plenty fast for the
  // ranges a human reaches, and avoids floating-point inversion errors.
  let level = 1
  while (totalXpToReachLevel(level + 1) <= xp) {
    level += 1
  }

  const floorXp = totalXpToReachLevel(level)
  const ceilXp = totalXpToReachLevel(level + 1)
  const xpForNextLevel = ceilXp - floorXp
  const xpIntoLevel = xp - floorXp

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel === 0 ? 0 : xpIntoLevel / xpForNextLevel,
    totalXp: xp,
  }
}
