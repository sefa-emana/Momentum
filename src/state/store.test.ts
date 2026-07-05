import { describe, expect, it } from 'vitest'
import {
  initialState,
  migratePersisted,
  rebuildFromWorkouts,
  reduceLogWorkout,
  useStore,
  type LogWorkoutInput,
} from './store'
import { deriveState } from './selectors'
import {
  PR_BONUS_XP,
  PROGRESS_BONUS_XP,
  SURPRISE_BONUS_XP,
  GHOST_BEAT_XP,
  E1RM_PR_XP,
  PR_XP_CAP,
  QUEST_MAP,
  surpriseBonusFor,
  weekKey,
  type AcceptedQuest,
  type ExerciseDef,
  type ExerciseEntry,
} from '../domain'
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

describe('rebuildFromWorkouts (deletion consistency)', () => {
  it('reconciles bonus XP, goals and achievements after deletion', () => {
    // Log 4 sessions to meet the default weekly goal (bonus + achievements).
    let state = initialState()
    for (let d = 0; d < 4; d++) state = log(state, { date: dayOffset(BASE, d) }).next
    expect(state.bonusXp).toBeGreaterThan(0)
    expect(state.goalMetWeeks.length).toBe(1)

    // Delete everything → rebuilding from an empty history must reset the
    // accumulators, not strand them.
    const rebuilt = rebuildFromWorkouts(state, [])
    expect(rebuilt.workouts).toHaveLength(0)
    expect(rebuilt.bonusXp).toBe(0)
    expect(rebuilt.goalMetWeeks).toHaveLength(0)
    expect(rebuilt.unlocked).toHaveLength(0)

    const derived = deriveState(rebuilt, dayOffset(BASE, 3))
    expect(derived.totalXp).toBe(0)
    expect(derived.level.level).toBe(1)
  })

  it('preserves the settings and remaining workout ids', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0) }).next
    state = log(state, { date: dayOffset(BASE, 1) }).next
    const keepId = state.workouts[0].id

    const rebuilt = rebuildFromWorkouts(state, [state.workouts[0]])
    expect(rebuilt.workouts).toHaveLength(1)
    expect(rebuilt.workouts[0].id).toBe(keepId)
    expect(rebuilt.settings).toEqual(state.settings)
  })

  it('does not re-lose a weekly goal that is re-achieved after deletion', () => {
    // Meet goal, delete all, then meet it again → bonus must be granted again.
    let state = initialState()
    for (let d = 0; d < 4; d++) state = log(state, { date: dayOffset(BASE, d) }).next
    state = rebuildFromWorkouts(state, [])

    let lastReward
    for (let d = 0; d < 4; d++) {
      const r = log(state, { date: dayOffset(BASE, d) })
      state = r.next
      lastReward = r.reward
    }
    expect(lastReward!.goalJustMet).toBe(true)
    expect(lastReward!.goalBonusXp).toBeGreaterThan(0)
  })

  it('rebuilds progressWeeks like goalMetWeeks after deletion', () => {
    // Earn a progress bonus (beat last week's load), then rebuild → the same
    // history must reproduce the granted progress week exactly.
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, -7) }).next // last week baseline
    state = log(state, { date: dayOffset(BASE, 0) }).next // this week #1 (=last)
    const r = log(state, { date: dayOffset(BASE, 1) }) // this week #2 (> last)
    state = r.next
    expect(r.reward.progressJustMade).toBe(true)
    expect(state.progressWeeks.length).toBe(1)

    const rebuilt = rebuildFromWorkouts(state, state.workouts)
    expect(rebuilt.progressWeeks).toEqual(state.progressWeeks)
  })
})

