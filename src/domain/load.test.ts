import { describe, expect, it } from 'vitest'
import {
  acuteLoad,
  chronicLoad,
  countComebacks,
  dailyLoads,
  loadRatio,
  loadTrend,
  monotony,
  monotonyStatus,
  overreachStatus,
  sessionLoad,
  strain,
  strengthSessionsThisWeek,
  weeklyWhoPoints,
  whoWeeksMet,
} from './load'
import { makeWorkout, dayOffset } from './testHelpers'

// 2026-06-01 is a Monday.
const BASE = '2026-06-01'

describe('sessionLoad', () => {
  it('uses the intensity RPE weight × capped minutes', () => {
    expect(sessionLoad(makeWorkout(BASE, { intensity: 'moderate', durationMin: 30 }))).toBe(150)
    expect(sessionLoad(makeWorkout(BASE, { intensity: 'light', durationMin: 30 }))).toBe(90)
    expect(sessionLoad(makeWorkout(BASE, { intensity: 'vigorous', durationMin: 30 }))).toBe(240)
  })

  it('prefers a post-session feel RPE when present', () => {
    expect(sessionLoad(makeWorkout(BASE, { intensity: 'light', durationMin: 30, feel: 9 }))).toBe(270)
  })

  it('caps duration at 180 minutes', () => {
    expect(sessionLoad(makeWorkout(BASE, { intensity: 'moderate', durationMin: 300 }))).toBe(
      5 * 180,
    )
  })
})

describe('dailyLoads', () => {
  it('returns per-day sums oldest-first with zeros for rest days', () => {
    const w = [makeWorkout(dayOffset(BASE, 0), { intensity: 'moderate', durationMin: 30 })]
    expect(dailyLoads(w, dayOffset(BASE, 2), 3)).toEqual([150, 0, 0])
  })

  it('sums multiple sessions on the same day', () => {
    const w = [
      makeWorkout(`${BASE}T08:00:00Z`, { intensity: 'moderate', durationMin: 30 }),
      makeWorkout(`${BASE}T18:00:00Z`, { intensity: 'moderate', durationMin: 30 }),
    ]
    expect(dailyLoads(w, BASE, 1)).toEqual([300])
  })

  it('is empty-safe', () => {
    expect(dailyLoads([], BASE, 3)).toEqual([0, 0, 0])
  })
})

describe('acuteLoad', () => {
  it('sums the last 7 days', () => {
    const w = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(acuteLoad(w, dayOffset(BASE, 2))).toBe(450)
  })

  it('is zero for an empty history', () => {
    expect(acuteLoad([], BASE)).toBe(0)
  })
})

