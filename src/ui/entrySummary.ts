/**
 * Compact one-line summary of a workout's set entries for history rows, e.g.
 * "Bankdrücken 3×8 @ 60 kg · Rudern 3×10". Presentation-only (needs display
 * names), so it lives in the UI layer.
 */
import {
  isWorkingSet,
  resolveExercise,
  type ExerciseDef,
  type SetEntry,
  type Workout,
} from '../domain'

function fmt(v: number): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

/** "3×8 @ 60 kg" for one exercise's working sets (heaviest set is representative). */
function describeSets(sets: SetEntry[]): string {
  const working = sets.filter(isWorkingSet)
  if (working.length === 0) return ''
  let top = working[0]
  for (const s of working) {
    if ((s.weightKg ?? 0) > (top.weightKg ?? 0)) top = s
  }
  const reps = top.reps
  const parts = [`${working.length}×${reps ?? '–'}`]
  if (top.weightKg !== undefined && top.weightKg > 0) parts.push(`@ ${fmt(top.weightKg)} kg`)
  return parts.join(' ')
}

/** Summary line for a workout with entries, truncated to `maxExercises`. */
export function summarizeEntries(
  workout: Workout,
  customExercises: ExerciseDef[] = [],
  maxExercises = 3,
): string {
  if (!workout.entries || workout.entries.length === 0) return ''
  const parts = workout.entries.slice(0, maxExercises).map((e) => {
    const name = resolveExercise(e.exerciseId, customExercises)?.name ?? e.exerciseId
    const sets = describeSets(e.sets)
    return sets ? `${name} ${sets}` : name
  })
  const more = workout.entries.length - maxExercises
  return parts.join(' · ') + (more > 0 ? ' …' : '')
}
