/**
 * Momentum — the evidence-based "Rückfall" (relapse) mechanic, now with the
 * forgiveness layer (Rest Shields, earn-back comebacks, "Life happened" pauses).
 *
 * Momentum is computed as a *pure fold* over the full workout history rather
 * than stored imperatively. This makes it deterministic and trivial to test:
 * the same history + pauses + clock always yields the same value.
 *
 * Design (see docs/PSYCHOLOGY.md):
 *  - continuous 0–100 scale, never a binary streak break
 *  - one full rest day causes zero decay (grace period)
 *  - Rest Shields silently absorb further decay days (Duolingo streak-freeze):
 *    2 per run, +1 per 4 active days, capped at 2
 *  - pauses freeze decay entirely (paused days are neither active nor inactive)
 *  - decay is gentle then accelerating, but bounded by a floor
 *  - returning after a lapse grants an *earned-back* comeback boost that scales
 *    with the momentum the lapse actually cost
 */
import {
  COMEBACK_GAIN_MAX,
  COMEBACK_GAP_DAYS,
  MAX_SHIELDS,
  MOMENTUM_DECAY_EXP,
  MOMENTUM_DECAY_K,
  MOMENTUM_FLOOR,
  MOMENTUM_GAIN,
  MOMENTUM_GRACE_DAYS,
  MOMENTUM_MAX,
  SHIELD_EARN_ACTIVE_DAYS,
  SHIELD_START,
} from './constants'
import { daysBetween, pausedDaysBetween, toEpoch } from './dates'
import type { MomentumTier, Pause, Workout } from './types'

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

function clampMomentum(v: number): number {
  return Math.max(MOMENTUM_FLOOR, Math.min(MOMENTUM_MAX, v))
}

/** Earn-back comeback gain from the momentum a lapse actually cost. */
export function comebackGain(decayLost: number): number {
  const raw = MOMENTUM_GAIN + Math.round(0.5 * Math.max(0, decayLost))
  return Math.max(MOMENTUM_GAIN, Math.min(COMEBACK_GAIN_MAX, raw))
}

/** Result of a single pass of the momentum fold as of `now`. */
export interface MomentumDetail {
  /** Rounded 0–100 momentum. */
  momentum: number
  /** Rest Shields still banked after absorbing any ongoing lapse. */
  shieldsRemaining: number
  /** Total shields consumed across the whole history (for stats/tests). */
  shieldsUsedTotal: number
  /** Momentum a workout logged *right now* would gain (for reward previews). */
  gain: number
  /** Whether logging right now would count as a comeback (gap ≥ threshold). */
  isComeback: boolean
}

/**
 * The single pure fold. Every public momentum function is a thin wrapper so the
 * fold runs exactly once per query. Shields and decay are handled inline:
 *
 *  - a gap's *inactive days* = effectiveGap − 1 (today/return day is active)
 *  - the grace day is always free; each further decay day can be absorbed by one
 *    banked shield BEFORE the decay curve is applied
 *  - a shield is earned every `SHIELD_EARN_ACTIVE_DAYS` active days (cap `MAX`)
 *  - a comeback that finds momentum already at the floor is a *new run*: the
 *    shield bank refills to `SHIELD_START`
 */