describe('chronicLoad', () => {
  it('is null before 14 days of history (no reliable baseline)', () => {
    const w = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(chronicLoad(w, dayOffset(BASE, 13))).toBeNull()
  })

  it('is null for an empty history', () => {
    expect(chronicLoad([], BASE)).toBeNull()
  })

  it('is the average weekly load over the four preceding blocks', () => {
    // 35 consecutive moderate 30-min sessions = 150 AU/day everywhere.
    const w = Array.from({ length: 35 }, (_, d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    // days 8–35 (28 days) × 150 = 4200, / 4 blocks = 1050.
    expect(chronicLoad(w, dayOffset(BASE, 34))).toBe(1050)
  })
})

describe('loadRatio', () => {
  it('is null when chronic is unavailable', () => {
    const w = [0, 1].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(loadRatio(w, dayOffset(BASE, 1))).toBeNull()
  })

  it('is ~1 for steady training', () => {
    const w = Array.from({ length: 35 }, (_, d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(loadRatio(w, dayOffset(BASE, 34))).toBeCloseTo(1, 5)
  })

  it('rises above 1.5 for a real load spike', () => {
    const w = Array.from({ length: 35 }, (_, d) =>
      makeWorkout(dayOffset(BASE, d), {
        durationMin: 30,
        intensity: d >= 28 ? 'vigorous' : 'moderate',
      }),
    )
    // acute = 7×240 = 1680, chronic = 1050 → ratio ≈ 1.6.
    expect(loadRatio(w, dayOffset(BASE, 34))!).toBeGreaterThan(1.5)
  })
})

describe('monotony & strain', () => {
  it('is null with under 7 days of history', () => {
    const w = [makeWorkout(BASE)]
    expect(monotony(w, dayOffset(BASE, 3))).toBeNull()
  })

  it('is null when every day carries the same load (SD 0)', () => {
    const w = Array.from({ length: 8 }, (_, d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(monotony(w, dayOffset(BASE, 7))).toBeNull()
  })

  it('is a positive ratio for varied training', () => {
    // Train days 0–2 then rest days 3–6: uneven distribution → finite monotony.
    const w = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    const m = monotony(w, dayOffset(BASE, 6))
    expect(m).not.toBeNull()
    expect(m!).toBeGreaterThan(0)
  })

  it('strain is null when monotony is null and finite otherwise', () => {
    expect(strain([makeWorkout(BASE)], dayOffset(BASE, 3))).toBeNull()
    const w = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(strain(w, dayOffset(BASE, 6))!).toBeGreaterThan(0)
  })
})

describe('weeklyWhoPoints & strengthSessionsThisWeek', () => {
  it('scores moderate 1/min and vigorous 2/min, light 0', () => {
    const w = [
      makeWorkout(dayOffset(BASE, 0), { intensity: 'moderate', durationMin: 30 }),
      makeWorkout(dayOffset(BASE, 1), { intensity: 'vigorous', durationMin: 20 }),
      makeWorkout(dayOffset(BASE, 2), { intensity: 'light', durationMin: 60 }),
    ]
    // 30×1 + 20×2 + 60×0 = 70.
    expect(weeklyWhoPoints(w, dayOffset(BASE, 3))).toBe(70)
  })

  it('excludes other weeks', () => {
    const w = [
      makeWorkout(dayOffset(BASE, -3), { intensity: 'moderate', durationMin: 30 }),
      makeWorkout(dayOffset(BASE, 1), { intensity: 'moderate', durationMin: 30 }),
    ]
    expect(weeklyWhoPoints(w, dayOffset(BASE, 1))).toBe(30)
  })

  it('counts strength sessions this week', () => {
    const w = [
      makeWorkout(dayOffset(BASE, 0), { type: 'strength' }),
      makeWorkout(dayOffset(BASE, 1), { type: 'cardio' }),
      makeWorkout(dayOffset(BASE, 2), { type: 'strength' }),
    ]
    expect(strengthSessionsThisWeek(w, dayOffset(BASE, 3))).toBe(2)
  })
})

describe('loadTrend', () => {
  it('compares this ISO week to the previous one', () => {
    const w = [
      makeWorkout(dayOffset(BASE, -7), { durationMin: 30 }), // last week: 150
      makeWorkout(dayOffset(BASE, 0), { durationMin: 30 }), // this week: 150
      makeWorkout(dayOffset(BASE, 1), { durationMin: 30 }), // this week: 150
    ]
    const t = loadTrend(w, dayOffset(BASE, 1))
    expect(t.lastWeek).toBe(150)
    expect(t.thisWeek).toBe(300)
    expect(t.delta).toBe(150)
  })
})

describe('overreachStatus', () => {
  it('is none without a chronic baseline (beginners never see it)', () => {
    const w = [0, 1].map((d) => makeWorkout(dayOffset(BASE, d)))
    expect(overreachStatus(w, dayOffset(BASE, 1))).toBe('none')
  })

  it('is elevated for a large sustained spike', () => {
    const w = Array.from({ length: 35 }, (_, d) =>
      makeWorkout(dayOffset(BASE, d), {
        durationMin: 30,
        intensity: d >= 28 ? 'vigorous' : 'moderate',
      }),
    )
    expect(overreachStatus(w, dayOffset(BASE, 34))).toBe('elevated')
  })

  it('stays none for steady training even with a chronic baseline', () => {
    const w = Array.from({ length: 35 }, (_, d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(overreachStatus(w, dayOffset(BASE, 34))).toBe('none')
  })
})

describe('monotonyStatus', () => {
  it('is none for an empty history', () => {
    expect(monotonyStatus([], BASE)).toBe('none')
  })

  it('is none when monotony is low', () => {
    const w = [0, 1, 2].map((d) => makeWorkout(dayOffset(BASE, d), { durationMin: 30 }))
    expect(monotonyStatus(w, dayOffset(BASE, 6))).toBe('none')
  })
})

describe('whoWeeksMet', () => {
  it('counts distinct ISO weeks that reached the 150-point target', () => {
    const workouts = [
      // Week 1: 150 points (moderate 90 min + vigorous 30 min) → met.
      makeWorkout(dayOffset(BASE, 0), { intensity: 'moderate', durationMin: 90 }),
      makeWorkout(dayOffset(BASE, 1), { intensity: 'vigorous', durationMin: 30 }),
      // Week 3: only 40 points → not met.
      makeWorkout(dayOffset(BASE, 14), { intensity: 'moderate', durationMin: 40 }),
      // Week 5: 200 points → met.
      makeWorkout(dayOffset(BASE, 28), { intensity: 'vigorous', durationMin: 100 }),
    ]
    expect(whoWeeksMet(workouts)).toBe(2)
  })

  it('is zero with no qualifying weeks', () => {
    const workouts = [makeWorkout(BASE, { intensity: 'light', durationMin: 60 })]
    expect(whoWeeksMet(workouts)).toBe(0)
  })

  it('accepts a custom target', () => {
    const workouts = [makeWorkout(BASE, { intensity: 'moderate', durationMin: 60 })]
    expect(whoWeeksMet(workouts, 50)).toBe(1)
    expect(whoWeeksMet(workouts, 100)).toBe(0)
  })
})

describe('countComebacks', () => {
  it('counts gaps of at least COMEBACK_GAP_DAYS between sessions', () => {
    const workouts = [
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 5)), // 5-day gap → comeback
      makeWorkout(dayOffset(BASE, 6)), // consecutive → not
      makeWorkout(dayOffset(BASE, 20)), // 14-day gap → comeback
    ]
    expect(countComebacks(workouts)).toBe(2)
  })

  it('is order-independent', () => {
    const workouts = [
      makeWorkout(dayOffset(BASE, 20)),
      makeWorkout(dayOffset(BASE, 0)),
      makeWorkout(dayOffset(BASE, 5)),
    ]
    expect(countComebacks(workouts)).toBe(2)
  })

  it('is zero for a single or no workout', () => {
    expect(countComebacks([])).toBe(0)
    expect(countComebacks([makeWorkout(BASE)])).toBe(0)
  })
})
