/**
 * Momentum — the evidence-based "Rückfall" (relapse) mechanic.
 *
 * Momentum is computed as a *pure fold* over the full workout history rather
 * than stored imperatively. This makes it deterministic and trivial to test:
 * the same history + clock always yields the same value.
 *
 * Design (see docs/PSYCHOLOGY.md):
 *  - continuous 0–100 scale, never a binary streak break
 *  - one full rest day causes zero decay (grace period)
 *  - decay is gentle then accelerating, but bounded by a floor
 *  - returning after a lapse grants a larger "comeback" boost
 */
import {
  COMEBACK_GAIN,
  COMEBACK_GAP_DAYS,
  MOMENTUM_DECAY_EXP,
  MOMENTUM_DECAY_K,
  MOMENTUM_FLOOR,
  MOMENTUM_GAIN,
  MOMENTUM_GRACE_DAYS,
  MOMENTUM_MAX,
} from './constants'
import { daysBetween } from './dates'
import type { MomentumTier, Workout } from './types'

/** Points lost after `inactiveDays` days without a workout. */
export function decayAmount(inactiveDays: number): number {
  const effective = inactiveDays - MOMENTUM_GRACE_DAYS
  if (effective <= 0) return 0
  return MOMENTUM_DECAY_K * Math.pow(effective, MOMENTUM_DECAY_EXP)
}

/** Apply decay to a momentum value for a period of inactivity. */
export function applyDecay(momentum: number, inactiveDays: number): number {
  const decayed = momentum - decayAmount(inactiveDays)
  return Math.max(MOMENTUM_FLOOR, Math.min(MOMENTUM_MAX, decayed))
}

/**
 * Compute current momentum from the full workout history as of `now`.
 * Workouts may be unsorted; ties on the same day are collapsed to a single
 * daily boost so multiple sessions in a day don't inflate momentum.
 */
export function computeMomentum(workouts: Workout[], now: string | Date): number {
  if (workouts.length === 0) return 0

  const sorted = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  let momentum = 0
  let prevDate: string | null = null

  for (const w of sorted) {
    if (prevDate !== null) {
      const gap = daysBetween(prevDate, w.date)
      // Only the first session of a day boosts momentum.
      if (gap <= 0) continue
      momentum = applyDecay(momentum, gap)
      const gain = gap >= COMEBACK_GAP_DAYS ? COMEBACK_GAIN : MOMENTUM_GAIN
      momentum = Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_FLOOR, momentum + gain))
    } else {
      momentum = Math.min(MOMENTUM_MAX, Math.max(MOMENTUM_FLOOR, momentum + MOMENTUM_GAIN))
    }
    prevDate = w.date
  }

  // Decay from the last workout up to now.
  if (prevDate !== null) {
    const gap = Math.max(0, daysBetween(prevDate, now))
    momentum = applyDecay(momentum, gap)
  }

  return Math.round(momentum)
}

/** Momentum earned by logging *right now*, given current momentum and the
 *  gap since the last workout — used to preview/animate the reward. */
export function momentumGainFor(lastWorkoutDate: string | null, now: string | Date): number {
  if (lastWorkoutDate === null) return MOMENTUM_GAIN
  const gap = Math.max(0, daysBetween(lastWorkoutDate, now))
  return gap >= COMEBACK_GAP_DAYS ? COMEBACK_GAIN : MOMENTUM_GAIN
}

export function momentumTier(momentum: number): MomentumTier {
  if (momentum >= 75) return 'blazing'
  if (momentum >= 50) return 'hot'
  if (momentum >= 25) return 'warm'
  return 'cold'
}

export const TIER_META: Record<
  MomentumTier,
  { label: string; color: string; message: string }
> = {
  cold: {
    label: 'Abgekühlt',
    color: '#5b7bb4',
    message: 'Zeit für ein Comeback — eine kleine Einheit reicht.',
  },
  warm: {
    label: 'In Bewegung',
    color: '#3bb6a6',
    message: 'Du baust Momentum auf. Dranbleiben!',
  },
  hot: {
    label: 'Heiß',
    color: '#f0a33b',
    message: 'Starkes Momentum — du bist im Flow.',
  },
  blazing: {
    label: 'In der Zone',
    color: '#f2543d',
    message: 'Maximales Momentum! Halte die Hitze.',
  },
}
