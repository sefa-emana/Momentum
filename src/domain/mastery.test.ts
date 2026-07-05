import { describe, expect, it } from 'vitest'
import {
  MASTERY_MAX_LEVEL,
  masteryFor,
  masteryRank,
  masterySessionsToReach,
  typesAtMasteryLevel,
} from './mastery'
import { WORKOUT_TYPES } from './constants'
import { makeWorkout } from './testHelpers'
import type { WorkoutType } from './types'

const BASE = '2026-06-01'

/** N sessions of a single type in one place (dates irrelevant to mastery). */
function sessionsOf(type: WorkoutType, n: number, durationMin = 30) {
  return Array.from({ length: n }, () => makeWorkout(BASE, { type, durationMin }))
}

describe('masterySessionsToReach', () => {
  it('level 1 requires 0 sessions', () => {
    expect(masterySessionsToReach(1)).toBe(0)
    expect(masterySessionsToReach(0)).toBe(0)
  })

  it('matches the designed curve (fast early, stretched later)', () => {
    expect(masterySessionsToReach(2)).toBe(3)
    expect(masterySessionsToReach(3)).toBe(9)
    expect(masterySessionsToReach(4)).toBe(17)
  })

  it('is strictly increasing', () => {
    for (let l = 1; l < MASTERY_MAX_LEVEL; l++) {
      expect(masterySessionsToReach(l + 1)).toBeGreaterThan(masterySessionsToReach(l))
    }
  })
})

describe('masteryFor', () => {
  it('starts at level 1 with no sessions of that type', () => {
    const info = masteryFor([], 'strength')
    expect(info.level).toBe(1)
    expect(info.totalSessions).toBe(0)
    expect(info.progress).toBe(0)
  })

  it('levels up exactly at the cumulative threshold', () => {
    expect(masteryFor(sessionsOf('strength', 2), 'strength').level).toBe(1)
    expect(masteryFor(sessionsOf('strength', 3), 'strength').level).toBe(2)
    expect(masteryFor(sessionsOf('strength', 9), 'strength').level).toBe(3)
  })

  it('only counts sessions of the requested type', () => {
    const mixed = [...sessionsOf('strength', 3), ...sessionsOf('cardio', 5)]
    expect(masteryFor(mixed, 'strength').totalSessions).toBe(3)
    expect(masteryFor(mixed, 'cardio').totalSessions).toBe(5)
    expect(masteryFor(mixed, 'mobility').totalSessions).toBe(0)
  })

  it('accumulates total minutes and reports in-level progress', () => {
    const info = masteryFor(sessionsOf('strength', 3, 40), 'strength')
    expect(info.totalMinutes).toBe(120)
    expect(info.level).toBe(2)
    // 3 sessions = exactly at floor of level 2 → 0 into the level.
    expect(info.sessionsIntoLevel).toBe(0)
    expect(info.progress).toBeGreaterThanOrEqual(0)
    expect(info.progress).toBeLessThanOrEqual(1)
  })

  it('caps at MASTERY_MAX_LEVEL with full progress', () => {
    const many = sessionsOf('cardio', 5000)
    const info = masteryFor(many, 'cardio')
    expect(info.level).toBe(MASTERY_MAX_LEVEL)
    expect(info.sessionsForNextLevel).toBe(0)
    expect(info.progress).toBe(1)
  })
})

describe('masteryRank', () => {
  it('maps levels to identity bands', () => {
    expect(masteryRank(1)).toBe('Einsteiger')
    expect(masteryRank(2)).toBe('Lernend')
    expect(masteryRank(4)).toBe('Solide')
    expect(masteryRank(7)).toBe('Stark')
    expect(masteryRank(10)).toBe('Meister')
    expect(masteryRank(15)).toBe('Legende')
    expect(masteryRank(20)).toBe('Legende')
  })
})

describe('typesAtMasteryLevel', () => {
  it('counts distinct types that reached the minimum level', () => {
    const workouts = [
      ...sessionsOf('strength', 3), // level 2
      ...sessionsOf('cardio', 9), // level 3
      ...sessionsOf('mobility', 1), // level 1
    ]
    expect(typesAtMasteryLevel(workouts, WORKOUT_TYPES, 2)).toBe(2)
    expect(typesAtMasteryLevel(workouts, WORKOUT_TYPES, 3)).toBe(1)
    expect(typesAtMasteryLevel(workouts, WORKOUT_TYPES, 5)).toBe(0)
  })
})
