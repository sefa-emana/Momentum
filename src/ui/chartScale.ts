/**
 * Pure chart geometry helpers shared by the hand-rolled SVG charts
 * (TrendChart / BarsChart). No React, no DOM — just the scale math and label
 * formatting, so it is trivially unit-testable and identical across charts.
 */

export interface YBounds {
  min: number
  max: number
}

/**
 * Auto-scaled y-bounds for a value series with a little head/foot room so the
 * line never touches the frame. A flat series (all equal) is padded around its
 * single value; an empty series falls back to [0, 1].
 */
export function yBounds(values: number[], padFrac = 0.12): YBounds {
  if (values.length === 0) return { min: 0, max: 1 }
  let lo = values[0]
  let hi = values[0]
  for (const v of values) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  if (lo === hi) {
    const pad = Math.max(1, Math.abs(hi) * 0.1)
    return { min: lo - pad, max: hi + pad }
  }
  const range = hi - lo
  return { min: lo - range * padFrac, max: hi + range * padFrac }
}

/**
 * Project a value to a y pixel coordinate (SVG space, origin top-left) inside a
 * chart of the given height with top/bottom padding. Higher values map to
 * smaller y (upwards). Degenerate bounds collapse to the vertical middle.
 */
export function projectY(
  value: number,
  bounds: YBounds,
  height: number,
  padTop = 0,
  padBottom = 0,
): number {
  const usable = height - padTop - padBottom
  const span = bounds.max - bounds.min
  if (span <= 0) return padTop + usable / 2
  const t = (value - bounds.min) / span
  return padTop + usable * (1 - t)
}

/** Evenly spaced x coordinates for `n` points across `width` (single point → centre). */
export function xPositions(n: number, width: number): number[] {
  if (n <= 0) return []
  if (n === 1) return [width / 2]
  const step = width / (n - 1)
  return Array.from({ length: n }, (_, i) => i * step)
}

/**
 * Short German ISO-week label: '2026-W27' → 'KW 27'. Passes anything that does
 * not match the expected shape straight through (defensive).
 */
export function kwLabel(weekKey: string): string {
  const m = /W(\d+)$/.exec(weekKey)
  return m ? `KW ${Number(m[1])}` : weekKey
}
