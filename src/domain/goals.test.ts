import { describe, expect, it } from 'vitest'
import { suggestWeeklyGoal, weekProgress } from './goals'
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

describe('suggestWeeklyGoal', () => {
  // "now" is 4 weeks after MONDAY, so the four completed weeks before the
  // current one start at day offsets 0, 7, 14 and 21.
  const NOW = dayOffset(MONDAY, 28)

  /** Put `count` sessions in the week beginning `weekStartOffset` days after MONDAY. */
  function weekOf(weekStartOffset: number, count: number) {
    return Array.from({ length: count }, (_, i) =>
      makeWorkout(dayOffset(MONDAY, weekStartOffset + i)),
    )
  }

  it('raises the goal when at least 3 of the last 4 weeks hit it', () => {
    const w = [...weekOf(0, 3), ...weekOf(7, 3), ...weekOf(14, 3)]
    expect(suggestWeeklyGoal(w, 3, NOW)).toEqual({ suggestion: 4, reason: 'raise' })
  })

  it('caps a raise at 6 to protect a rest day', () => {
    const w = [...weekOf(0, 6), ...weekOf(7, 6), ...weekOf(14, 6), ...weekOf(21, 6)]
    expect(suggestWeeklyGoal(w, 6, NOW)).toEqual({ suggestion: 6, reason: 'raise' })
  })

  it('lowers the goal when at most 1 of the last 4 weeks hit it', () => {
    const w = weekOf(0, 3) // only one week meets a goal of 3
    expect(suggestWeeklyGoal(w, 3, NOW)).toEqual({ suggestion: 2, reason: 'lower' })
  })

  it('floors a lower at 2', () => {
    expect(suggestWeeklyGoal([], 2, NOW)).toEqual({ suggestion: 2, reason: 'lower' })
  })

  it('keeps the goal on a middling 2 of 4', () => {
    const w = [...weekOf(0, 3), ...weekOf(7, 3)]
    expect(suggestWeeklyGoal(w, 3, NOW)).toEqual({ suggestion: 3, reason: 'keep' })
  })

  it('ignores the current (incomplete) week', () => {
    // Sessions only in the current week must not count as completed-week hits.
    const w = weekOf(28, 5)
    expect(suggestWeeklyGoal(w, 3, NOW)).toEqual({ suggestion: 2, reason: 'lower' })
  })
})
