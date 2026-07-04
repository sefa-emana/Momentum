import { describe, expect, it } from 'vitest'
import { weekProgress } from './goals'
import { makeWorkout, dayOffset } from './testHelpers'

// 2026-06-01 is a Monday.
const MONDAY = '2026-06-01'

describe('weekProgress', () => {
  it('counts workouts within the current week', () => {
    const workouts = [0, 1, 3].map((d) => makeWorkout(dayOffset(MONDAY, d)))
    const p = weekProgress(workouts, 4, dayOffset(MONDAY, 3))
    expect(p.completed).toBe(3)
    expect(p.target).toBe(4)
    expect(p.met).toBe(false)
    expect(p.ratio).toBeCloseTo(0.75, 5)
  })

  it('marks the goal as met', () => {
    const workouts = [0, 1, 2, 3].map((d) => makeWorkout(dayOffset(MONDAY, d)))
    const p = weekProgress(workouts, 4, dayOffset(MONDAY, 3))
    expect(p.met).toBe(true)
    expect(p.ratio).toBe(1)
  })

  it('excludes workouts from previous weeks', () => {
    const lastWeek = makeWorkout(dayOffset(MONDAY, -3))
    const thisWeek = makeWorkout(dayOffset(MONDAY, 1))
    const p = weekProgress([lastWeek, thisWeek], 4, dayOffset(MONDAY, 1))
    expect(p.completed).toBe(1)
  })

  it('clamps ratio at 1 when the goal is exceeded', () => {
    const workouts = [0, 1, 2, 3, 4, 5].map((d) => makeWorkout(dayOffset(MONDAY, d)))
    const p = weekProgress(workouts, 4, dayOffset(MONDAY, 5))
    expect(p.ratio).toBe(1)
  })

  it('produces a stable week key', () => {
    const p = weekProgress([], 4, MONDAY)
    expect(p.weekKey).toMatch(/^\d{4}-W\d{2}$/)
  })
})