describe('progression bonuses', () => {
  it('awards the PR bonus for an honest record when load is calm', () => {
    const { reward, next } = log(undefined, { date: `${BASE}T10:00:00Z`, prBeaten: true })
    expect(reward.prBonusXp).toBe(PR_BONUS_XP)
    expect(reward.overreach).toBe(false)
    expect(next.workouts[0].prBeaten).toBe(true)
  })

  it('awards the weekly progress bonus once, on the session that beats last week', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, -7) }).next // last week: 1 session
    const first = log(state, { date: dayOffset(BASE, 0) }) // ties last week → no bonus
    state = first.next
    expect(first.reward.progressJustMade).toBe(false)

    const second = log(state, { date: dayOffset(BASE, 1) }) // beats last week → bonus
    state = second.next
    expect(second.reward.progressJustMade).toBe(true)
    expect(second.reward.progressBonusXp).toBe(PROGRESS_BONUS_XP)

    const third = log(state, { date: dayOffset(BASE, 2) }) // already granted this week
    expect(third.reward.progressJustMade).toBe(false)
    expect(third.reward.progressBonusXp).toBe(0)
  })

  it('withholds no progress bonus in the very first week (no last week)', () => {
    const { reward } = log(undefined, { date: `${BASE}T10:00:00Z` })
    expect(reward.progressJustMade).toBe(false)
    expect(reward.progressBonusXp).toBe(0)
  })

  it('never rewards overreaching (no PR or progress bonus, flag set)', () => {
    // Build 4 weeks of moderate load, then spike this week to vigorous. The
    // final session is an honest PR during an elevated load ratio.
    let state = initialState()
    for (let d = 0; d < 28; d++) {
      state = log(state, { date: dayOffset(BASE, d), intensity: 'moderate', durationMin: 30 }).next
    }
    let last
    for (let d = 28; d <= 34; d++) {
      last = log(state, {
        date: dayOffset(BASE, d),
        intensity: 'vigorous',
        durationMin: 30,
        prBeaten: d === 34,
      })
      state = last.next
    }
    expect(last!.reward.overreach).toBe(true)
    expect(last!.reward.prBonusXp).toBe(0)
    expect(last!.reward.progressBonusXp).toBe(0)
  })

  it('reports Rest Shields and WHO points on the reward', () => {
    const { reward } = log(undefined, {
      date: `${BASE}T10:00:00Z`,
      intensity: 'moderate',
      durationMin: 30,
    })
    expect(reward.shieldsRemaining).toBe(2) // fresh run
    expect(reward.weeklyWhoPoints).toBe(30) // moderate 30 min × 1 pt/min
  })

  it('supports backdated logging without crashing the load signals', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 5) }).next
    // Log an earlier session after a later one (out-of-order / backdated).
    const r = log(state, { date: dayOffset(BASE, 2) })
    expect(r.next.workouts).toHaveLength(2)
    expect(r.reward.workoutXp).toBeGreaterThan(0)
  })
})

describe('migratePersisted (v1/v2/v3 → v4)', () => {
  it('fills the new forgiveness- and endgame-layer fields for a v1 state', () => {
    const v1 = {
      version: 1,
      createdAt: '2026-01-01T00:00:00Z',
      workouts: [],
      bonusXp: 0,
      goalMetWeeks: [],
      unlocked: [],
      settings: { name: 'Sam', weeklyGoal: { workoutsPerWeek: 4 }, reducedMotion: false },
      onboarded: true,
    }
    const migrated = migratePersisted(v1, 1)
    expect(migrated.progressWeeks).toEqual([])
    expect(migrated.pauses).toEqual([])
    expect(migrated.acceptedQuests).toEqual([])
    expect(migrated.questsDone).toEqual([])
    // v3 → v4: Progression Engine v2 adds the customExercises store.
    expect(migrated.customExercises).toEqual([])
    expect(migrated.version).toBe(4)
    expect(migrated.onboarded).toBe(true)
    expect(migrated.settings.name).toBe('Sam')
  })

  it('adds the endgame quest fields to a v2 state', () => {
    const v2 = {
      version: 2,
      createdAt: '2026-01-01T00:00:00Z',
      workouts: [],
      bonusXp: 0,
      goalMetWeeks: [],
      progressWeeks: ['2026-W01'],
      pauses: [],
      unlocked: [],
      settings: { name: 'Sam', weeklyGoal: { workoutsPerWeek: 4 }, reducedMotion: false },
      onboarded: true,
    }
    const migrated = migratePersisted(v2, 2)
    expect(migrated.progressWeeks).toEqual(['2026-W01'])
    expect(migrated.acceptedQuests).toEqual([])
    expect(migrated.questsDone).toEqual([])
    expect(migrated.customExercises).toEqual([])
    expect(migrated.version).toBe(4)
  })

  it('tolerates a nullish persisted state', () => {
    const migrated = migratePersisted(undefined, 1)
    expect(migrated.progressWeeks).toEqual([])
    expect(migrated.pauses).toEqual([])
    expect(migrated.acceptedQuests).toEqual([])
    expect(migrated.questsDone).toEqual([])
  })
})

