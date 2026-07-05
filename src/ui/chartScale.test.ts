import { describe, expect, it } from 'vitest'
import { kwLabel, projectY, xPositions, yBounds } from './chartScale'

describe('yBounds', () => {
  it('falls back to [0,1] for an empty series', () => {
    expect(yBounds([])).toEqual({ min: 0, max: 1 })
  })

  it('pads a flat series around its single value', () => {
    const b = yBounds([50, 50, 50])
    expect(b.min).toBeLessThan(50)
    expect(b.max).toBeGreaterThan(50)
    // symmetric padding
    expect(50 - b.min).toBeCloseTo(b.max - 50)
  })

  it('adds proportional head/foot room to a varied series', () => {
    const b = yBounds([100, 200], 0.1)
    // range 100 → 10% padding each side
    expect(b.min).toBeCloseTo(90)
    expect(b.max).toBeCloseTo(210)
  })

  it('keeps the true extrema inside the bounds', () => {
    const vals = [12, 45, 33, 67, 21]
    const b = yBounds(vals)
    expect(b.min).toBeLessThanOrEqual(Math.min(...vals))
    expect(b.max).toBeGreaterThanOrEqual(Math.max(...vals))
  })
})

describe('projectY', () => {
  const bounds = { min: 0, max: 100 }

  it('maps the max to the top (small y) and min to the bottom', () => {
    expect(projectY(100, bounds, 200)).toBeCloseTo(0)
    expect(projectY(0, bounds, 200)).toBeCloseTo(200)
    expect(projectY(50, bounds, 200)).toBeCloseTo(100)
  })

  it('respects top/bottom padding', () => {
    // usable height = 200 - 10 - 10 = 180, max sits at padTop
    expect(projectY(100, bounds, 200, 10, 10)).toBeCloseTo(10)
    expect(projectY(0, bounds, 200, 10, 10)).toBeCloseTo(190)
  })

  it('centres a degenerate (zero-span) series', () => {
    expect(projectY(5, { min: 5, max: 5 }, 100)).toBeCloseTo(50)
  })
})

describe('xPositions', () => {
  it('returns nothing for an empty series', () => {
    expect(xPositions(0, 100)).toEqual([])
  })

  it('centres a single point', () => {
    expect(xPositions(1, 100)).toEqual([50])
  })

  it('spreads points edge-to-edge', () => {
    expect(xPositions(3, 100)).toEqual([0, 50, 100])
  })
})

describe('kwLabel', () => {
  it('formats an ISO week key', () => {
    expect(kwLabel('2026-W27')).toBe('KW 27')
    expect(kwLabel('2026-W03')).toBe('KW 3')
  })

  it('passes through an unexpected shape', () => {
    expect(kwLabel('nope')).toBe('nope')
  })
})
