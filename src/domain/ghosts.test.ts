import { describe, expect, it } from 'vitest'
import { ghostSetsFor, lastSessionFor, recentExerciseIds } from './ghosts'
import { makeWorkout } from './testHelpers'
import type { SetEntry, Workout } from './types'

const BASE = '2026-06-01' // Monday

function set(weightKg: number, reps: number, kind: SetEntry['kind'] = 'normal'): SetEntry {
  return { weightKg, reps, kind }
}

function wk(days: number, exerciseId: string, sets: SetEntry[]): Workout {
  const d = new Date(`${BASE}T10:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return makeWorkout(d.toISOString(), { entries: [{ exerciseId, sets }] })
}

describe('lastSessionFor / ghostSetsFor', () => {
  it('returns the most recent prior session and its working sets', () => {
    const history = [
      wk(0, 'bench-press', [set(50, 8), set(50, 8)]),
      wk(3, 'bench-press', [set(55, 6), set(55, 6), set(55, 5)]),
    ]
    const last = lastSessionFor(history, 'bench-press')
    expect(last).toBeDefined()
    const ghost = ghostSetsFor(history, 'bench-press')
    expect(ghost).toHaveLength(3)
    expect(ghost[0]).toMatchObject({ weightKg: 55, reps: 6 })
  })

  it('drops warmups from the ghost prefill', () => {
    const history = [wk(0, 'bench-press', [set(20, 10, 'warmup'), set(60, 5)])]
    const ghost = ghostSetsFor(history, 'bench-press')
    expect(ghost).toHaveLength(1)
    expect(ghost[0]).toMatchObject({ weightKg: 60, reps: 5 })
  })

  it('returns empty for a never-logged exercise', () => {
    expect(ghostSetsFor([], 'deadlift')).toEqual([])
    expect(lastSessionFor([], 'deadlift')).toBeUndefined()
  })
})

describe('recentExerciseIds', () => {
  it('lists recently used exercises, most-recent first, deduped', () => {
    const history = [
      wk(0, 'bench-press', [set(50, 8)]),
      wk(1, 'barbell-row', [set(40, 10)]),
      wk(2, 'bench-press', [set(55, 6)]),
    ]
    expect(recentExerciseIds(history)).toEqual(['bench-press', 'barbell-row'])
  })

  it('respects the limit', () => {
    const history = [
      wk(0, 'bench-press', [set(50, 8)]),
      wk(1, 'barbell-row', [set(40, 10)]),
      wk(2, 'back-squat', [set(80, 5)]),
    ]
    expect(recentExerciseIds(history, 2)).toHaveLength(2)
  })
})