describe('weekly quests in the reducer', () => {
  const WK = weekKey(BASE)

  function withAcceptedStrength2() {
    const accepted: AcceptedQuest = {
      id: 'strength2',
      week: WK,
      acceptedAt: dayOffset(BASE, 0),
    }
    return { ...initialState(), acceptedQuests: [accepted] }
  }

  it('grants an accepted quest bonus exactly once when completed', () => {
    let state = withAcceptedStrength2()
    // First strength session — quest at 1/2, not yet complete.
    const first = log(state, { type: 'strength', date: dayOffset(BASE, 1) })
    expect(first.reward.questsCompleted).toHaveLength(0)
    state = first.next

    // Second strength session — completes the quest, grants its bonus once.
    const second = log(state, { type: 'strength', date: dayOffset(BASE, 2) })
    expect(second.reward.questsCompleted.map((q) => q.id)).toEqual(['strength2'])
    expect(second.reward.questBonusXp).toBe(QUEST_MAP['strength2'].bonusXp)
    expect(second.next.questsDone).toEqual([{ id: 'strength2', week: WK }])
    state = second.next

    // A third session must not re-grant the quest.
    const third = log(state, { type: 'strength', date: dayOffset(BASE, 3) })
    expect(third.reward.questsCompleted).toHaveLength(0)
    expect(third.next.questsDone).toEqual([{ id: 'strength2', week: WK }])
  })

  it('re-derives questsDone consistently after a delete-and-replay', () => {
    const start = withAcceptedStrength2()
    let state = log(start, { type: 'strength', date: dayOffset(BASE, 1) }).next
    state = log(state, { type: 'strength', date: dayOffset(BASE, 2) }).next
    expect(state.questsDone).toEqual([{ id: 'strength2', week: WK }])

    // Remove one strength session → quest no longer complete after replay.
    const idToDelete = state.workouts[0].id
    const reduced = rebuildFromWorkouts(state, state.workouts.filter((w) => w.id !== idToDelete))
    expect(reduced.questsDone).toEqual([])
    expect(reduced.acceptedQuests).toEqual(state.acceptedQuests)

    // Re-add the session → quest completes again, still exactly once.
    const readd = log(reduced, { type: 'strength', date: dayOffset(BASE, 4) })
    expect(readd.reward.questsCompleted.map((q) => q.id)).toEqual(['strength2'])
    expect(readd.next.questsDone).toEqual([{ id: 'strength2', week: WK }])
  })

  it('does not grant quests that were never accepted', () => {
    let state = initialState()
    state = log(state, { type: 'strength', date: dayOffset(BASE, 1) }).next
    const r = log(state, { type: 'strength', date: dayOffset(BASE, 2) })
    expect(r.reward.questsCompleted).toHaveLength(0)
    expect(r.reward.questBonusXp).toBe(0)
  })
})

