import { describe, expect, it } from 'vitest'
import {
  applyDecay,
  computeMomentum,
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

  it('decays after a period of inactivity', () => {
    const built = [0, 1, 2, 3, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    const atPeak = computeMomentum(built, dayOffset(BASE, 4))
    const afterRest = computeMomentum(built, dayOffset(BASE, 8))
    expect(afterRest).toBeLessThan(atPeak)
    expect(afterRest).toBeGreaterThanOrEqual(MOMENTUM_FLOOR)
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

  it('rewards a comeback more than a normal session', () => {
    // Normal: two consecutive days.
    const normal = computeMomentum(
      [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 1))],
      dayOffset(BASE, 1),
    )
    // Comeback: a session, a long gap, then a session.
    const comeback = computeMomentum(
      [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 6))],
      dayOffset(BASE, 6),
    )
    // Comeback boost (25) exceeds the normal gain (15) from the same floor.
    expect(comeback).toBeGreaterThan(normal)
  })
})

describe('momentumGainFor', () => {
  it('returns the base gain for a fresh start', () => {
    expect(momentumGainFor(null, BASE)).toBe(15)
  })

  it('returns the comeback gain after a lapse', () => {
    expect(momentumGainFor(dayOffset(BASE, 0), dayOffset(BASE, 5))).toBe(25)
  })

  it('returns the base gain for a short gap', () => {
    expect(momentumGainFor(dayOffset(BASE, 0), dayOffset(BASE, 1))).toBe(15)
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
