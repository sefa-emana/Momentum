import { describe, expect, it } from 'vitest'
import { dayKey, daysBetween, isInThisWeek, weekKey } from './dates'

describe('daysBetween', () => {
  it('counts whole calendar days', () => {
    expect(daysBetween('2026-06-01T23:00:00Z', '2026-06-02T01:00:00Z')).toBe(1)
  })

  it('is zero within the same day', () => {
    expect(daysBetween('2026-06-01T08:00:00Z', '2026-06-01T22:00:00Z')).toBe(0)
  })
})

describe('dayKey', () => {
  it('produces a YYYY-MM-DD key', () => {
    expect(dayKey('2026-06-01T15:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isInThisWeek', () => {
  it('recognises dates in the same Monday-based week', () => {
    // 2026-06-01 Monday .. 2026-06-07 Sunday
    expect(isInThisWeek('2026-06-03', '2026-06-01')).toBe(true)
    expect(isInThisWeek('2026-06-07', '2026-06-01')).toBe(true)
  })

  it('excludes dates from adjacent weeks', () => {
    expect(isInThisWeek('2026-05-31', '2026-06-01')).toBe(false)
    expect(isInThisWeek('2026-06-08', '2026-06-01')).toBe(false)
  })
})

describe('weekKey', () => {
  it('is stable within a week and changes across weeks', () => {
    const a = weekKey('2026-06-01')
    const b = weekKey('2026-06-05')
    const c = weekKey('2026-06-08')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
