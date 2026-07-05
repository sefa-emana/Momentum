import { describe, expect, it } from 'vitest'
import { initialState, rebuildFromWorkouts, reduceLogWorkout, type LogWorkoutInput } from './store'
import { dayOffset } from '../domain/testHelpers'
import type { Intensity, WorkoutType } from '../domain'

const BASE = '2026-01-05' // Monday
const TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'sport', 'other']
const INTENSITIES: Intensity[] = ['light', 'moderate', 'vigorous']

/** Build a realistic history by replaying live logging (one session/day). */
function build(count: number) {
  let state = initialState()
  for (let i = 0; i < count; i++) {
    const input: LogWorkoutInput = {
      type: TYPES[i % TYPES.length],
      intensity: INTENSITIES[i % INTENSITIES.length],
      durationMin: 20 + (i % 5) * 15,
      date: dayOffset(BASE, i),
      prBeaten: i % 11 === 0,
      feel: i % 3 === 0 ? 7 : undefined,
    }
    state = reduceLogWorkout(state, input).next
  }
  return state
}

describe('rebuildFromWorkouts (replay path)', () => {
  it('reproduces sequential-reduce results exactly for 1000 workouts', () => {
    const state = build(1000)
    const rebuilt = rebuildFromWorkouts(state, state.workouts)

    // The replay must reproduce every derived accumulator bit-for-bit.
    expect(rebuilt.bonusXp).toBe(state.bonusXp)
    expect(rebuilt.goalMetWeeks).toEqual(state.goalMetWeeks)
    expect(rebuilt.progressWeeks).toEqual(state.progressWeeks)
    expect(rebuilt.questsDone).toEqual(state.questsDone)
    expect(rebuilt.unlocked).toEqual(state.unlocked)
    expect(rebuilt.workouts).toEqual(state.workouts)
  })

  it('rebuilds a realistic (~1 year) history well within budget', () => {
    // 200 sessions ≈ a year at ~4/week — the size a real delete replays over.
    const state = build(200)
    const t0 = performance.now()
    const rebuilt = rebuildFromWorkouts(state, state.workouts)
    const elapsed = performance.now() - t0
    expect(rebuilt.workouts).toHaveLength(200)
    // eslint-disable-next-line no-console
    console.info(`[perf] rebuild(200) = ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(250)
  })

  it('stays sub-linear-safe at 1000 workouts (regression guard)', () => {
    const state = build(1000)
    const t0 = performance.now()
    rebuildFromWorkouts(state, state.workouts)
    const elapsed = performance.now() - t0
    // eslint-disable-next-line no-console
    console.info(`[perf] rebuild(1000) = ${elapsed.toFixed(1)}ms`)
    // Generous guard: catches an accidental O(n³) / cache-busting regression
    // without being flaky on shared CI. The replay is a delete-only path.
    expect(elapsed).toBeLessThan(8000)
  })
})