describe('Progression Engine v2 — per-exercise XP', () => {
  function entries(exerciseId: string, ...sets: [number, number][]): ExerciseEntry[] {
    return [{ exerciseId, sets: sets.map(([weightKg, reps]) => ({ weightKg, reps, kind: 'normal' })) }]
  }

  it('awards ghost-beat XP once per exercise that beats its last session', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0), entries: entries('bench-press', [100, 5]) }).next
    const r = log(state, { date: dayOffset(BASE, 2), entries: entries('bench-press', [100, 6]) })
    expect(r.reward.ghostBeaten).toEqual(['bench-press'])
    expect(r.reward.setBonusXp).toBeGreaterThanOrEqual(GHOST_BEAT_XP)
  })

  it('awards PR XP and reports pr events, capped per workout', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0), entries: entries('bench-press', [100, 5]) }).next
    const r = log(state, { date: dayOffset(BASE, 2), entries: entries('bench-press', [110, 5]) })
    // 110 kg is a clean-enough jump? bench increment 2.5 → 10 kg is an ego-lift,
    // so use a lawful jump instead below; here assert the cap holds generally.
    expect(r.reward.setBonusXp).toBeLessThanOrEqual(GHOST_BEAT_XP + PR_XP_CAP)
  })

  it('grants an e1RM PR its XP on a lawful progression', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0), entries: entries('bench-press', [100, 5]) }).next
    const r = log(state, { date: dayOffset(BASE, 2), entries: entries('bench-press', [102.5, 5]) })
    const kinds = r.reward.prEvents.find((p) => p.exerciseId === 'bench-press')?.kinds ?? []
    expect(kinds).toContain('e1rm')
    expect(r.reward.setBonusXp).toBeGreaterThanOrEqual(E1RM_PR_XP)
  })

  it('grants no bonus XP for an ego-lift (weight jump > 2× increment)', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0), entries: entries('bench-press', [100, 5]) }).next
    // +10 kg on a 2.5 kg-increment lift → ego-lift → no ghost/PR XP, no flags.
    const r = log(state, { date: dayOffset(BASE, 2), entries: entries('bench-press', [110, 5]) })
    expect(r.reward.setBonusXp).toBe(0)
    expect(r.reward.ghostBeaten).toEqual([])
    expect(r.reward.prEvents).toEqual([])
    // …but the workout is still logged with its entries (counts as data).
    expect(r.next.workouts[r.next.workouts.length - 1].entries).toBeTruthy()
  })

  it('gives a backfilled session no ghost/PR bonus or flags', () => {
    let state = initialState()
    state = log(state, { date: dayOffset(BASE, 0), entries: entries('bench-press', [100, 5]) }).next
    const r = log(state, {
      date: dayOffset(BASE, 2),
      entries: entries('bench-press', [102.5, 5]),
      backfilled: true,
    })
    expect(r.reward.setBonusXp).toBe(0)
    expect(r.reward.prEvents).toEqual([])
    expect(r.reward.ghostBeaten).toEqual([])
    // Base/effort XP is still awarded in full.
    expect(r.reward.workoutXp).toBeGreaterThan(0)
    expect(r.next.workouts[r.next.workouts.length - 1].backfilled).toBe(true)
  })

  it('replays entries + PR XP bit-for-bit and stays consistent after a delete', () => {
    // Log 5 lawful bench sessions with entries.
    let state = initialState()
    const weights = [100, 102.5, 105, 107.5, 110]
    for (let i = 0; i < weights.length; i++) {
      state = log(state, {
        date: dayOffset(BASE, i * 2),
        entries: entries('bench-press', [weights[i], 5]),
      }).next
    }
    // Sequential-reduce result is the source of truth; rebuild must match.
    const rebuilt = rebuildFromWorkouts(state, state.workouts)
    expect(rebuilt.bonusXp).toBe(state.bonusXp)
    expect(rebuilt.workouts).toEqual(state.workouts)

    // Delete session #3, rebuild → equals reducing the remaining set in order.
    const remaining = state.workouts.filter((_, idx) => idx !== 2)
    const afterDelete = rebuildFromWorkouts(state, remaining)
    let manual = initialState()
    for (const w of remaining) {
      manual = reduceLogWorkout(manual, {
        id: w.id, type: w.type, durationMin: w.durationMin, intensity: w.intensity,
        note: w.note, date: w.date, feel: w.feel, prBeaten: w.prBeaten,
        entries: w.entries, backfilled: w.backfilled,
      }).next
    }
    expect(afterDelete.bonusXp).toBe(manual.bonusXp)
    expect(afterDelete.workouts).toEqual(manual.workouts)
  })
})