function foldMomentum(
  workouts: Workout[],
  pauses: Pause[],
  now: string | Date,
): MomentumDetail {
  const sorted = [...workouts].sort((a, b) => toEpoch(a.date) - toEpoch(b.date))

  let momentum = 0
  let prevDate: string | null = null
  let shields = SHIELD_START
  let shieldsUsedTotal = 0
  let activeSinceEarn = 0

  for (const w of sorted) {
    if (prevDate !== null) {
      const rawGap = daysBetween(prevDate, w.date)
      // Only the first session of a day boosts momentum.
      if (rawGap <= 0) continue

      const gap = Math.max(1, rawGap - pausedDaysBetween(prevDate, w.date, pauses))
      const inactiveDays = gap - 1
      const beyondGrace = Math.max(0, inactiveDays - MOMENTUM_GRACE_DAYS)
      const consumed = Math.min(shields, beyondGrace)
      shields -= consumed
      shieldsUsedTotal += consumed

      const before = momentum
      momentum = applyDecay(momentum, inactiveDays - consumed)
      const decayLost = before - momentum

      const comeback = gap >= COMEBACK_GAP_DAYS
      if (comeback && momentum <= MOMENTUM_FLOOR) {
        // The run bottomed out; this return starts a fresh run with full shields.
        shields = SHIELD_START
        activeSinceEarn = 0
      }
      const gainAmt = comeback ? comebackGain(decayLost) : MOMENTUM_GAIN
      momentum = clampMomentum(momentum + gainAmt)
    } else {
      momentum = clampMomentum(MOMENTUM_GAIN)
    }

    prevDate = w.date
    activeSinceEarn += 1
    if (activeSinceEarn >= SHIELD_EARN_ACTIVE_DAYS) {
      activeSinceEarn = 0
      shields = Math.min(MAX_SHIELDS, shields + 1)
    }
  }

  // Decay from the last workout up to now, absorbing with shields exactly as a
  // real return would — so the displayed momentum/shields already reflect any
  // ongoing lapse. Also preview the gain a workout logged right now would earn.
  let gain = MOMENTUM_GAIN
  let isComeback = false
  if (prevDate !== null) {
    const rawGap = Math.max(0, daysBetween(prevDate, now))
    const gap = Math.max(0, rawGap - pausedDaysBetween(prevDate, now, pauses))
    const inactiveDays = Math.max(0, gap - 1)
    const beyondGrace = Math.max(0, inactiveDays - MOMENTUM_GRACE_DAYS)
    const consumed = Math.min(shields, beyondGrace)
    shields -= consumed
    shieldsUsedTotal += consumed

    const before = momentum
    momentum = applyDecay(momentum, inactiveDays - consumed)
    const decayLostToNow = before - momentum

    isComeback = gap >= COMEBACK_GAP_DAYS
    gain = isComeback ? comebackGain(decayLostToNow) : MOMENTUM_GAIN
  }

  return {
    momentum: Math.round(momentum),
    shieldsRemaining: shields,
    shieldsUsedTotal,
    gain,
    isComeback,
  }
}

/**
 * Compute current momentum + banked shields from the full history as of `now`,
 * running the fold a single time. Pauses freeze decay for their duration.
 */
export function computeMomentumDetail(
  workouts: Workout[],
  pauses: Pause[],
  now: string | Date,
): MomentumDetail {
  if (workouts.length === 0) {
    return { momentum: 0, shieldsRemaining: SHIELD_START, shieldsUsedTotal: 0, gain: MOMENTUM_GAIN, isComeback: false }
  }
  return foldMomentum(workouts, pauses, now)
}

/**
 * Compute current momentum from the full workout history as of `now`.
 * Backwards-compatible wrapper (no pauses) so existing callers/tests compile.
 */
export function computeMomentum(workouts: Workout[], now: string | Date): number {
  return computeMomentumDetail(workouts, [], now).momentum
}

/** Rest Shields available right now, and how many the history has consumed. */
export function computeShields(
  workouts: Workout[],
  now: string | Date,
): { remaining: number; usedTotal: number } {
  const detail = computeMomentumDetail(workouts, [], now)
  return { remaining: detail.shieldsRemaining, usedTotal: detail.shieldsUsedTotal }
}

/** Momentum earned by logging *right now*, given the history + pauses — used to
 *  preview/animate the reward. Includes the earn-back comeback scaling. */
export function momentumGainFor(
  workouts: Workout[],
  now: string | Date,
  pauses: Pause[] = [],
): number {
  return computeMomentumDetail(workouts, pauses, now).gain
}

/** Whether logging right now would count as a comeback (gap ≥ threshold). */
export function isComebackNow(
  workouts: Workout[],
  now: string | Date,
  pauses: Pause[] = [],
): boolean {
  return computeMomentumDetail(workouts, pauses, now).isComeback
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
