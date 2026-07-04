import { describe, expect, it } from 'vitest'
import { initialState, reduceLogWorkout, type LogWorkoutInput } from './store'
import { deriveState } from './selectors'
import { dayOffset } from '../domain/testHelpers'

const BASE = '2026-06-01' // Monday

function log(
  state = initialState(),
  input: Partial<LogWorkoutInput> & { date: string },
) {
  return reduceLogWorkout(state, {
    type: 'strength',
    durationMin: 30,
    intensity: 'moderate',
    ...input,
  })
}

describe('reduceLogWorkout', () => {
  it('adds a workout and awards XP', () => {
    const { next, reward } = log(undefined, { date: `${BASE}T10:00:00Z` })
    expect(next.workouts).toHaveLength(1)
    expect(reward.workoutXp).toBeGreaterThan(0)
    expect(next.workouts[0].xpEarned).toBe(reward.workoutXp)
  })

  it('unlocks the first-step achievement and grants its bonus XP', () => {
    const { next, reward } = log(undefined, { date: `${BASE}T10:00:00Z` })
    expect(reward.newAchievements.map((a) => a.id)).toContain('first-step')
    expect(next.unlocked.map((u) => u.id)).toContain('first-step')
    expect(next.bonusXp).toBeGreaterThan(0)
  })

  it('does not re-award an achievement already unlocked', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0) }).next
    const second = log(state, { date: dayOffset(BASE, 1) })
    expect(second.reward.newAchievements.map((a) => a.id)).not.toContain('first-step')
  })

  it('increases momentum after logging', () => {
    const { reward } = log(undefined, { date: `${BASE}T10:00:00Z` })
    expect(reward.momentumAfter).toBeGreaterThan(reward.momentumBefore)
  })

  it('flags a comeback after a long lapse', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0) }).next
    const comeback = log(state, { date: dayOffset(BASE, 6) })
    expect(comeback.reward.isComeback).toBe(true)
  })

  it('awards the weekly-goal bonus exactly once per week', () => {
    let state = initialState()
    // default goal is 4 — log 4 sessions in the same week
    let lastReward
    for (let d = 0; d < 4; d++) {
      const r = log(state, { date: dayOffset(BASE, d) })
      state = r.next
      lastReward = r.reward
    }
    expect(lastReward!.goalJustMet).toBe(true)
    expect(lastReward!.goalBonusXp).toBeGreaterThan(0)

    // a 5th session the same week must not re-award the bonus
    const fifth = log(state, { date: dayOffset(BASE, 5) })
    expect(fifth.reward.goalJustMet).toBe(false)
    expect(fifth.reward.goalBonusXp).toBe(0)
  })

  it('applies diminishing XP for repeated same-day sessions', () => {
    let state = initialState()
    const first = log(state, { date: `${BASE}T08:00:00Z` })
    state = first.next
    const second = log(state, { date: `${BASE}T18:00:00Z` })
    expect(second.reward.workoutXp).toBeLessThan(first.reward.workoutXp)
  })

  it('can trigger a level-up', () => {
    // A very long vigorous session yields enough XP to pass level 2 (100 XP).
    const { reward } = log(undefined, {
      date: `${BASE}T10:00:00Z`,
      durationMin: 120,
      intensity: 'vigorous',
    })
    expect(reward.levelAfter).toBeGreaterThanOrEqual(2)
    expect(reward.leveledUp).toBe(true)
  })
})

describe('deriveState integration', () => {
  it('reflects logged workouts in derived totals', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0) }).next
    state = log(state, { date: dayOffset(BASE, 1) }).next

    const derived = deriveState(state, dayOffset(BASE, 1))
    expect(derived.totalWorkouts).toBe(2)
    expect(derived.currentStreak).toBe(2)
    expect(derived.momentum).toBeGreaterThan(0)
    expect(derived.totalXp).toBe(
      state.workouts.reduce((s, w) => s + w.xpEarned, 0) + state.bonusXp,
    )
    expect(derived.level.level).toBeGreaterThanOrEqual(1)
  })

  it('starts empty and unonboarded', () => {
    const derived = deriveState(initialState(), BASE)
    expect(derived.totalWorkouts).toBe(0)
    expect(derived.momentum).toBe(0)
    expect(derived.currentStreak).toBe(0)
  })
})
