/**
 * Curated exercise database — the vocabulary the Progression Engine v2 reasons
 * over. Deliberately opinionated and finite (~100 movements) rather than an
 * exhaustive dump: a small, well-classified set is what lets the double-
 * progression, stall and weekly-volume logic stay meaningful (the S-curve
 * leitplanke — "verdaulich vielfältig", not overwhelming).
 *
 * Every field feeds a concrete decision:
 *  - `pattern`/`primaryMuscles`/`secondaryMuscles` → weekly hard-set balance.
 *  - `loadType` → whether an e1RM is even meaningful (bodyweight/time/distance
 *    movements progress on reps/volume, never Epley).
 *  - `sizeClass` → rest-timer default (large 180 s, medium 120 s, small 90 s).
 *  - `defaultRepRange` → the 2-for-2 double-progression target band.
 *  - `incrementKg` → the smallest honest load jump (also the ego-lift guard unit).
 *
 * User-defined CUSTOM exercises share this exact shape and live in app state
 * (`customExercises`, ids prefixed `custom-`); `resolveExercise` merges them.
 */

/** Curated muscle-group enum (intentionally coarse — the granularity a weekly
 *  volume band can actually be reasoned about, not anatomical completeness). */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'fullBody'

/** Movement pattern — the axis weekly hard sets are balanced across. */
export type ExercisePattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'core'
  | 'carry'
  | 'cardio'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'cardio'

/** How a set is measured — decides which progression math applies. */
export type LoadType = 'external' | 'bodyweight' | 'time' | 'distance'

/** Coarse size, only used to pick a sensible default rest timer. */
export type SizeClass = 'small' | 'medium' | 'large'

export interface ExerciseDef {
  /** Stable slug, e.g. 'bench-press'. Custom exercises are prefixed 'custom-'. */
  id: string
  /** German display name, e.g. 'Bankdrücken'. */
  name: string
  category: 'strength' | 'cardio'
  pattern: ExercisePattern
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment
  loadType: LoadType
  sizeClass: SizeClass
  /** Target rep band for double progression, e.g. {min:8,max:12}. */
  defaultRepRange: { min: number; max: number }
  /** Smallest honest load increment (kg). 0 for bodyweight/cardio. */
  incrementKg: number
}

/** Default rest-timer seconds by size class (large compounds need the most). */
export const REST_SECONDS_BY_SIZE: Record<SizeClass, number> = {
  large: 180,
  medium: 120,
  small: 90,
}

/** Default rest-timer seconds for an exercise (falls back to medium). */
export function restSecondsFor(def: ExerciseDef | undefined): number {
  return REST_SECONDS_BY_SIZE[def?.sizeClass ?? 'medium']
}

// Terse builder to keep the table readable without losing type-safety.
function ex(
  id: string,
  name: string,
  pattern: ExercisePattern,
  equipment: Equipment,
  loadType: LoadType,
  sizeClass: SizeClass,
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  repRange: [number, number],
  incrementKg: number,
  category: 'strength' | 'cardio' = 'strength',
): ExerciseDef {
  return {
    id,
    name,
    category,
    pattern,
    primaryMuscles,
    secondaryMuscles,
    equipment,
    loadType,
    sizeClass,
    defaultRepRange: { min: repRange[0], max: repRange[1] },
    incrementKg,
  }
}

/**
 * The built-in exercise table. Order is display order; ids are the stable key.
 * Barbell compounds default to the {5,8} strength band; accessories to {8,12};
 * small isolation to higher bands. Lower-body barbell steps 5 kg, upper 2.5 kg,
 * dumbbells 2 kg, machines/cables 2.5 kg, kettlebells 4 kg (bodyweight/cardio 0).
 */
