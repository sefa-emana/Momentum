import { describe, expect, it } from 'vitest'
import {
  confirmedSetCount,
  draftFromEntry,
  draftFromGhost,
  duplicateLastSet,
  entriesFromDrafts,
  type DraftExercise,
} from './setDraft'
import type { ExerciseEntry, SetEntry } from '../domain'

function gs(weightKg: number, reps: number, kind: SetEntry['kind'] = 'normal'): SetEntry {
  return { weightKg, reps, kind }
}

describe('draftFromGhost', () => {
  it('maps ghost sets to grey, unconfirmed drafts', () => {
    const d = draftFromGhost('bench-press', [gs(60, 8), gs(60, 7)])
    expect(d.sets).toHaveLength(2)
    expect(d.sets.every((s) => s.ghost && !s.confirmed)).toBe(true)
    expect(d.sets[0]).toMatchObject({ weightKg: 60, reps: 8 })
  })

  it('falls back to a single blank set when no history', () => {
    const d = draftFromGhost('bench-press', [])
    expect(d.sets).toHaveLength(1)
    expect(d.sets[0].ghost).toBe(false)
  })
})

describe('entriesFromDrafts', () => {
  it('keeps only confirmed sets and drops empty exercises', () => {
    const drafts: DraftExercise[] = [
      {
        key: 'a',
        exerciseId: 'bench-press',
        sets: [
          { id: '1', weightKg: 60, reps: 8, kind: 'normal', confirmed: true, ghost: false },
          { id: '2', weightKg: 60, reps: 7, kind: 'normal', confirmed: false, ghost: true },
        ],
      },
      {
        key: 'b',
        exerciseId: 'barbell-row',
        sets: [{ id: '3', reps: 10, kind: 'normal', confirmed: false, ghost: true }],
      },
    ]
    const entries = entriesFromDrafts(drafts)
    expect(entries).toHaveLength(1)
    expect(entries[0].exerciseId).toBe('bench-press')
    expect(entries[0].sets).toHaveLength(1)
    expect(entries[0].sets[0]).toMatchObject({ weightKg: 60, reps: 8, kind: 'normal' })
  })

  it('round-trips through draftFromEntry', () => {
    const entry: ExerciseEntry = {
      exerciseId: 'back-squat',
      sets: [gs(100, 5), { weightKg: 100, reps: 5, kind: 'warmup' }],
    }
    const [out] = entriesFromDrafts([draftFromEntry(entry)])
    expect(out.sets).toHaveLength(2)
  })
})

describe('confirmedSetCount / duplicateLastSet', () => {
  it('counts confirmed working sets only (warmups excluded)', () => {
    const d: DraftExercise = {
      key: 'a',
      exerciseId: 'bench-press',
      sets: [
        { id: '1', reps: 8, kind: 'normal', confirmed: true, ghost: false },
        { id: '2', reps: 8, kind: 'warmup', confirmed: true, ghost: false },
        { id: '3', reps: 8, kind: 'normal', confirmed: false, ghost: false },
      ],
    }
    expect(confirmedSetCount([d])).toBe(1)
  })

  it('duplicates the last set unconfirmed, warmup demoted to normal', () => {
    const dup = duplicateLastSet([
      { id: '1', weightKg: 60, reps: 8, kind: 'warmup', confirmed: true, ghost: false },
    ])
    expect(dup.confirmed).toBe(false)
    expect(dup.kind).toBe('normal')
    expect(dup).toMatchObject({ weightKg: 60, reps: 8 })
  })
})
