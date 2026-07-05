import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BAR_KG,
  formatPerSide,
  platesPerSide,
} from './plates'

describe('platesPerSide', () => {
  it('splits a clean load symmetrically per side', () => {
    // 60 kg on a 20 kg bar → 20 kg per side → one 20 plate.
    expect(platesPerSide(60).perSide).toEqual([20])
    // 100 kg → 40/side → 25 + 15.
    expect(platesPerSide(100).perSide).toEqual([25, 15])
    // 62.5 → 21.25/side → 20 + 1.25.
    expect(platesPerSide(62.5).perSide).toEqual([20, 1.25])
  })

  it('handles the bar alone and sub-bar targets', () => {
    expect(platesPerSide(DEFAULT_BAR_KG)).toEqual({
      barKg: 20,
      perSide: [],
      remainderKg: 0,
      achievable: true,
    })
    const light = platesPerSide(10)
    expect(light.perSide).toEqual([])
    expect(light.achievable).toBe(false)
  })

  it('reports an honest per-side remainder when unrepresentable', () => {
    // 61 kg → 20.5/side. Smallest plate is 1.25 → 20 fits, 0.5 remainder.
    const b = platesPerSide(61)
    expect(b.perSide).toEqual([20])
    expect(b.remainderKg).toBeCloseTo(0.5, 2)
    expect(b.achievable).toBe(false)
  })

  it('respects a custom bar weight and plate set', () => {
    // 50 kg on a 15 kg bar → 17.5/side with default plates → 15 + 2.5.
    expect(platesPerSide(50, 15).perSide).toEqual([15, 2.5])
    // Restricted plate set (only 20s) → 100 kg → 40/side → 20 + 20.
    expect(platesPerSide(100, 20, [20]).perSide).toEqual([20, 20])
  })

  it('formats a per-side label with German decimals', () => {
    expect(formatPerSide([20, 5, 2.5])).toBe('20 + 5 + 2,5')
    expect(formatPerSide([])).toBe('–')
  })
})
