/**
 * Presentation metadata for exercises — German labels for movement patterns,
 * equipment and PR kinds. Kept in the UI layer so the domain stays
 * presentation-free (mirrors how WORKOUT_TYPE_META etc. work).
 */
import type { Equipment, ExercisePattern } from '../domain'
import type { PRKind } from '../domain'

/** German group headers for the exercise picker, in display order. */
export const PATTERN_LABEL: Record<ExercisePattern, string> = {
  push: 'Drücken',
  pull: 'Ziehen',
  squat: 'Kniebeugen',
  hinge: 'Hüfte',
  core: 'Rumpf',
  carry: 'Tragen',
  cardio: 'Cardio',
}

/** Stable pattern order for grouped rendering. */
export const PATTERN_ORDER: ExercisePattern[] = [
  'push',
  'pull',
  'squat',
  'hinge',
  'core',
  'carry',
  'cardio',
]

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  machine: 'Maschine',
  cable: 'Kabel',
  bodyweight: 'Körpergewicht',
  kettlebell: 'Kettlebell',
  cardio: 'Cardio',
}

/** German PR labels + emoji, per kind (e1RM leads as the honest strength signal). */
export const PR_KIND_LABEL: Record<PRKind, string> = {
  e1rm: 'e1RM-Rekord',
  weight: 'Gewichts-Rekord',
  rep: 'Wdh.-Rekord',
  volume: 'Volumen-Rekord',
}