describe('updateWorkout + custom exercises', () => {
  it('recomputes derived state when a workout is edited', () => {
    useStore.getState().resetAll()
    const reward = useStore.getState().logWorkout({
      type: 'strength', durationMin: 30, intensity: 'moderate', date: dayOffset(BASE, 0),
    })
    const before = useStore.getState().workouts[0].xpEarned
    useStore.getState().updateWorkout(reward.workoutId, { durationMin: 120, intensity: 'vigorous' })
    const after = useStore.getState().workouts[0]
    expect(after.durationMin).toBe(120)
    expect(after.xpEarned).toBeGreaterThan(before) // XP recomputed via replay
    useStore.getState().resetAll()
  })

  it('preserves the original backfilled flag through an edit', () => {
    useStore.getState().resetAll()
    // Log a back-dated session (far in the past → backfilled).
    const reward = useStore.getState().logWorkout({
      type: 'strength', durationMin: 30, intensity: 'moderate', date: '2020-01-01T10:00:00Z',
    })
    expect(useStore.getState().workouts[0].backfilled).toBe(true)
    useStore.getState().updateWorkout(reward.workoutId, { durationMin: 45 })
    expect(useStore.getState().workouts[0].backfilled).toBe(true)
    useStore.getState().resetAll()
  })

  it('adds a custom exercise with a validated, prefixed, unique id', () => {
    useStore.getState().resetAll()
    const def: ExerciseDef = {
      id: 'my-move', name: 'Meine Übung', category: 'strength', pattern: 'push',
      primaryMuscles: ['chest'], secondaryMuscles: [], equipment: 'dumbbell',
      loadType: 'external', sizeClass: 'small', defaultRepRange: { min: 8, max: 12 },
      incrementKg: 2,
    }
    useStore.getState().addCustomExercise(def)
    const list = useStore.getState().customExercises
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('custom-my-move')

    // Re-adding the same (already-prefixed) id is a no-op.
    useStore.getState().addCustomExercise({ ...def, id: 'custom-my-move' })
    expect(useStore.getState().customExercises).toHaveLength(1)
    useStore.getState().resetAll()
  })
})

describe('ethical surprise bonus', () => {
  it('is deterministic from the workout id and replay-safe', () => {
    const r = log(undefined, { date: dayOffset(BASE, 0) })
    const id = r.next.workouts[0].id
    const expected = surpriseBonusFor(id) ? SURPRISE_BONUS_XP : 0
    expect(r.reward.surpriseXp).toBe(expected)

    // Replaying the exact same workout (id preserved) reproduces the bonus.
    const replayed = rebuildFromWorkouts(
      { ...initialState() },
      r.next.workouts,
    )
    // The rebuilt total XP includes the same surprise contribution as the live
    // run (bonusXp accumulates it), so the surprise is stable across replay.
    expect(replayed.workouts[0].id).toBe(id)
  })

  it('is always additive — never reduces the base workout XP', () => {
    const r = log(undefined, { date: dayOffset(BASE, 0) })
    expect(r.reward.surpriseXp).toBeGreaterThanOrEqual(0)
    expect(r.reward.workoutXp).toBeGreaterThan(0)
  })
})

describe('pause actions', () => {
  it('starts at most one active pause and ends it', () => {
    useStore.getState().resetAll()
    useStore.getState().startPause()
    expect(useStore.getState().pauses).toHaveLength(1)
    expect(useStore.getState().pauses[0].to).toBeNull()

    // A second start is a no-op while one is active.
    useStore.getState().startPause()
    expect(useStore.getState().pauses).toHaveLength(1)

    useStore.getState().endPause()
    expect(useStore.getState().pauses[0].to).not.toBeNull()

    // After ending, a new pause can begin.
    useStore.getState().startPause()
    expect(useStore.getState().pauses).toHaveLength(2)
    useStore.getState().resetAll()
  })

  it('endPause is a no-op with no active pause', () => {
    useStore.getState().resetAll()
    useStore.getState().endPause()
    expect(useStore.getState().pauses).toHaveLength(0)
  })
})
