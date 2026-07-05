import { describe, expect, it } from 'vitest'
import {
  bestE1RM,
  bestSetMetric,
  cardioProgressionHint,
  classifySetBand,
  detectPRs,
  e1rmForSet,
  egoLiftExercises,
  epley1RM,
  ghostBeats,
  progressionHint,
  stallState,
  stallSuggestion,
  volumeLoad,
  weeklyBestE1RM,
  weeklySetsByPattern,
} from './progression'
import { makeWorkout } from './testHelpers'
import type { SetEntry, Workout } from './types'

const BASE = '2026-06-01' // Monday

function set(
  weightKg: number | undefined,
  reps: number | undefined,
  extra: Partial<SetEntry> = {},
): SetEntry {
  return { weightKg, reps, kind: 'normal', ...extra }
}

/** A workout with a single-exercise entry, dated at `BASE + days`. */
function wk(
  days: number,
  exerciseId: string,
  sets: SetEntry[],
  overrides: Partial<Workout> = {},
): Workout {
  const d = new Date(`${BASE}T10:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return makeWorkout(d.toISOString(), {
    entries: [{ exerciseId, sets }],
    ...overrides,
  })
}

describe('epley / e1RM', () => {
  it('applies the Epley formula', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.333, 2)
    expect(epley1RM(100, 1)).toBeCloseTo(103.333, 2)
  })

  it('gates e1RM to reps in [1,12], non-warmup, external load', () => {
    expect(e1rmForSet(set(100, 5))).toBeCloseTo(116.667, 2)
    expect(e1rmForSet(set(100, 13))).toBeNull() // above the valid band
    expect(e1rmForSet(set(100, 0))).toBeNull()
    expect(e1rmForSet({ weightKg: 100, reps: 5, kind: 'warmup' })).toBeNull()
    // Bodyweight loadType: no e1RM (volume/reps only).
    const bwDef = {
      id: 'push-up',
      name: 'x',
      category: 'strength' as const,
      pattern: 'push' as const,
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment: 'bodyweight' as const,
      loadType: 'bodyweight' as const,
      sizeClass: 'small' as const,
      defaultRepRange: { min: 10, max: 20 },
      incrementKg: 0,
    }
    expect(e1rmForSet(set(0, 10), bwDef)).toBeNull()
  })

  it('bestE1RM picks the max qualifying set and ignores warmups', () => {
    const sets = [
      { weightKg: 60, reps: 5, kind: 'warmup' as const },
      set(100, 5),
      set(105, 3),
    ]
    // 105×3 = 115.5, 100×5 = 116.67 → the 100×5 wins.
    expect(bestE1RM(sets)).toBeCloseTo(116.667, 2)
  })

  it('volumeLoad sums weight×reps over all rep counts', () => {
    expect(volumeLoad([set(100, 5), set(80, 10)])).toBe(1300)
  })

  it('weeklyBestE1RM returns an ascending per-week trend', () => {
    const workouts = [
      wk(0, 'bench-press', [set(100, 5)]),
      wk(7, 'bench-press', [set(102.5, 5)]),
    ]
    const trend = weeklyBestE1RM(workouts, 'bench-press')
    expect(trend).toHaveLength(2)
    expect(trend[1].e1rm).toBeGreaterThan(trend[0].e1rm)
  })
})

describe('detectPRs', () => {
  const prior = [wk(0, 'bench-press', [set(100, 5), set(100, 5)])]

  it('flags weight, e1rm and volume PRs on a heavier session', () => {
    const next = wk(7, 'bench-press', [set(105, 5), set(105, 5)])
    const prs = detectPRs(prior, next)
    expect(prs).toHaveLength(1)
    expect(prs[0].exerciseId).toBe('bench-press')
    expect(prs[0].kinds).toEqual(expect.arrayContaining(['weight', 'e1rm', 'volume']))
  })

  it('flags a rep PR at the same weight', () => {
    const next = wk(7, 'bench-press', [set(100, 7), set(100, 6)])
    const prs = detectPRs(prior, next)
    expect(prs[0].kinds).toContain('rep')
  })

  it('never flags a PR on the very first session of an exercise', () => {
    expect(detectPRs([], prior[0])).toEqual([])
  })

  it('ignores warmup sets', () => {
    const next = wk(7, 'bench-press', [
      { weightKg: 200, reps: 1, kind: 'warmup' },
      set(90, 5),
    ])
    // The 200 kg warmup must not count as a weight PR.
    expect(detectPRs(prior, next)).toEqual([])
  })

  it('gives a backfilled session no celebration flags', () => {
    const next = wk(7, 'bench-press', [set(140, 5)], { backfilled: true })
    expect(detectPRs(prior, next)).toEqual([])
  })
})

describe('progressionHint (double progression / 2-for-2)', () => {
  it('recommends addWeight when both recent sessions hit the top of the range', () => {
    // bench-press range {5,8}, increment 2.5.
    const workouts = [
      wk(0, 'bench-press', [set(100, 8), set(100, 8)]),
      wk(7, 'bench-press', [set(100, 8), set(100, 8)]),
    ]
    const hint = progressionHint(workouts, 'bench-press')
    expect(hint?.action).toBe('addWeight')
    expect(hint?.amountKg).toBe(2.5)
  })

  it('recommends addReps while inside the band', () => {
    const workouts = [
      wk(0, 'bench-press', [set(100, 6), set(100, 6)]),
      wk(7, 'bench-press', [set(100, 6), set(100, 6)]),
    ]
    expect(progressionHint(workouts, 'bench-press')?.action).toBe('addReps')
  })

  it('recommends hold right after a load increase', () => {
    const workouts = [
      wk(0, 'bench-press', [set(100, 8), set(100, 8)]),
      wk(7, 'bench-press', [set(102.5, 5), set(102.5, 5)]),
    ]
    expect(progressionHint(workouts, 'bench-press')?.action).toBe('hold')
  })

  it('never recommends addWeight for a bodyweight exercise', () => {
    const workouts = [
      wk(0, 'push-up', [set(undefined, 20), set(undefined, 20)]),
      wk(7, 'push-up', [set(undefined, 20), set(undefined, 20)]),
    ]
    const hint = progressionHint(workouts, 'push-up')
    expect(hint?.action).not.toBe('addWeight')
  })

  it('returns null with no set data', () => {
    expect(progressionHint([], 'bench-press')).toBeNull()
  })
})

describe('stallState + stallSuggestion', () => {
  it('reports progressing while e1RM climbs', () => {
    const workouts = [
      wk(0, 'bench-press', [set(100, 5)]),
      wk(7, 'bench-press', [set(102.5, 5)]),
      wk(14, 'bench-press', [set(105, 5)]),
    ]
    expect(stallState(workouts, 'bench-press')).toBe('progressing')
  })

  it('reports watch when e1RM is flat for the last 2 sessions', () => {
    const workouts = [
      wk(0, 'bench-press', [set(100, 5)]),
      wk(7, 'bench-press', [set(110, 5)]),
      wk(14, 'bench-press', [set(110, 5)]),
      wk(21, 'bench-press', [set(110, 5)]),
    ]
    // Rise then two flats → run of 2.
    expect(stallState(workouts, 'bench-press')).toBe('watch')
  })

  it('reports stalled after 3 flat sessions with reps under target', () => {
    // bench-press min reps = 5; log 4 sessions of 100×4 (flat e1RM, reps missed).
    const workouts = [0, 7, 14, 21].map((d) =>
      wk(d, 'bench-press', [set(100, 4), set(100, 4)]),
    )
    expect(stallState(workouts, 'bench-press')).toBe('stalled')
  })

  it('escalates the suggestion with the length of the stall run', () => {
    const flat = (n: number) =>
      Array.from({ length: n }, (_, i) => wk(i * 7, 'bench-press', [set(100, 4)]))

    // 4 sessions → run 3 → mini-deload.
    expect(stallSuggestion(flat(4), 'bench-press')?.kind).toBe('deload')
    // 5 sessions → run 4 → rep-range switch.
    expect(stallSuggestion(flat(5), 'bench-press')?.kind).toBe('repRangeSwitch')
    // 6 sessions → run 5 → variation from the same pattern.
    const variation = stallSuggestion(flat(6), 'bench-press')
    expect(variation?.kind).toBe('variation')
    expect(variation?.suggestedExerciseId).toBeTruthy()
  })

  it('returns no suggestion when not stalled', () => {
    const workouts = [wk(0, 'bench-press', [set(100, 5)])]
    expect(stallSuggestion(workouts, 'bench-press')).toBeNull()
  })

  it('escalates via RIR trending to zero even when reps are on target', () => {
    const workouts = [0, 7, 14, 21].map((d) =>
      wk(d, 'bench-press', [set(100, 6, { rir: 0 }), set(100, 6, { rir: 0 })]),
    )
    expect(stallState(workouts, 'bench-press')).toBe('stalled')
  })
})

describe('weeklySetsByPattern', () => {
  it('credits primary 1.0 and secondary 0.5 fractionally', () => {
    // Deadlift: pattern hinge; secondary back→pull, quads→squat.
    const workouts = [wk(0, 'deadlift', [set(140, 5), set(140, 5), set(140, 5)])]
    const byPattern = weeklySetsByPattern(workouts, `${BASE}T10:00:00Z`)
    const map = Object.fromEntries(byPattern.map((p) => [p.pattern, p.sets]))
    expect(map.hinge).toBe(3) // 3 working sets × 1.0
    expect(map.pull).toBe(1.5) // secondary back
    expect(map.squat).toBe(1.5) // secondary quads
  })

  it('excludes warmup sets', () => {
    const workouts = [
      wk(0, 'bench-press', [
        { weightKg: 60, reps: 5, kind: 'warmup' },
        set(100, 5),
      ]),
    ]
    const push = weeklySetsByPattern(workouts, `${BASE}T10:00:00Z`).find(
      (p) => p.pattern === 'push',
    )
    expect(push?.sets).toBe(1)
  })

  it('classifies set bands at the boundaries', () => {
    expect(classifySetBand(3)).toBe('unter Wirkschwelle')
    expect(classifySetBand(4)).toBe('Einstieg')
    expect(classifySetBand(6)).toBe('produktive Zone')
    expect(classifySetBand(10)).toBe('hohes Volumen')
    expect(classifySetBand(21)).toBe('sehr hoch')
  })
})

describe('cardioProgressionHint (ladder)', () => {
  function cardio(days: number, durationMin: number, feel?: number): Workout {
    const d = new Date(`${BASE}T10:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return makeWorkout(d.toISOString(), {
      type: 'cardio',
      durationMin,
      intensity: 'moderate',
      feel,
    })
  }

  it('prioritises frequency below 3 sessions/week', () => {
    const workouts = [cardio(0, 30), cardio(1, 30)]
    expect(cardioProgressionHint(workouts, `${BASE}T12:00:00Z`).action).toBe('frequency')
  })

  it('advances to duration once frequency is met', () => {
    const workouts = [
      cardio(-7, 120), // last week total 120 min
      cardio(0, 30),
      cardio(1, 30),
      cardio(2, 30),
    ]
    // now = BASE+2 so all three this-week days count (frequency met). This
    // week's 90 min is still under last week's +10% ceiling (132) → duration rung.
    const at = new Date(`${BASE}T10:00:00Z`)
    at.setUTCDate(at.getUTCDate() + 2)
    expect(cardioProgressionHint(workouts, at.toISOString()).action).toBe('duration')
  })

  it('adds a polarization note when recent cardio is mostly hard', () => {
    const workouts = [cardio(0, 30, 8), cardio(1, 30, 8), cardio(2, 30, 8)]
    const at = new Date(`${BASE}T10:00:00Z`)
    at.setUTCDate(at.getUTCDate() + 2)
    expect(cardioProgressionHint(workouts, at.toISOString()).polarizationNote).toBeTruthy()
  })
})

describe('ghostBeats + egoLift', () => {
  it('flags an exercise that beats its own last session', () => {
    const prior = [wk(0, 'bench-press', [set(100, 5)])]
    const next = wk(7, 'bench-press', [set(100, 6)]) // 600 > 500
    expect(ghostBeats(prior, next)).toEqual(['bench-press'])
  })

  it('does not beat a ghost on the first-ever session', () => {
    expect(ghostBeats([], wk(0, 'bench-press', [set(100, 5)]))).toEqual([])
  })

  it('bestSetMetric falls back to reps for bodyweight', () => {
    expect(bestSetMetric([set(undefined, 12), set(undefined, 15)])).toBe(15)
  })

  it('flags an ego-lift when weight jumps > 2× increment', () => {
    const prior = [wk(0, 'bench-press', [set(100, 5)])]
    // bench increment 2.5 → jump of 10 kg (> 5) is an ego-lift.
    const next = wk(7, 'bench-press', [set(110, 5)])
    expect(egoLiftExercises(prior, next).has('bench-press')).toBe(true)
    // A clean +2.5 kg jump is not.
    const clean = wk(7, 'bench-press', [set(102.5, 5)])
    expect(egoLiftExercises(prior, clean).has('bench-press')).toBe(false)
  })
})
