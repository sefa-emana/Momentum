import { describe, expect, it } from 'vitest'
import { dailySeries, totalMinutes, totalXp, typeBreakdown } from './stats'
import { makeWorkout, dayOffset } from './testHelpers'

const BASE = '2026-06-01'

describe('dailySeries', () => {
  it('returns one point per day, oldest first', () => {
    const series = dailySeries([], BASE, 7)
    expect(series).toHaveLength(7)
    expect(new Date(series[0].date).getTime()).toBeLessThan(
      new Date(series[6].date).getTime(),
    )
  })

  it('aggregates XP and counts into the right day', () => {
    const workouts = [
      makeWorkout(dayOffset(BASE, 6), { xpEarned: 50 }),
      makeWorkout(dayOffset(BASE, 6), { xpEarned: 30 }),
    ]
    const series = dailySeries(workouts, dayOffset(BASE, 6), 7)
    const today = series[series.length - 1]
    expect(today.xp).toBe(80)
    expect(today.count).toBe(2)
  })
})

describe('totals', () => {
  it('sums XP', () => {
    const workouts = [
      makeWorkout(BASE, { xpEarned: 50 }),
      makeWorkout(BASE, { xpEarned: 70 }),
    ]
    expect(totalXp(workouts)).toBe(120)
  })

  it('sums minutes', () => {
    const workouts = [
      makeWorkout(BASE, { durationMin: 30 }),
      makeWorkout(BASE, { durationMin: 45 }),
    ]
    expect(totalMinutes(workouts)).toBe(75)
  })
})

describe('typeBreakdown', () => {
  it('groups by type, sorted by count', () => {
    const workouts = [
      makeWorkout(BASE, { type: 'strength' }),
      makeWorkout(BASE, { type: 'strength' }),
      makeWorkout(BASE, { type: 'cardio' }),
    ]
    const breakdown = typeBreakdown(workouts)
    expect(breakdown[0].type).toBe('strength')
    expect(breakdown[0].count).toBe(2)
    expect(breakdown[1].type).toBe('cardio')
  })
})
