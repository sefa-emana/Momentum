/**
 * Barbell plate calculator — a small, pure helper for the loading popover.
 *
 * Given a target total weight and a bar weight, work out which plates go on
 * EACH SIDE (a barbell is loaded symmetrically). Greedy from the largest plate
 * down — with standard kg plates this is optimal and matches how a lifter
 * actually loads a bar. Anything the available plates can't represent exactly
 * is reported as a per-side `remainderKg` so the UI can stay honest ("≈").
 */

/** Standard kg plate denominations, largest first. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25]

/** Olympic barbell default (kg). Editable in the popover. */
export const DEFAULT_BAR_KG = 20

export interface PlateBreakdown {
  barKg: number
  /** Plates for ONE side, descending. Mirror on the other side. */
  perSide: number[]
  /** Per-side weight the available plates could not represent exactly (kg). */
  remainderKg: number
  /** True when the target is reachable exactly with the given bar + plates. */
  achievable: boolean
}

/**
 * Plates per side to reach `totalKg` on a `barKg` bar. Pure + deterministic.
 * Returns an empty breakdown (achievable only if total === bar) when the target
 * is at or below the bar. A tiny epsilon guards float dust from the 1.25/2.5 kg
 * steps.
 */
export function platesPerSide(
  totalKg: number,
  barKg: number = DEFAULT_BAR_KG,
  plates: number[] = DEFAULT_PLATES_KG,
): PlateBreakdown {
  const perSideTarget = (totalKg - barKg) / 2
  if (perSideTarget <= 1e-9) {
    return {
      barKg,
      perSide: [],
      remainderKg: 0,
      achievable: Math.abs(totalKg - barKg) < 1e-9,
    }
  }

  const sorted = [...plates].sort((a, b) => b - a)
  const perSide: number[] = []
  let remaining = perSideTarget
  for (const p of sorted) {
    while (remaining + 1e-9 >= p) {
      perSide.push(p)
      remaining -= p
    }
  }
  const remainderKg = Math.round(remaining * 100) / 100
  return {
    barKg,
    perSide,
    remainderKg,
    achievable: remainderKg < 1e-9,
  }
}

/** Compact per-side label, e.g. "20 + 5 + 2,5" (German decimal comma). */
export function formatPerSide(perSide: number[]): string {
  if (perSide.length === 0) return '–'
  return perSide
    .map((p) => p.toLocaleString('de-DE', { maximumFractionDigits: 2 }))
    .join(' + ')
}
