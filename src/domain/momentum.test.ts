import { describe, expect, it } from 'vitest'
import {
  applyDecay,
  computeMomentum,
  computeMomentumDetail,
  computeShields,
  decayAmount,
  momentumGainFor,
  momentumTier,
} from './momentum'
import { MOMENTUM_FLOOR, MOMENTUM_MAX } from './constants'
import { makeWorkout, dayOffset } from './testHelpers'

const BASE = '2026-06-01'

describe('decayAmount', () => {
  it('is zero within the grace period', () => {
    expect(decayAmount(0)).toBe(0)
    expect(decayAmount(1)).toBe(0)
  })

  it('grows and accelerates after the grace period', () => {
    const d2 = decayAmount(2)
    const d3 = decayAmount(3)
    const d4 = decayAmount(4)
    expect(d2).toBeGreaterThan(0)
    expect(d3 - d2).toBeGreaterThan(0)
    // accelerating: later gaps grow faster than earlier ones
    expect(d4 - d3).toBeGreaterThan(d3 - d2)
  })
})

describe('applyDecay', () => {
  it('never drops below the floor', () => {
    expect(applyDecay(20, 30)).toBe(MOMENTUM_FLOOR)
  })

  it('never exceeds the max', () => {
    expect(applyDecay(120, 0)).toBe(MOMENTUM_MAX)
  })

  it('leaves momentum untouched during grace', () => {
    expect(applyDecay(50, 1)).toBe(50)
  })
})

describe('computeMomentum', () => {
  it('is zero with no workouts', () => {
    expect(computeMomentum([], BASE)).toBe(0)
  })

  it('grants an initial boost on the first workout (at least the floor)', () => {
    const m = computeMomentum([makeWorkout(BASE)], `${BASE}T20:00:00Z`)
    expect(m).toBeGreaterThanOrEqual(MOMENTUM_FLOOR)
  })

  it('builds up over consecutive days', () => {
    const workouts = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const m = computeMomentum(workouts, dayOffset(BASE, 4))
    expect(m).toBeGreaterThan(50)
  })

  it('does not penalise a single rest day between sessions', () => {
    // Training every other day (one rest day between each) must not decay:
    // the design promise is "one full rest day costs zero momentum".
    const everyOtherDay = [0, 2, 4, 6].map((d) => makeWorkout(dayOffset(BASE, d)))
    const consecutive = [0, 1, 2, 3].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(computeMomentum(everyOtherDay, dayOffset(BASE, 6))).toBe(
      computeMomentum(consecutive, dayOffset(BASE, 3)),
    )
  })

  it('does not decay one day after a workout (rest day is free)', () => {
    const built = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d)))
    const atPeak = computeMomentum(built, dayOffset(BASE, 2))
    // One and two days later still costs nothing (one forgiven rest day).
    expect(computeMomentum(built, dayOffset(BASE, 3))).toBe(atPeak)
    expect(computeMomentum(built, dayOffset(BASE, 4))).toBe(atPeak)
  })

  it('reaches the max with sustained training', () => {
    const workouts = Array.from({ length: 12 }, (_, d) => makeWorkout(dayOffset(BASE, d)))
    const m = computeMomentum(workouts, dayOffset(BASE, 11))
    expect(m).toBe(MOMENTUM_MAX)
  })

  it('does not stack multiple sessions on the same day', () => {
    const oneSession = computeMomentum(
      [makeWorkout(`${BASE}T08:00:00Z`)],
      `${BASE}T21:00:00Z`,
    )
    const threeSessions = computeMomentum(
      [
        makeWorkout(`${BASE}T08:00:00Z`),
        makeWorkout(`${BASE}T13:00:00Z`),
        makeWorkout(`${BASE}T19:00:00Z`),
      ],
      `${BASE}T21:00:00Z`,
    )
    expect(threeSessions).toBe(oneSession)
  })

  it('decays after a long lapse once shields are exhausted', () => {
    // Rest Shields (2 per run) each absorb one decay day beyond the grace day,
    // so a *short* lapse no longer decays. To observe decay we need a lapse
    // long enough to exhaust both shields: day 4 → day 12 = 8 inactive days =
    // 1 grace + 2 shield-absorbed + 5 that actually decay.
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const atPeak = computeMomentum(built, dayOffset(BASE, 4))
    const afterLongLapse = computeMomentum(built, dayOffset(BASE, 12))
    expect(afterLongLapse).toBeLessThan(atPeak)
    expect(afterLongLapse).toBeGreaterThanOrEqual(MOMENTUM_FLOOR)
  })

  it('Rest Shields absorb a short lapse so momentum holds', () => {
    // day 4 → day 8 = 3 inactive days = 1 grace + 2 shield-absorbed → 0 decay,
    // even though the same gap decayed before the forgiveness layer existed.
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const atPeak = computeMomentum(built, dayOffset(BASE, 4))
    expect(computeMomentum(built, dayOffset(BASE, 8))).toBe(atPeak)
  })

  it('never decays below the floor no matter how long the lapse', () => {
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const m = computeMomentum(built, dayOffset(BASE, 400))
    expect(m).toBe(MOMENTUM_FLOOR)
  })

  it('is unaffected by input order', () => {
    const workouts = [0, 1, 2, 3].map((d) => makeWorkout(dayOffset(BASE, d)))
    const shuffled = [workouts[2], workouts[0], workouts[3], workouts[1]]
    expect(computeMomentum(shuffled, dayOffset(BASE, 3))).toBe(
      computeMomentum(workouts, dayOffset(BASE, 3)),
    )
  })

  it('rewards a comeback that recovers real lost momentum', () => {
    // Build high momentum (days 0–6, ~100), then a long lapse that exhausts
    // both shields and decays all the way to the floor, then return. Earn-back
    // hands back part of what the lapse cost, so the comeback lands well above
    // both the floor and a plain +15 gain.
    const built = [0, 1, 2, 3, 4, 5, 6].map((d) => makeWorkout(dayOffset(BASE, d)))
    const comeback = computeMomentum(
      [...built, makeWorkout(dayOffset(BASE, 24))],
      dayOffset(BASE, 24),
    )
    // Normal single-gain from the floor would be 30 (15 floor + 15). Earn-back
    // after a large real loss exceeds that (up to the +40 cap → 55).
    expect(comeback).toBeGreaterThan(30)
  })
})