export const EXERCISES: ExerciseDef[] = [
  // --- Barbell compounds ---------------------------------------------------
  ex('back-squat', 'Kniebeuge', 'squat', 'barbell', 'external', 'large', ['quads'], ['glutes', 'hamstrings', 'core'], [5, 8], 5),
  ex('front-squat', 'Frontkniebeuge', 'squat', 'barbell', 'external', 'large', ['quads'], ['glutes', 'core'], [5, 8], 5),
  ex('deadlift', 'Kreuzheben', 'hinge', 'barbell', 'external', 'large', ['hamstrings', 'glutes'], ['back', 'quads'], [5, 8], 5),
  ex('romanian-deadlift', 'Rumänisches Kreuzheben', 'hinge', 'barbell', 'external', 'large', ['hamstrings', 'glutes'], ['back'], [8, 12], 5),
  ex('sumo-deadlift', 'Sumo-Kreuzheben', 'hinge', 'barbell', 'external', 'large', ['glutes', 'hamstrings'], ['quads', 'back'], [5, 8], 5),
  ex('bench-press', 'Bankdrücken', 'push', 'barbell', 'external', 'large', ['chest'], ['triceps', 'shoulders'], [5, 8], 2.5),
  ex('incline-bench-press', 'Schrägbankdrücken', 'push', 'barbell', 'external', 'large', ['chest', 'shoulders'], ['triceps'], [6, 10], 2.5),
  ex('close-grip-bench', 'Enges Bankdrücken', 'push', 'barbell', 'external', 'medium', ['triceps'], ['chest', 'shoulders'], [6, 10], 2.5),
  ex('overhead-press', 'Schulterdrücken (Langhantel)', 'push', 'barbell', 'external', 'large', ['shoulders'], ['triceps'], [5, 8], 2.5),
  ex('barbell-row', 'Langhantelrudern', 'pull', 'barbell', 'external', 'large', ['back'], ['biceps', 'shoulders'], [6, 10], 2.5),
  ex('pendlay-row', 'Pendlay-Rudern', 'pull', 'barbell', 'external', 'large', ['back'], ['biceps'], [5, 8], 2.5),
  ex('barbell-hip-thrust', 'Hip Thrust (Langhantel)', 'hinge', 'barbell', 'external', 'large', ['glutes'], ['hamstrings'], [8, 12], 5),
  ex('good-morning', 'Good Morning', 'hinge', 'barbell', 'external', 'large', ['hamstrings', 'glutes'], ['back'], [8, 12], 5),
  ex('power-clean', 'Umsetzen (Power Clean)', 'hinge', 'barbell', 'external', 'large', ['fullBody'], ['back', 'quads', 'shoulders'], [3, 5], 5),
  ex('barbell-lunge', 'Ausfallschritt (Langhantel)', 'squat', 'barbell', 'external', 'large', ['quads', 'glutes'], ['hamstrings'], [8, 12], 5),
  ex('barbell-curl', 'Langhantel-Curl', 'pull', 'barbell', 'external', 'small', ['biceps'], [], [8, 12], 2.5),

  // --- Dumbbell staples ----------------------------------------------------
  ex('dumbbell-bench-press', 'Kurzhantel-Bankdrücken', 'push', 'dumbbell', 'external', 'large', ['chest'], ['triceps', 'shoulders'], [8, 12], 2),
  ex('incline-dumbbell-press', 'Schrägbank Kurzhantel', 'push', 'dumbbell', 'external', 'medium', ['chest', 'shoulders'], ['triceps'], [8, 12], 2),
  ex('dumbbell-shoulder-press', 'Schulterdrücken (Kurzhantel)', 'push', 'dumbbell', 'external', 'medium', ['shoulders'], ['triceps'], [8, 12], 2),
  ex('arnold-press', 'Arnold-Press', 'push', 'dumbbell', 'external', 'medium', ['shoulders'], ['triceps'], [8, 12], 2),
  ex('dumbbell-row', 'Kurzhantelrudern', 'pull', 'dumbbell', 'external', 'medium', ['back'], ['biceps', 'shoulders'], [8, 12], 2),
  ex('dumbbell-romanian-deadlift', 'Kurzhantel RDL', 'hinge', 'dumbbell', 'external', 'medium', ['hamstrings', 'glutes'], ['back'], [8, 12], 2),
  ex('goblet-squat', 'Goblet-Kniebeuge', 'squat', 'dumbbell', 'external', 'medium', ['quads', 'glutes'], ['core'], [8, 12], 2),
  ex('dumbbell-lunge', 'Ausfallschritt (Kurzhantel)', 'squat', 'dumbbell', 'external', 'medium', ['quads', 'glutes'], ['hamstrings'], [8, 12], 2),
  ex('bulgarian-split-squat', 'Bulgarischer Split Squat', 'squat', 'dumbbell', 'external', 'medium', ['quads', 'glutes'], ['hamstrings'], [8, 12], 2),
  ex('step-up', 'Step-up', 'squat', 'dumbbell', 'external', 'small', ['quads', 'glutes'], [], [8, 12], 2),
  ex('dumbbell-curl', 'Kurzhantel-Curl', 'pull', 'dumbbell', 'external', 'small', ['biceps'], [], [8, 12], 2),
  ex('hammer-curl', 'Hammer-Curl', 'pull', 'dumbbell', 'external', 'small', ['biceps'], [], [8, 12], 2),
  ex('concentration-curl', 'Konzentrations-Curl', 'pull', 'dumbbell', 'external', 'small', ['biceps'], [], [10, 15], 2),
  ex('dumbbell-lateral-raise', 'Seitheben', 'push', 'dumbbell', 'external', 'small', ['shoulders'], [], [10, 15], 2),
  ex('rear-delt-fly', 'Reverse Fly', 'pull', 'dumbbell', 'external', 'small', ['shoulders'], ['back'], [12, 15], 2),
  ex('dumbbell-fly', 'Fliegende (Kurzhantel)', 'push', 'dumbbell', 'external', 'small', ['chest'], [], [10, 15], 2),
  ex('dumbbell-pullover', 'Überzüge (Kurzhantel)', 'pull', 'dumbbell', 'external', 'medium', ['back'], ['chest'], [8, 12], 2),
  ex('dumbbell-triceps-extension', 'Trizepsdrücken (Kurzhantel)', 'push', 'dumbbell', 'external', 'small', ['triceps'], [], [8, 12], 2),
  ex('dumbbell-shrug', 'Shrugs (Kurzhantel)', 'pull', 'dumbbell', 'external', 'small', ['back'], [], [8, 12], 2),
  ex('dumbbell-calf-raise', 'Wadenheben (Kurzhantel)', 'squat', 'dumbbell', 'external', 'small', ['calves'], [], [12, 20], 2),

  // --- Machines ------------------------------------------------------------
  ex('leg-press', 'Beinpresse', 'squat', 'machine', 'external', 'large', ['quads', 'glutes'], ['hamstrings'], [8, 12], 2.5),
  ex('hack-squat', 'Hackenschmidt-Kniebeuge', 'squat', 'machine', 'external', 'large', ['quads'], ['glutes'], [8, 12], 2.5),
  ex('smith-machine-squat', 'Kniebeuge (Multipresse)', 'squat', 'machine', 'external', 'large', ['quads', 'glutes'], ['hamstrings'], [8, 12], 2.5),
  ex('leg-extension', 'Beinstrecker', 'squat', 'machine', 'external', 'small', ['quads'], [], [10, 15], 2.5),
  ex('leg-curl', 'Beinbeuger (liegend)', 'hinge', 'machine', 'external', 'small', ['hamstrings'], [], [8, 12], 2.5),
  ex('seated-leg-curl', 'Beinbeuger (sitzend)', 'hinge', 'machine', 'external', 'small', ['hamstrings'], [], [8, 12], 2.5),
  ex('leg-abduction', 'Abduktoren-Maschine', 'hinge', 'machine', 'external', 'small', ['glutes'], [], [12, 20], 2.5),
  ex('leg-adduction', 'Adduktoren-Maschine', 'squat', 'machine', 'external', 'small', ['quads'], [], [12, 20], 2.5),
  ex('calf-raise-machine', 'Wadenheben (Maschine, stehend)', 'squat', 'machine', 'external', 'small', ['calves'], [], [12, 20], 2.5),
  ex('seated-calf-raise', 'Wadenheben (sitzend)', 'squat', 'machine', 'external', 'small', ['calves'], [], [12, 20], 2.5),
  ex('lat-pulldown', 'Latzug', 'pull', 'machine', 'external', 'medium', ['back'], ['biceps'], [8, 12], 2.5),
  ex('chest-press-machine', 'Brustpresse', 'push', 'machine', 'external', 'medium', ['chest'], ['triceps', 'shoulders'], [8, 12], 2.5),
  ex('shoulder-press-machine', 'Schulterpresse (Maschine)', 'push', 'machine', 'external', 'medium', ['shoulders'], ['triceps'], [8, 12], 2.5),
  ex('pec-deck', 'Butterfly (Maschine)', 'push', 'machine', 'external', 'small', ['chest'], [], [10, 15], 2.5),
  ex('machine-row', 'Rudermaschine', 'pull', 'machine', 'external', 'medium', ['back'], ['biceps'], [8, 12], 2.5),
  ex('hip-thrust-machine', 'Hip Thrust (Maschine)', 'hinge', 'machine', 'external', 'medium', ['glutes'], ['hamstrings'], [8, 12], 2.5),
  ex('back-extension-machine', 'Rückenstrecker (Maschine)', 'hinge', 'machine', 'external', 'small', ['hamstrings', 'glutes'], ['back'], [10, 15], 2.5),
  ex('assisted-pull-up-machine', 'Klimmzug (assistiert, Maschine)', 'pull', 'machine', 'external', 'medium', ['back'], ['biceps'], [6, 10], 2.5),
  ex('assisted-dip-machine', 'Dips (assistiert, Maschine)', 'push', 'machine', 'external', 'medium', ['chest', 'triceps'], ['shoulders'], [6, 10], 2.5),

  // --- Cable ---------------------------------------------------------------
  ex('seated-cable-row', 'Kabelrudern (sitzend)', 'pull', 'cable', 'external', 'medium', ['back'], ['biceps'], [8, 12], 2.5),
  ex('cable-row-standing', 'Kabelrudern (stehend)', 'pull', 'cable', 'external', 'medium', ['back'], ['biceps'], [8, 12], 2.5),
  ex('cable-triceps-pushdown', 'Trizeps-Pushdown', 'push', 'cable', 'external', 'small', ['triceps'], [], [10, 15], 2.5),
  ex('cable-overhead-triceps', 'Trizeps über Kopf (Kabel)', 'push', 'cable', 'external', 'small', ['triceps'], [], [10, 15], 2.5),
  ex('cable-biceps-curl', 'Bizeps-Curl (Kabel)', 'pull', 'cable', 'external', 'small', ['biceps'], [], [10, 15], 2.5),
  ex('cable-lateral-raise', 'Seitheben (Kabel)', 'push', 'cable', 'external', 'small', ['shoulders'], [], [12, 15], 2.5),
  ex('cable-fly', 'Fliegende (Kabel)', 'push', 'cable', 'external', 'small', ['chest'], [], [10, 15], 2.5),
  ex('cable-face-pull', 'Face Pull', 'pull', 'cable', 'external', 'small', ['shoulders'], ['back'], [12, 20], 2.5),
  ex('cable-pull-through', 'Pull-through (Kabel)', 'hinge', 'cable', 'external', 'small', ['glutes', 'hamstrings'], [], [10, 15], 2.5),
  ex('cable-woodchopper', 'Holzhacker (Kabel)', 'core', 'cable', 'external', 'small', ['core'], [], [10, 15], 2.5),
  ex('cable-crunch', 'Crunch (Kabel)', 'core', 'cable', 'external', 'small', ['core'], [], [10, 15], 2.5),

  // --- Bodyweight (incl. assisted) ----------------------------------------
  ex('pull-up', 'Klimmzug', 'pull', 'bodyweight', 'bodyweight', 'medium', ['back'], ['biceps'], [5, 10], 0),
  ex('chin-up', 'Klimmzug (Untergriff)', 'pull', 'bodyweight', 'bodyweight', 'medium', ['biceps', 'back'], [], [5, 10], 0),
  ex('assisted-pull-up-band', 'Klimmzug (assistiert, Band)', 'pull', 'bodyweight', 'bodyweight', 'medium', ['back'], ['biceps'], [6, 12], 0),
  ex('inverted-row', 'Umgekehrtes Rudern', 'pull', 'bodyweight', 'bodyweight', 'small', ['back'], ['biceps'], [8, 15], 0),
  ex('push-up', 'Liegestütz', 'push', 'bodyweight', 'bodyweight', 'small', ['chest'], ['triceps', 'shoulders'], [10, 20], 0),
  ex('diamond-push-up', 'Diamant-Liegestütz', 'push', 'bodyweight', 'bodyweight', 'small', ['triceps'], ['chest'], [8, 15], 0),
  ex('pike-push-up', 'Pike-Liegestütz', 'push', 'bodyweight', 'bodyweight', 'small', ['shoulders'], ['triceps'], [6, 12], 0),
  ex('dip', 'Dips', 'push', 'bodyweight', 'bodyweight', 'medium', ['chest', 'triceps'], ['shoulders'], [6, 12], 0),
  ex('bodyweight-squat', 'Kniebeuge (Körpergewicht)', 'squat', 'bodyweight', 'bodyweight', 'small', ['quads', 'glutes'], [], [12, 20], 0),
  ex('pistol-squat', 'Pistol Squat', 'squat', 'bodyweight', 'bodyweight', 'medium', ['quads', 'glutes'], ['core'], [5, 10], 0),
  ex('lunge-bodyweight', 'Ausfallschritt (Körpergewicht)', 'squat', 'bodyweight', 'bodyweight', 'small', ['quads', 'glutes'], [], [10, 20], 0),
  ex('calf-raise-bodyweight', 'Wadenheben (Körpergewicht)', 'squat', 'bodyweight', 'bodyweight', 'small', ['calves'], [], [15, 25], 0),
  ex('nordic-curl', 'Nordic Curl', 'hinge', 'bodyweight', 'bodyweight', 'medium', ['hamstrings'], [], [5, 10], 0),
  ex('glute-bridge', 'Glute Bridge', 'hinge', 'bodyweight', 'bodyweight', 'small', ['glutes', 'hamstrings'], [], [12, 20], 0),
  ex('back-extension-bodyweight', 'Rückenstrecker (Körpergewicht)', 'hinge', 'bodyweight', 'bodyweight', 'small', ['hamstrings', 'glutes'], ['back'], [10, 20], 0),

  // --- Kettlebell ----------------------------------------------------------
  ex('kettlebell-swing', 'Kettlebell-Swing', 'hinge', 'kettlebell', 'external', 'medium', ['glutes', 'hamstrings'], ['back', 'core'], [12, 20], 4),
  ex('kettlebell-goblet-squat', 'Goblet-Kniebeuge (Kettlebell)', 'squat', 'kettlebell', 'external', 'medium', ['quads', 'glutes'], ['core'], [8, 12], 4),
  ex('kettlebell-clean', 'Kettlebell Clean', 'hinge', 'kettlebell', 'external', 'medium', ['fullBody'], ['shoulders', 'back'], [6, 10], 4),
  ex('kettlebell-snatch', 'Kettlebell Snatch', 'hinge', 'kettlebell', 'external', 'medium', ['fullBody'], ['shoulders'], [6, 10], 4),
  ex('kettlebell-press', 'Kettlebell-Schulterdrücken', 'push', 'kettlebell', 'external', 'medium', ['shoulders'], ['triceps'], [6, 10], 4),
  ex('kettlebell-row', 'Kettlebell-Rudern', 'pull', 'kettlebell', 'external', 'medium', ['back'], ['biceps'], [8, 12], 4),
  ex('turkish-get-up', 'Turkish Get-up', 'carry', 'kettlebell', 'external', 'large', ['fullBody', 'core'], ['shoulders'], [3, 5], 4),
  ex('farmers-carry', 'Farmer’s Carry', 'carry', 'kettlebell', 'external', 'medium', ['fullBody', 'core'], ['back'], [8, 12], 4),

  // --- Core ----------------------------------------------------------------
  ex('plank', 'Unterarmstütz (Plank)', 'core', 'bodyweight', 'time', 'small', ['core'], [], [1, 1], 0),
  ex('side-plank', 'Seitstütz', 'core', 'bodyweight', 'time', 'small', ['core'], [], [1, 1], 0),
  ex('hanging-leg-raise', 'Hängendes Beinheben', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [8, 15], 0),
  ex('crunch', 'Crunch', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [12, 25], 0),
  ex('sit-up', 'Sit-up', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [12, 25], 0),
  ex('russian-twist', 'Russian Twist', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [12, 20], 0),
  ex('ab-wheel-rollout', 'Ab-Wheel-Rollout', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [6, 12], 0),
  ex('dead-bug', 'Dead Bug', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], [], [8, 15], 0),
  ex('mountain-climber', 'Mountain Climber', 'core', 'bodyweight', 'bodyweight', 'small', ['core'], ['fullBody'], [20, 40], 0),

  // --- Cardio --------------------------------------------------------------
  ex('running', 'Laufen', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('cycling', 'Radfahren', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('rowing', 'Rudern (Ergometer)', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('swimming', 'Schwimmen', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('jump-rope', 'Seilspringen', 'cardio', 'cardio', 'time', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('brisk-walking', 'Zügiges Gehen', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('hiit', 'HIIT', 'cardio', 'cardio', 'time', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('elliptical', 'Ellipsentrainer', 'cardio', 'cardio', 'time', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('stair-climber', 'Treppensteigen', 'cardio', 'cardio', 'time', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
  ex('hiking', 'Wandern', 'cardio', 'cardio', 'distance', 'large', ['fullBody'], [], [1, 1], 0, 'cardio'),
]

/** Fast id → built-in exercise lookup. */
export const EXERCISE_MAP: Record<string, ExerciseDef> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
)

/**
 * Resolve an exercise id against the built-in table plus any user-defined
 * custom exercises (which win on id collision, though ids are namespaced). Pure
 * — callers pass their `customExercises` so progression stays testable.
 */
export function resolveExercise(
  id: string,
  customExercises: ExerciseDef[] = [],
): ExerciseDef | undefined {
  const custom = customExercises.find((e) => e.id === id)
  return custom ?? EXERCISE_MAP[id]
}

/**
 * Map a muscle group to the movement pattern it best contributes to — used to
 * credit an exercise's *secondary* muscles into the weekly hard-set balance at
 * a fractional weight. Coarse and deterministic on purpose.
 */
export const MUSCLE_TO_PATTERN: Record<MuscleGroup, ExercisePattern> = {
  chest: 'push',
  shoulders: 'push',
  triceps: 'push',
  back: 'pull',
  biceps: 'pull',
  quads: 'squat',
  calves: 'squat',
  hamstrings: 'hinge',
  glutes: 'hinge',
  core: 'core',
  fullBody: 'carry',
}

/** Same-pattern alternative exercises (for stall "try a variation" suggestions),
 *  excluding the given id and any bodyweight/time-only entries when possible. */
export function samePatternAlternatives(
  def: ExerciseDef,
  customExercises: ExerciseDef[] = [],
): ExerciseDef[] {
  const pool = [...EXERCISES, ...customExercises]
  return pool.filter(
    (e) => e.id !== def.id && e.pattern === def.pattern && e.category === def.category,
  )
}
