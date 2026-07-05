import { describe, expect, it } from 'vitest'
import { computeStreak, longestStreak, trainedToday } from './streak'
import { makeWorkout, dayOffset } from './testHelpers'

const BASE = '2026-06-01'

describe('computeStreak', () => {
  it('is zero with no workouts', () => {
    expect(computeStreak([], BASE)).toBe(0)
  })

  it('counts a single day trained today', () => {
    expect(computeStreak([makeWorkout(BASE)], BASE)).toBe(1)
  })

  it('counts consecutive days', () => {
    const workouts = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(computeStreak(workouts, dayOffset(BASE, 2))).toBe(3)
  })

  it('survives a single rest day (never miss twice)', () => {
    // trained day 0, 2, 4 (a rest day between each)
    const workouts = [0, 2, 4].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(computeStreak(workouts, dayOffset(BASE, 4))).toBe(3)
  })

  it('breaks when two days in a row are missed', () => {
    // trained day 0, then day 3 (days 1 & 2 both missed)
    const workouts = [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 3))]
    expect(computeStreak(workouts, dayOffset(BASE, 3))).toBe(1)
  })

  it('stays alive the day after training (today still open)', () => {
    const workouts = [makeWorkout(dayOffset(BASE, 0))]
    expect(computeStreak(workouts, dayOffset(BASE, 1))).toBe(1)
  })

  it('resets to zero after missing twice with no recent workout', () => {
    const workouts = [makeWorkout(dayOffset(BASE, 0))]
    expect(computeStreak(workouts, dayOffset(BASE, 5))).toBe(0)
  })

  it('collapses multiple sessions on one day into a single streak day', () => {
    const workouts = [
      makeWorkout(`${BASE}T08:00:00Z`),
      makeWorkout(`${BASE}T18:00:00Z`),
    ]
    expect(computeStreak(workouts, BASE)).toBe(1)
  })
})

describe('longestStreak', () => {
  it('finds the best run in history', () => {
    const workouts = [
      // run of 3 (days 0,1,2), gap, then run of 2 (days 6,7)
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 1)),
      makeWorkout(dayOffset(BASE, 2)),
      makeWorkout(dayOffset(BASE, 6)),
      makeWorkout(dayOffset(BASE, 7)),
    ]
    expect(longestStreak(workouts)).toBe(3)
  })

  it('is zero with no workouts', () => {
    expect(longestStreak([])).toBe(0)
  })
})

describe('trainedToday', () => {
  it('detects a workout today', () => {
    expect(trainedToday([makeWorkout(BASE)], `${BASE}T23:00:00Z`)).toBe(true)
  })

  it('is false when the last workout was yesterday', () => {
    expect(trainedToday([makeWorkout(dayOffset(BASE, 0))], dayOffset(BASE, 1))).toBe(false)
  })
})

describe('computeStreak with pauses ("Life happened")', () => {
  it('freezes the streak during a pause instead of breaking it', () => {
    // Trained day 0, then away days 1–9 (a pause), returning day 10. Without a
    // pause this two-in-a-row miss would break the streak; the pause freezes it.
    const workouts = [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 10))]
    const pauses = [{ from: dayOffset(BASE, 1), to: dayOffset(BASE, 9) }]
    expect(computeStreak(workouts, dayOffset(BASE, 10), pauses)).toBe(2)
  })

  it('keeps the current streak alive across an ongoing pause up to now', () => {
    // Trained day 0, pause is still active (to: null). Even though "now" is
    // days later, the paused days don't count so the streak survives.
    const workouts = [makeWorkout(dayOffset(BASE, 0))]
    const pauses = [{ from: dayOffset(BASE, 1), to: null }]
    expect(computeStreak(workouts, dayOffset(BASE, 8), pauses)).toBe(1)
  })

  it('still breaks on a real two-day miss outside any pause', () => {
    const workouts = [makeWorkout(dayOffset(BASE, 0)), makeWorkout(dayOffset(BASE, 3))]
    expect(computeStreak(workouts, dayOffset(BASE, 3), [])).toBe(1)
  })
})