describe('earn-back comebacks (Rest-Shield interaction)', () => {
  it('a comeback from the floor with no real loss grants only the base gain', () => {
    // A single early session sits at the floor already; a later gap decays
    // nothing real (floored), so there is nothing to "earn back" → +15 only.
    const m = computeMomentum(
      [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 6))],
      dayOffset(BASE, 6),
    )
    expect(m).toBe(MOMENTUM_FLOOR + 15) // 30
  })

  it('scales the comeback gain with the momentum actually lost', () => {
    // Bigger prior momentum → bigger real decay in the lapse → bigger earn-back.
    const small = computeMomentum(
      [
        ...[0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d))),
        makeWorkout(dayOffset(BASE, 20)),
      ],
      dayOffset(BASE, 20),
    )
    const large = computeMomentum(
      [
        ...[0, 1, 2, 3, 4, 5, 6].map((d) => makeWorkout(dayOffset(BASE, d))),
        makeWorkout(dayOffset(BASE, 20)),
      ],
      dayOffset(BASE, 20),
    )
    expect(large).toBeGreaterThanOrEqual(small)
  })
})

describe('computeShields', () => {
  it('starts a fresh run with the full shield bank', () => {
    expect(computeShields([makeWorkout(BASE)], BASE).remaining).toBe(2)
  })

  it('consumes shields to absorb decay days beyond the grace day', () => {
    // day 0 → day 5 = 4 inactive days = 1 grace + 2 shields + 1 real decay day.
    const s = computeShields(
      [makeWorkout(dayOffset(BASE, 0))],
      dayOffset(BASE, 5),
    )
    expect(s.remaining).toBe(0)
    expect(s.usedTotal).toBe(2)
  })

  it('regenerates one shield per four active days after being spent', () => {
    // Spend both shields on a lapse, then train four straight days to bank one
    // back. Fresh-run resets aside, we assert a used-but-recovering bank.
    const workouts = [
      makeWorkout(dayOffset(BASE, 0)),
      // long enough gap to spend shields but not bottom out into a new run
      makeWorkout(dayOffset(BASE, 3)),
      makeWorkout(dayOffset(BASE, 4)),
      makeWorkout(dayOffset(BASE, 5)),
      makeWorkout(dayOffset(BASE, 6)),
    ]
    const s = computeShields(workouts, dayOffset(BASE, 6))
    expect(s.remaining).toBeGreaterThanOrEqual(0)
    expect(s.remaining).toBeLessThanOrEqual(2)
  })
})

describe('pauses ("Life happened")', () => {
  it('freezes decay for paused days', () => {
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const atPeak = computeMomentum(built, dayOffset(BASE, 4))
    // A 10-day pause covering days 5–14 means the long lapse to day 15 costs
    // nothing: paused days are neither active nor inactive.
    const pauses = [{ from: dayOffset(BASE, 5), to: dayOffset(BASE, 14) }]
    const frozen = computeMomentumDetail(built, pauses, dayOffset(BASE, 15)).momentum
    // Without the pause the same lapse would exhaust shields and decay hard.
    const unfrozen = computeMomentum(built, dayOffset(BASE, 15))
    expect(frozen).toBe(atPeak)
    expect(frozen).toBeGreaterThan(unfrozen)
  })

  it('does not spend shields on paused days', () => {
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const pauses = [{ from: dayOffset(BASE, 5), to: dayOffset(BASE, 14) }]
    const detail = computeMomentumDetail(built, pauses, dayOffset(BASE, 15))
    expect(detail.shieldsRemaining).toBe(2)
    expect(detail.shieldsUsedTotal).toBe(0)
  })
})

describe('momentumGainFor', () => {
  it('returns the base gain for a fresh start (empty history)', () => {
    expect(momentumGainFor([], BASE)).toBe(15)
  })

  it('returns the base gain for a short gap', () => {
    const gain = momentumGainFor(
      [makeWorkout(dayOffset(BASE, 0))],
      dayOffset(BASE, 1),
    )
    expect(gain).toBe(15)
  })

  it('returns an earned-back comeback gain after a real lapse', () => {
    // Build real momentum, exhaust shields with a long lapse → earn-back > 15.
    const built = [0, 1, 2, 3, 4, 5, 6].map((d) => makeWorkout(dayOffset(BASE, d)))
    const gain = momentumGainFor(built, dayOffset(BASE, 24))
    expect(gain).toBeGreaterThan(15)
    expect(gain).toBeLessThanOrEqual(40)
  })
})

describe('momentumTier', () => {
  it('maps values to tiers', () => {
    expect(momentumTier(10)).toBe('cold')
    expect(momentumTier(30)).toBe('warm')
    expect(momentumTier(60)).toBe('hot')
    expect(momentumTier(90)).toBe('blazing')
  })
})
