import { describe, expect, it } from 'vitest'
import {
  QUEST_MAP,
  QUEST_POOL,
  almostCompleteQuest,
  isQuestComplete,
  newlyCompletedQuests,
  offeredQuests,
} from './quests'
import { weekKey } from './dates'
import { makeWorkout, dayOffset } from './testHelpers'
import type { AcceptedQuest, QuestRef } from './types'

const BASE = '2026-06-01' // Monday
const WK = weekKey(BASE)

describe('offeredQuests rotation', () => {
  it('is deterministic: same ISO week → same two offers', () => {
    const a = offeredQuests(WK).map((q) => q.id)
    const b = offeredQuests(WK).map((q) => q.id)
    expect(a).toEqual(b)
  })

  it('always offers two distinct quests from the pool', () => {
    for (const wk of ['2026-W01', '2026-W23', '2026-W40', '2027-W15', '2025-W52']) {
      const [q1, q2] = offeredQuests(wk)
      expect(q1.id).not.toBe(q2.id)
      expect(QUEST_MAP[q1.id]).toBeDefined()
      expect(QUEST_MAP[q2.id]).toBeDefined()
    }
  })

  it('varies across weeks (not a single constant pair)', () => {
    const seen = new Set<string>()
    for (let w = 1; w <= 40; w++) {
      const wk = `2026-W${String(w).padStart(2, '0')}`
      seen.add(offeredQuests(wk).map((q) => q.id).sort().join('+'))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('quest progress functions', () => {
  it('variety3 counts distinct workout types in the week', () => {
    const q = QUEST_MAP['variety3']
    const ws = [
      makeWorkout(dayOffset(BASE, 0), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 1), { type: 'cardio' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    expect(q.progress(ws, WK)).toBe(2)
    ws.push(makeWorkout(dayOffset(BASE, 3), { type: 'mobility' }))
    expect(q.progress(ws, WK)).toBe(3)
    expect(isQuestComplete(q, ws, WK)).toBe(true)
  })

  it('active4 counts distinct active days in the week', () => {
    const q = QUEST_MAP['active4']
    const ws = [
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 0)), // same day, does not double-count
      makeWorkout(dayOffset(BASE, 1)),
      makeWorkout(dayOffset(BASE, 2)),
      makeWorkout(dayOffset(BASE, 3)),
    ]
    expect(q.progress(ws, WK)).toBe(4)
  })

  it('who150 sums WHO activity points', () => {
    const q = QUEST_MAP['who150']
    const ws = [
      makeWorkout(dayOffset(BASE, 0), { intensity: 'moderate', durationMin: 60 }), // 60
      makeWorkout(dayOffset(BASE, 1), { intensity: 'vigorous', durationMin: 45 }), // 90
    ]
    expect(q.progress(ws, WK)).toBe(150)
    expect(isQuestComplete(q, ws, WK)).toBe(true)
  })

  it('mobility2 counts mobility sessions', () => {
    const q = QUEST_MAP['mobility2']
    const ws = [
      makeWorkout(dayOffset(BASE, 0), { type: 'mobility' }),
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'mobility' }),
    ]
    expect(q.progress(ws, WK)).toBe(2)
  })

  it('strength2 counts strength sessions', () => {
    const q = QUEST_MAP['strength2']
    const ws = [
      makeWorkout(dayOffset(BASE, 0), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
    ]
    expect(q.progress(ws, WK)).toBe(2)
  })

  it('light1 counts light-intensity sessions', () => {
    const q = QUEST_MAP['light1']
    const ws = [makeWorkout(dayOffset(BASE, 0), { intensity: 'light' })]
    expect(q.progress(ws, WK)).toBe(1)
  })

  it('ignores workouts from other weeks', () => {
    const q = QUEST_MAP['strength2']
    const ws = [
      makeWorkout(dayOffset(BASE, 0), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 14), { type: 'strength' }), // two weeks later
    ]
    expect(q.progress(ws, WK)).toBe(1)
  })

  it('every pool quest has a positive target and bonus in the 60–100 band', () => {
    for (const q of QUEST_POOL) {
      expect(q.target).toBeGreaterThan(0)
      expect(q.bonusXp).toBeGreaterThanOrEqual(60)
      expect(q.bonusXp).toBeLessThanOrEqual(100)
    }
  })
})

describe('newlyCompletedQuests', () => {
  const accepted: AcceptedQuest[] = [
    { id: 'strength2', week: WK, acceptedAt: dayOffset(BASE, 0) },
  ]

  it('returns a quest the moment its target is reached', () => {
    const ws = [
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    const done = newlyCompletedQuests(accepted, [], ws, dayOffset(BASE, 2))
    expect(done.map((q) => q.id)).toEqual(['strength2'])
  })

  it('does not return a quest already recorded as done', () => {
    const ws = [
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    const already: QuestRef[] = [{ id: 'strength2', week: WK }]
    expect(newlyCompletedQuests(accepted, already, ws, dayOffset(BASE, 2))).toHaveLength(0)
  })

  it('never retroactively grants a quest satisfied before acceptance', () => {
    // Two strength sessions logged BEFORE the quest was accepted.
    const preAccept: AcceptedQuest[] = [
      { id: 'strength2', week: WK, acceptedAt: dayOffset(BASE, 3) },
    ]
    const ws = [
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    // The workout triggering the check is itself before acceptance → no grant.
    expect(newlyCompletedQuests(preAccept, [], ws, dayOffset(BASE, 2))).toHaveLength(0)
  })

  it('ignores quests from a different ISO week', () => {
    const otherWeek: AcceptedQuest[] = [
      { id: 'strength2', week: '2026-W99', acceptedAt: dayOffset(BASE, 0) },
    ]
    const ws = [
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    expect(newlyCompletedQuests(otherWeek, [], ws, dayOffset(BASE, 2))).toHaveLength(0)
  })
})

describe('almostCompleteQuest', () => {
  const accepted: AcceptedQuest[] = [
    { id: 'strength2', week: WK, acceptedAt: dayOffset(BASE, 0) },
  ]

  it('flags an accepted quest one step from completion', () => {
    const ws = [makeWorkout(dayOffset(BASE, 1), { type: 'strength' })]
    expect(almostCompleteQuest(accepted, [], ws, dayOffset(BASE, 1))?.id).toBe('strength2')
  })

  it('returns null when not yet close', () => {
    const ws: ReturnType<typeof makeWorkout>[] = []
    expect(almostCompleteQuest(accepted, [], ws, dayOffset(BASE, 1))).toBeNull()
  })

  it('returns null once completed', () => {
    const ws = [
      makeWorkout(dayOffset(BASE, 1), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    expect(almostCompleteQuest(accepted, [], ws, dayOffset(BASE, 2))).toBeNull()
  })
})
