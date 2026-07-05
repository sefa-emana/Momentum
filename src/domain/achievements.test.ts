import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  EMPTY_ACHIEVEMENT_EXTRAS,
  newlyUnlocked,
  satisfiedAchievements,
  type AchievementContext,
} from './achievements'
import { makeWorkout, dayOffset } from './testHelpers'

const BASE = '2026-06-01'

function ctx(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    totalWorkouts: 0,
    currentStreak: 0,
    longestStreak: 0,
    level: 1,
    momentum: 0,
    weeklyGoalsMet: 0,
    distinctTypesThisWeek: 0,
    workouts: [],
    ...EMPTY_ACHIEVEMENT_EXTRAS,
    ...overrides,
  }
}

describe('achievement definitions', () => {
  it('all have unique ids and positive bonus XP', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of ACHIEVEMENTS) {
      expect(a.bonusXp).toBeGreaterThan(0)
      expect(a.title.length).toBeGreaterThan(0)
    }
  })
})

describe('satisfiedAchievements', () => {
  it('unlocks first-step on the first workout', () => {
    expect(satisfiedAchievements(ctx({ totalWorkouts: 1 }))).toContain('first-step')
  })

  it('unlocks milestone counts', () => {
    expect(satisfiedAchievements(ctx({ totalWorkouts: 50 }))).toEqual(
      expect.arrayContaining(['first-step', 'workouts-10', 'workouts-50']),
    )
    expect(satisfiedAchievements(ctx({ totalWorkouts: 50 }))).not.toContain('workouts-100')
  })

  it('unlocks streak and level milestones', () => {
    expect(satisfiedAchievements(ctx({ longestStreak: 7 }))).toContain('streak-7')
    expect(satisfiedAchievements(ctx({ level: 10 }))).toEqual(
      expect.arrayContaining(['level-5', 'level-10']),
    )
  })

  it('unlocks max momentum', () => {
    expect(satisfiedAchievements(ctx({ momentum: 100 }))).toContain('momentum-max')
  })

  it('unlocks all-rounder from weekly variety', () => {
    expect(satisfiedAchievements(ctx({ distinctTypesThisWeek: 3 }))).toContain('all-rounder')
  })

  it('detects a comeback from workout history', () => {
    const workouts = [
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 5)),
    ]
    expect(satisfiedAchievements(ctx({ workouts }))).toContain('comeback')
  })

  it('does not flag a comeback for consecutive training', () => {
    const workouts = [
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 1)),
    ]
    expect(satisfiedAchievements(ctx({ workouts }))).not.toContain('comeback')
  })
})

describe('Wave 3 tiered awards', () => {
  it('unlocks the higher workout milestones', () => {
    expect(satisfiedAchievements(ctx({ totalWorkouts: 250 }))).toContain('workouts-250')
    expect(satisfiedAchievements(ctx({ totalWorkouts: 250 }))).not.toContain('workouts-500')
    expect(satisfiedAchievements(ctx({ totalWorkouts: 500 }))).toEqual(
      expect.arrayContaining(['workouts-250', 'workouts-500']),
    )
  })

  it('unlocks the long streak and level tiers', () => {
    expect(satisfiedAchievements(ctx({ longestStreak: 60 }))).toContain('streak-60')
    expect(satisfiedAchievements(ctx({ longestStreak: 100 }))).toContain('streak-100')
    expect(satisfiedAchievements(ctx({ level: 20 }))).toContain('level-20')
    expect(satisfiedAchievements(ctx({ level: 30 }))).toContain('level-30')
    expect(satisfiedAchievements(ctx({ level: 19 }))).not.toContain('level-20')
  })

  it('unlocks WHO-week awards from whoWeeksMet', () => {
    expect(satisfiedAchievements(ctx({ whoWeeksMet: 1 }))).toContain('who-week')
    expect(satisfiedAchievements(ctx({ whoWeeksMet: 1 }))).not.toContain('who-weeks-10')
    expect(satisfiedAchievements(ctx({ whoWeeksMet: 10 }))).toEqual(
      expect.arrayContaining(['who-week', 'who-weeks-10']),
    )
  })

  it('unlocks the progress-weeks award', () => {
    expect(satisfiedAchievements(ctx({ progressWeeksCount: 5 }))).toContain('progress-weeks-5')
    expect(satisfiedAchievements(ctx({ progressWeeksCount: 4 }))).not.toContain('progress-weeks-5')
  })

  it('unlocks the personal-record tiers from prCount', () => {
    expect(satisfiedAchievements(ctx({ prCount: 5 }))).toContain('pr-5')
    expect(satisfiedAchievements(ctx({ prCount: 5 }))).not.toContain('pr-20')
    expect(satisfiedAchievements(ctx({ prCount: 20 }))).toEqual(
      expect.arrayContaining(['pr-5', 'pr-20']),
    )
  })

  it('unlocks the mastery awards from mastery5Count', () => {
    expect(satisfiedAchievements(ctx({ mastery5Count: 1 }))).toContain('mastery-5-any')
    expect(satisfiedAchievements(ctx({ mastery5Count: 1 }))).not.toContain('mastery-5-three')
    expect(satisfiedAchievements(ctx({ mastery5Count: 3 }))).toEqual(
      expect.arrayContaining(['mastery-5-any', 'mastery-5-three']),
    )
  })

  it('unlocks the comeback-count award', () => {
    expect(satisfiedAchievements(ctx({ comebackCount: 3 }))).toContain('comeback-3')
    expect(satisfiedAchievements(ctx({ comebackCount: 2 }))).not.toContain('comeback-3')
  })
})

describe('newlyUnlocked', () => {
  it('returns only achievements not already unlocked', () => {
    const fresh = newlyUnlocked(['first-step'], ctx({ totalWorkouts: 10 }))
    const ids = fresh.map((a) => a.id)
    expect(ids).toContain('workouts-10')
    expect(ids).not.toContain('first-step')
  })

  it('returns nothing when everything satisfied is already unlocked', () => {
    expect(newlyUnlocked(['first-step'], ctx({ totalWorkouts: 1 }))).toHaveLength(0)
  })

  it('carries the bonus XP for the reward animation', () => {
    const fresh = newlyUnlocked([], ctx({ totalWorkouts: 1 }))
    expect(fresh[0].bonusXp).toBeGreaterThan(0)
  })
})
