import { describe, expect, it } from 'vitest'
import { BADGE_FROM_HOUR, shouldShowBadge, type BadgeConditions } from './badge'

/** A day with the given local hour. */
function at(hour: number): Date {
  const d = new Date('2026-06-01T00:00:00')
  d.setHours(hour, 0, 0, 0)
  return d
}

const base: BadgeConditions = {
  trainedToday: false,
  currentStreak: 3,
  paused: false,
  now: at(BADGE_FROM_HOUR),
}

describe('shouldShowBadge', () => {
  it('shows the nudge in the evening when a streak is at stake and untrained', () => {
    expect(shouldShowBadge(base)).toBe(true)
    expect(shouldShowBadge({ ...base, now: at(20) })).toBe(true)
    expect(shouldShowBadge({ ...base, now: at(23) })).toBe(true)
  })

  it('never nudges before the evening cutoff (protect rest)', () => {
    expect(shouldShowBadge({ ...base, now: at(BADGE_FROM_HOUR - 1) })).toBe(false)
    expect(shouldShowBadge({ ...base, now: at(9) })).toBe(false)
    expect(shouldShowBadge({ ...base, now: at(0) })).toBe(false)
  })

  it('never nudges once trained today', () => {
    expect(shouldShowBadge({ ...base, trainedToday: true })).toBe(false)
  })

  it('never nudges without an active streak to protect', () => {
    expect(shouldShowBadge({ ...base, currentStreak: 0 })).toBe(false)
    expect(shouldShowBadge({ ...base, currentStreak: -1 })).toBe(false)
  })

  it('never nudges during a "Life happened" pause', () => {
    expect(shouldShowBadge({ ...base, paused: true })).toBe(false)
    // Pause dominates even when every other condition would show it.
    expect(shouldShowBadge({ ...base, paused: true, now: at(22) })).toBe(false)
  })
})
