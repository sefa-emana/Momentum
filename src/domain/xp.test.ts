import { describe, expect, it } from 'vitest'
import { levelFromXp, totalXpToReachLevel, xpForWorkout } from './xp'
import { XP_BASE } from './constants'

describe('xpForWorkout', () => {
  it('awards base XP plus duration scaled by intensity', () => {
    const xp = xpForWorkout({
      durationMin: 30,
      intensity: 'moderate',
      momentum: 0,
      priorSameDayCount: 0,
    })
    // 20 base + 30 * 1.1 = 53
    expect(xp).toBe(53)
  })

  it('scales with intensity', () => {
    const light = xpForWorkout({ durationMin: 30, intensity: 'light', momentum: 0, priorSameDayCount: 0 })
    const vigorous = xpForWorkout({ durationMin: 30, intensity: 'vigorous', momentum: 0, priorSameDayCount: 0 })
    expect(vigorous).toBeGreaterThan(light)
  })

  it('adds a momentum bonus', () => {
    const noMomentum = xpForWorkout({ durationMin: 30, intensity: 'moderate', momentum: 0, priorSameDayCount: 0 })
    const highMomentum = xpForWorkout({ durationMin: 30, intensity: 'moderate', momentum: 100, priorSameDayCount: 0 })
    expect(highMomentum).toBe(noMomentum + 20) // floor(100/5)
  })

  it('applies diminishing returns for repeated same-day sessions', () => {
    const first = xpForWorkout({ durationMin: 30, intensity: 'moderate', momentum: 0, priorSameDayCount: 0 })
    const second = xpForWorkout({ durationMin: 30, intensity: 'moderate', momentum: 0, priorSameDayCount: 1 })
    const third = xpForWorkout({ durationMin: 30, intensity: 'moderate', momentum: 0, priorSameDayCount: 2 })
    expect(second).toBeLessThan(first)
    expect(third).toBeLessThan(second)
  })

  it('honours the tiny-habit floor for very short sessions', () => {
    const xp = xpForWorkout({ durationMin: 5, intensity: 'light', momentum: 0, priorSameDayCount: 0 })
    expect(xp).toBeGreaterThanOrEqual(XP_BASE)
  })

  it('caps duration to prevent gaming', () => {
    const long = xpForWorkout({ durationMin: 600, intensity: 'moderate', momentum: 0, priorSameDayCount: 0 })
    const capped = xpForWorkout({ durationMin: 120, intensity: 'moderate', momentum: 0, priorSameDayCount: 0 })
    expect(long).toBe(capped)
  })

  it('never returns less than 1', () => {
    const xp = xpForWorkout({ durationMin: 0, intensity: 'light', momentum: 0, priorSameDayCount: 9 })
    expect(xp).toBeGreaterThanOrEqual(1)
  })
})

describe('level curve', () => {
  it('level 1 requires 0 XP', () => {
    expect(totalXpToReachLevel(1)).toBe(0)
  })

  it('matches the designed progression', () => {
    expect(totalXpToReachLevel(2)).toBe(100)
    expect(totalXpToReachLevel(3)).toBe(283)
    expect(totalXpToReachLevel(6)).toBe(1118)
    expect(totalXpToReachLevel(11)).toBe(3162)
  })

  it('is strictly increasing', () => {
    for (let l = 1; l < 50; l++) {
      expect(totalXpToReachLevel(l + 1)).toBeGreaterThan(totalXpToReachLevel(l))
    }
  })
})

describe('levelFromXp', () => {
  it('starts at level 1 with zero XP', () => {
    const info = levelFromXp(0)
    expect(info.level).toBe(1)
    expect(info.xpIntoLevel).toBe(0)
    expect(info.progress).toBe(0)
  })

  it('levels up exactly at the threshold', () => {
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(283).level).toBe(3)
  })

  it('reports progress within a level', () => {
    const info = levelFromXp(150)
    expect(info.level).toBe(2)
    expect(info.xpIntoLevel).toBe(50)
    expect(info.xpForNextLevel).toBe(183)
    expect(info.progress).toBeCloseTo(50 / 183, 5)
  })

  it('is consistent with the inverse curve across a wide range', () => {
    for (let l = 1; l <= 40; l++) {
      const at = totalXpToReachLevel(l)
      expect(levelFromXp(at).level).toBe(l)
      if (l < 40) expect(levelFromXp(at - 1).level).toBe(l - 1 || 1)
    }
  })

  it('handles negative/garbage input gracefully', () => {
    expect(levelFromXp(-500).level).toBe(1)
  })
})
