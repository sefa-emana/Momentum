/**
 * Progression Engine v2 — the strength/cardio intelligence layer.
 *
 * Everything here is a PURE function of the workout history (plus, where a
 * definition is needed, the exercise table + custom exercises passed in), so it
 * replays bit-for-bit inside `rebuildFromWorkouts` and is trivially testable.
 *
 * The product principle is TRANSPARENCY (anti-Fitbod): every recommendation
 * carries a human-readable German `reason` — the app always says WHY.
 *
 * Evidence (see docs/PSYCHOLOGY.md §11): 2-for-2 / ACSM double progression;
 * Epley e1RM validity for reps ≤ 12; autoregulation via RIR (Ruple 2023);
 * autoregulated deload (PMC10948666, 2024 RCT); volume-landmark caution
 * (PMC10809978, 2025 review) → soft bands, never a hard "do X sets" order.
 */
import { addDays } from 'date-fns'
import { toDate, toEpoch, weekKey } from './dates'
import {
  MUSCLE_TO_PATTERN,
  resolveExercise,
  samePatternAlternatives,
  type ExerciseDef,
  type ExercisePattern,
} from './exercises'
import type { ExerciseEntry, SetEntry, Workout } from './types'

// ---------------------------------------------------------------------------
// Set/entry helpers
// ---------------------------------------------------------------------------

/** A working set counts toward volume/progression; warmups never do. `failure`
 *  sets ARE working sets (they represent real, if maximal, work). */
export function isWorkingSet(set: SetEntry): boolean {
  return set.kind !== 'warmup'
}

/** The one exercise entry for `exerciseId` in a workout, or undefined. */
function entryFor(w: Workout, exerciseId: string): ExerciseEntry | undefined {
  return w.entries?.find((e) => e.exerciseId === exerciseId)
}

/** Working sets (non-warmup) for an exercise within a workout. */
export function workingSetsFor(w: Workout, exerciseId: string): SetEntry[] {
  return entryFor(w, exerciseId)?.sets.filter(isWorkingSet) ?? []
}

/** Workouts (sorted ascending by date) that contain the given exercise. */
export function sessionsForExercise(
  workouts: Workout[],
  exerciseId: string,
): Workout[] {
  return workouts
    .filter((w) => (w.entries?.some((e) => e.exerciseId === exerciseId) ?? false))
    .sort((a, b) => toEpoch(a.date) - toEpoch(b.date))
}

// ---------------------------------------------------------------------------
// Epley e1RM & volume
// ---------------------------------------------------------------------------

/** Epley estimated 1-rep-max. Only *meaningful* for reps in [1,12] — callers
 *  must gate (see `e1rmForSet`); the bare formula stays a pure primitive. */
export function epley1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}

/**
 * e1RM for a single set, or null when it does not qualify: warmups, reps
 * outside [1,12] (Epley loses validity), missing weight/reps, or a
 * non-external load type (bodyweight/time/distance → progress on reps/volume).
 */
export function e1rmForSet(set: SetEntry, def?: ExerciseDef): number | null {
  if (!isWorkingSet(set)) return null
  if (def && def.loadType !== 'external') return null
  const { weightKg, reps } = set
  if (weightKg === undefined || reps === undefined) return null
  if (reps < 1 || reps > 12) return null
  if (weightKg <= 0) return null
  return epley1RM(weightKg, reps)
}

/** Best (max) qualifying e1RM across a set list, or null if none qualifies. */
export function bestE1RM(sets: SetEntry[], def?: ExerciseDef): number | null {
  let best: number | null = null
  for (const s of sets) {
    const e = e1rmForSet(s, def)
    if (e !== null && (best === null || e > best)) best = e
  }
  return best
}

/** Volume load = Σ weight × reps over the given sets (all rep counts, no cap).
 *  Sets missing weight or reps contribute 0; caller decides warmup filtering. */
export function volumeLoad(sets: SetEntry[]): number {
  let total = 0
  for (const s of sets) {
    if (s.weightKg !== undefined && s.reps !== undefined) {
      total += s.weightKg * s.reps
    }
  }
  return total
}

export interface WeeklyE1RM {
  week: string
  e1rm: number
}

/** Best qualifying e1RM per ISO week for an exercise (ascending) — trend data. */
export function weeklyBestE1RM(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): WeeklyE1RM[] {
  const def = resolveExercise(exerciseId, customExercises)
  const byWeek = new Map<string, number>()
  for (const w of sessionsForExercise(workouts, exerciseId)) {
    const best = bestE1RM(workingSetsFor(w, exerciseId), def)
    if (best === null) continue
    const k = weekKey(w.date)
    const prev = byWeek.get(k)
    if (prev === undefined || best > prev) byWeek.set(k, best)
  }
  return [...byWeek.entries()]
    .map(([week, e1rm]) => ({ week, e1rm }))
    .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0))
}

// ---------------------------------------------------------------------------
// PR detection
// ---------------------------------------------------------------------------

export type PRKind = 'weight' | 'rep' | 'e1rm' | 'volume'

export interface PRResult {
  exerciseId: string
  kinds: PRKind[]
}

/** Max working-set weight in a set list (0 if none). */
function maxWeight(sets: SetEntry[]): number {
  let m = 0
  for (const s of sets) if (s.weightKg !== undefined && s.weightKg > m) m = s.weightKg
  return m
}

/** Best reps achieved at weight ≥ `threshold` across sets (0 if none). */
function bestRepsAtOrAbove(sets: SetEntry[], threshold: number): number {
  let best = 0
  for (const s of sets) {
    if (s.reps === undefined) continue
    const w = s.weightKg ?? 0
    if (w >= threshold && s.reps > best) best = s.reps
  }
  return best
}

/**
 * Detect personal records set by `newWorkout` against the prior history.
 *
 * `priorWorkouts` is the history BEFORE this session (the new workout is
 * excluded defensively by id). PRs ignore warmups and are fully replay-
 * consistent (pure over prior + new). A `backfilled` new workout yields NO
 * celebration flags — it can seed baselines for the future, but back-dating
 * must never be a way to farm PRs.
 */
export function detectPRs(
  priorWorkouts: Workout[],
  newWorkout: Workout,
  customExercises: ExerciseDef[] = [],
): PRResult[] {
  if (!newWorkout.entries || newWorkout.entries.length === 0) return []
  if (newWorkout.backfilled) return []

  const prior = priorWorkouts.filter((w) => w.id !== newWorkout.id)
  const out: PRResult[] = []

  for (const entry of newWorkout.entries) {
    const def = resolveExercise(entry.exerciseId, customExercises)
    const newSets = entry.sets.filter(isWorkingSet)
    if (newSets.length === 0) continue

    const priorSessions = sessionsForExercise(prior, entry.exerciseId)
    const priorSets = priorSessions.flatMap((w) => workingSetsFor(w, entry.exerciseId))

    const kinds: PRKind[] = []

    // Weight PR — heaviest working set ever. Requires prior data: the very
    // first time an exercise is logged is a baseline, not a celebrated PR.
    const newMaxW = maxWeight(newSets)
    const priorMaxW = maxWeight(priorSets)
    if (priorMaxW > 0 && newMaxW > priorMaxW) kinds.push('weight')

    // Rep PR — more reps than ever done at that weight-or-heavier.
    for (const s of newSets) {
      if (s.reps === undefined || s.weightKg === undefined) continue
      const priorBestReps = bestRepsAtOrAbove(priorSets, s.weightKg)
      if (priorBestReps > 0 && s.reps > priorBestReps) {
        kinds.push('rep')
        break
      }
    }

    // e1RM PR (external load only).
    const newBestE = bestE1RM(newSets, def)
    if (newBestE !== null) {
      let priorBestE: number | null = null
      for (const w of priorSessions) {
        const e = bestE1RM(workingSetsFor(w, entry.exerciseId), def)
        if (e !== null && (priorBestE === null || e > priorBestE)) priorBestE = e
      }
      if (priorBestE !== null && newBestE > priorBestE + 1e-9) kinds.push('e1rm')
    }

    // Session-volume PR for this exercise.
    const newVol = volumeLoad(newSets)
    if (newVol > 0) {
      let priorBestVol = 0
      for (const w of priorSessions) {
        const v = volumeLoad(workingSetsFor(w, entry.exerciseId))
        if (v > priorBestVol) priorBestVol = v
      }
      if (priorBestVol > 0 && newVol > priorBestVol) kinds.push('volume')
    }

    if (kinds.length > 0) out.push({ exerciseId: entry.exerciseId, kinds })
  }

  return out
}

// ---------------------------------------------------------------------------
// Double progression (2-for-2 / ACSM)
// ---------------------------------------------------------------------------

export type ProgressionAction = 'addWeight' | 'addReps' | 'hold'

export interface ProgressionHint {
  action: ProgressionAction
  /** Suggested load increment (kg) for 'addWeight'; 0 otherwise. */
  amountKg: number
  /** Human-readable German rationale (transparency principle). */
  reason: string
}

/** True when every working set reached at least `reps` reps. */
function allSetsReach(sets: SetEntry[], reps: number): boolean {
  if (sets.length === 0) return false
  return sets.every((s) => (s.reps ?? 0) >= reps)
}

/** True when every working set sits within [min, max] reps. */
function allSetsInRange(sets: SetEntry[], min: number, max: number): boolean {
  if (sets.length === 0) return false
  return sets.every((s) => (s.reps ?? 0) >= min && (s.reps ?? 0) <= max)
}

/**
 * Double-progression recommendation for an exercise (2-for-2 rule, ACSM):
 *  - `addWeight` when every working set hit ≥ repRange.max in the 2 most recent
 *    sessions → the load is ready to go up by `incrementKg`.
 *  - `hold` right after a load increase (top-set weight just rose) — reps are
 *    expected to drop first; hold until they climb back into range.
 *  - `addReps` while inside the band — keep the load, chase more reps.
 *  - `hold` when below the band (struggling) — keep load & technique.
 *
 * Bodyweight/time/distance exercises never get `addWeight` (progress on reps).
 * Returns null when there is no set data for the exercise yet.
 */
export function progressionHint(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): ProgressionHint | null {
  const def = resolveExercise(exerciseId, customExercises)
  const sessions = sessionsForExercise(workouts, exerciseId)
    .map((w) => workingSetsFor(w, exerciseId))
    .filter((sets) => sets.length > 0)
  if (sessions.length === 0) return null

  const { min, max } = def?.defaultRepRange ?? { min: 8, max: 12 }
  const canAddWeight = !def || def.loadType === 'external'
  const inc = def?.incrementKg ?? 2.5

  const last = sessions[sessions.length - 1]
  const prev = sessions.length >= 2 ? sessions[sessions.length - 2] : null

  // Just increased the load → hold and rebuild reps.
  if (canAddWeight && prev && maxWeight(last) > maxWeight(prev)) {
    return {
      action: 'hold',
      amountKg: 0,
      reason: `Gewicht zuletzt erhöht — halte es, bis die Wiederholungen wieder Richtung ${max} steigen.`,
    }
  }

  // 2-for-2: both of the last two sessions hit the top of the range on every set.
  if (
    canAddWeight &&
    prev &&
    allSetsReach(last, max) &&
    allSetsReach(prev, max)
  ) {
    return {
      action: 'addWeight',
      amountKg: inc,
      reason: `2×2-Regel erfüllt: alle Arbeitssätze in den letzten 2 Einheiten ≥ ${max} Wdh. Erhöhe um ${inc} kg.`,
    }
  }

  // Inside the band → keep load, add reps.
  if (allSetsInRange(last, min, max)) {
    return {
      action: 'addReps',
      amountKg: 0,
      reason: canAddWeight
        ? `Im Zielbereich (${min}–${max}) — Gewicht halten und auf ${max} Wdh. hinarbeiten.`
        : `Im Zielbereich (${min}–${max}) — auf ${max} Wdh. hinarbeiten, dann Schwierigkeit steigern.`,
    }
  }

  // At/above top but not yet twice → keep pushing reps toward the next increase.
  if (allSetsReach(last, max)) {
    return {
      action: 'addReps',
      amountKg: 0,
      reason: `Oberes Ende erreicht — noch eine Einheit auf ${max} Wdh. bestätigen, dann steigt das Gewicht.`,
    }
  }

  // Below the band → hold and rebuild.
  return {
    action: 'hold',
    amountKg: 0,
    reason: `Wiederholungen unter dem Zielbereich (${min}–${max}) — Gewicht halten und Technik festigen.`,
  }
}

// ---------------------------------------------------------------------------
// Stall detection & escalating suggestions
// ---------------------------------------------------------------------------

export type StallState = 'progressing' | 'watch' | 'stalled'

/** Per-session progression score (ascending): best e1RM for external loads,
 *  else best session volume — so bodyweight/isolation still get a flat signal. */
function sessionScores(
  workouts: Workout[],
  exerciseId: string,
  def?: ExerciseDef,
): number[] {
  return sessionsForExercise(workouts, exerciseId).map((w) => {
    const sets = workingSetsFor(w, exerciseId)
    if (def && def.loadType === 'external') {
      const e = bestE1RM(sets, def)
      if (e !== null) return e
    }
    return volumeLoad(sets)
  })
}

/** Length of the trailing run of non-improving (flat or down) sessions. */
function trailingFlatRun(scores: number[]): number {
  let run = 0
  for (let i = scores.length - 1; i >= 1; i--) {
    if (scores[i] <= scores[i - 1] + 1e-9) run += 1
    else break
  }
  return run
}

/** Average RIR across a set list (null if no set reports RIR). */
function avgRir(sets: SetEntry[]): number | null {
  const vals = sets.map((s) => s.rir).filter((v): v is number => v !== undefined)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/**
 * Stall state for an exercise:
 *  - `watch`: the progression score has been flat for the last 2 sessions.
 *  - `stalled`: flat/down for 3 consecutive sessions AND the athlete is clearly
 *    grinding — recent rep targets missed (below range) OR RIR trending to ~0
 *    (Ruple 2023: 0–1 RIR hurts recovery).
 *  - `progressing`: otherwise.
 */
export function stallState(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): StallState {
  const def = resolveExercise(exerciseId, customExercises)
  const scores = sessionScores(workouts, exerciseId, def)
  if (scores.length < 2) return 'progressing'

  const flatRun = trailingFlatRun(scores)
  if (flatRun < 2) return 'progressing'
  if (flatRun < 3) return 'watch'

  // 3+ flat sessions → escalate to 'stalled' only if effort signals confirm it.
  const sessions = sessionsForExercise(workouts, exerciseId)
  const lastSets = workingSetsFor(sessions[sessions.length - 1], exerciseId)
  const { min } = def?.defaultRepRange ?? { min: 8, max: 12 }
  const repsMissed = lastSets.some((s) => (s.reps ?? Infinity) < min)
  const rir = avgRir(lastSets)
  const rirGrind = rir !== null && rir <= 1

  return repsMissed || rirGrind ? 'stalled' : 'watch'
}

export type StallSuggestionKind = 'deload' | 'repRangeSwitch' | 'variation'

export interface StallSuggestion {
  kind: StallSuggestionKind
  reason: string
  /** For a deload: target working weight (≈80% of recent best). */
  targetWeightKg?: number
  /** For a rep-range switch: the proposed new band. */
  newRepRange?: { min: number; max: number }
  /** For a variation: a same-pattern alternative exercise id + name. */
  suggestedExerciseId?: string
  suggestedExerciseName?: string
}

/**
 * Escalating de-stall suggestion, cycling with the length of the stall run:
 *   3 flat sessions → mini-deload (80% next session)
 *   4              → rep-range switch ({8,12}↔{5,8})
 *   ≥5             → same-pattern variation from the DB
 * Returns null unless the exercise is actually `stalled`. German reasons.
 */
export function stallSuggestion(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): StallSuggestion | null {
  if (stallState(workouts, exerciseId, customExercises) !== 'stalled') return null
  const def = resolveExercise(exerciseId, customExercises)
  const scores = sessionScores(workouts, exerciseId, def)
  const run = trailingFlatRun(scores)

  const sessions = sessionsForExercise(workouts, exerciseId)
  const lastSets = workingSetsFor(sessions[sessions.length - 1], exerciseId)
  const recentBestWeight = maxWeight(lastSets)

  if (run >= 5) {
    const alt = samePatternAlternatives(
      def ?? {
        id: exerciseId,
        name: exerciseId,
        category: 'strength',
        pattern: 'push',
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: 'barbell',
        loadType: 'external',
        sizeClass: 'medium',
        defaultRepRange: { min: 8, max: 12 },
        incrementKg: 2.5,
      },
      customExercises,
    )[0]
    return {
      kind: 'variation',
      reason: alt
        ? `Länger festgefahren — probier eine Variation desselben Musters: ${alt.name}. Neuer Reiz löst Plateaus.`
        : 'Länger festgefahren — probier eine Variation desselben Bewegungsmusters für einen neuen Reiz.',
      suggestedExerciseId: alt?.id,
      suggestedExerciseName: alt?.name,
    }
  }

  if (run === 4) {
    const cur = def?.defaultRepRange ?? { min: 8, max: 12 }
    const newRepRange =
      cur.max <= 8 ? { min: 8, max: 12 } : { min: 5, max: 8 }
    return {
      kind: 'repRangeSwitch',
      reason: `Wechsle den Wiederholungsbereich auf ${newRepRange.min}–${newRepRange.max} — ein neuer Reiz bricht das Plateau.`,
      newRepRange,
    }
  }

  // run === 3
  const target = recentBestWeight > 0 ? Math.round(recentBestWeight * 0.8 * 2) / 2 : undefined
  return {
    kind: 'deload',
    reason: target
      ? `Mini-Deload: nächste Einheit ~80 % (${target} kg), dann wieder aufbauen. Erholung schlägt Draufhauen.`
      : 'Mini-Deload: nächste Einheit bewusst leichter, dann wieder aufbauen. Erholung schlägt Draufhauen.',
    targetWeightKg: target,
  }
}

// ---------------------------------------------------------------------------
// Weekly hard sets by pattern
// ---------------------------------------------------------------------------

export type SetBand =
  | 'unter Wirkschwelle'
  | 'Einstieg'
  | 'produktive Zone'
  | 'hohes Volumen'
  | 'sehr hoch'

/** Classify a weekly hard-set count into a soft band. Bands are advisory — the
 *  2025 volume-landmark review (PMC10809978) cautions against hard prescriptions. */
export function classifySetBand(sets: number): SetBand {
  if (sets < 4) return 'unter Wirkschwelle'
  if (sets < 6) return 'Einstieg'
  if (sets < 10) return 'produktive Zone'
  if (sets <= 20) return 'hohes Volumen'
  return 'sehr hoch'
}

export interface PatternVolume {
  pattern: ExercisePattern
  sets: number
  band: SetBand
}

/**
 * Weekly fractional hard sets per movement pattern for the ISO week of `now`.
 * Each working set credits the exercise's own pattern 1.0, and 0.5 to each
 * distinct pattern its *secondary* muscles map to (deduped, excluding the
 * primary). Warmups are excluded. Returns patterns with > 0 sets, sets desc.
 */
export function weeklySetsByPattern(
  workouts: Workout[],
  now: string | Date,
  customExercises: ExerciseDef[] = [],
): PatternVolume[] {
  const wk = weekKey(now)
  const byPattern = new Map<ExercisePattern, number>()
  const add = (p: ExercisePattern, n: number) =>
    byPattern.set(p, (byPattern.get(p) ?? 0) + n)

  for (const w of workouts) {
    if (weekKey(w.date) !== wk || !w.entries) continue
    for (const entry of w.entries) {
      const def = resolveExercise(entry.exerciseId, customExercises)
      if (!def || def.category !== 'strength') continue
      const workingCount = entry.sets.filter(isWorkingSet).length
      if (workingCount === 0) continue

      add(def.pattern, workingCount * 1.0)
      const secondaryPatterns = new Set<ExercisePattern>()
      for (const m of def.secondaryMuscles) {
        const p = MUSCLE_TO_PATTERN[m]
        if (p !== def.pattern) secondaryPatterns.add(p)
      }
      for (const p of secondaryPatterns) add(p, workingCount * 0.5)
    }
  }

  return [...byPattern.entries()]
    .map(([pattern, sets]) => ({ pattern, sets, band: classifySetBand(sets) }))
    .sort((a, b) => b.sets - a.sets)
}

// ---------------------------------------------------------------------------
// Cardio progression ladder
// ---------------------------------------------------------------------------

export type CardioAction = 'frequency' | 'duration' | 'intensity'

export interface CardioHint {
  action: CardioAction
  reason: string
  /** Present when the recent easy share is low (polarization nudge). */
  polarizationNote?: string
}

/** Target cardio sessions per week before duration/intensity progression. */
const CARDIO_FREQ_TARGET = 3
/** Weekly duration progression ceiling (fraction). */
const CARDIO_DURATION_CEILING = 0.1

/** Whether a session reads as "easy" (feel/rpe < 5, or light intensity). */
function isEasyCardio(w: Workout): boolean {
  if (w.feel !== undefined) return w.feel < 5
  return w.intensity === 'light'
}

/**
 * Cardio progression ladder — advance one rung at a time:
 *   frequency (→ 3×/week) → duration (+10% weekly ceiling) → intensity.
 * Plus a polarization note when < 70% of recent cardio was easy (most volume
 * should be easy; intensity is the seasoning, not the meal).
 */
export function cardioProgressionHint(
  workouts: Workout[],
  now: string | Date,
): CardioHint {
  const cardio = workouts.filter((w) => w.type === 'cardio')
  const wk = weekKey(now)
  const thisWeek = cardio.filter((w) => weekKey(w.date) === wk)
  const lastWk = weekKey(addDays(toDate(now), -7))
  const lastWeek = cardio.filter((w) => weekKey(w.date) === lastWk)

  // Polarization: share of easy sessions among the last 8 cardio bouts.
  const recent = [...cardio].sort((a, b) => toEpoch(b.date) - toEpoch(a.date)).slice(0, 8)
  let polarizationNote: string | undefined
  if (recent.length >= 3) {
    const easyShare = recent.filter(isEasyCardio).length / recent.length
    if (easyShare < 0.7) {
      polarizationNote =
        'Viel Intensität zuletzt — der Großteil des Cardios sollte locker sein (polarisiert). Baue mehr ruhige Einheiten ein.'
    }
  }

  const daysThisWeek = new Set(thisWeek.map((w) => dayKeyOf(w.date))).size
  if (daysThisWeek < CARDIO_FREQ_TARGET) {
    return {
      action: 'frequency',
      reason: `Erst die Häufigkeit: Ziel ${CARDIO_FREQ_TARGET} Cardio-Einheiten/Woche (aktuell ${daysThisWeek}).`,
      polarizationNote,
    }
  }

  const thisMin = thisWeek.reduce((s, w) => s + w.durationMin, 0)
  const lastMin = lastWeek.reduce((s, w) => s + w.durationMin, 0)
  if (lastMin > 0 && thisMin <= lastMin * (1 + CARDIO_DURATION_CEILING)) {
    const target = Math.round(lastMin * (1 + CARDIO_DURATION_CEILING))
    return {
      action: 'duration',
      reason: `Häufigkeit steht — steigere die Dauer um max. 10 % (Ziel ~${target} min/Woche).`,
      polarizationNote,
    }
  }

  return {
    action: 'intensity',
    reason: 'Häufigkeit und Dauer sitzen — jetzt darf ein kleiner Teil intensiver werden (Intervalle/Tempo).',
    polarizationNote,
  }
}

// Local day-key without importing the whole dates surface twice.
function dayKeyOf(date: string): string {
  const d = toDate(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// Fortschritts-Screens — per-exercise progress view models (all pure)
// ---------------------------------------------------------------------------

export interface WeeklyValue {
  week: string
  value: number
}

/** Total working-set volume load per ISO week for an exercise (ascending). */
export function weeklyVolumeLoad(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): WeeklyValue[] {
  void customExercises // volume is definition-independent; kept for a symmetric signature
  const byWeek = new Map<string, number>()
  for (const w of sessionsForExercise(workouts, exerciseId)) {
    const vol = volumeLoad(workingSetsFor(w, exerciseId))
    if (vol <= 0) continue
    const k = weekKey(w.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + vol)
  }
  return [...byWeek.entries()]
    .map(([week, value]) => ({ week, value }))
    .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0))
}

/** Total cardio minutes per ISO week over the trailing `weeks` weeks (oldest
 *  first, including empty weeks) — the cardio duration-trend sparkline series. */
export function weeklyCardioMinutes(
  workouts: Workout[],
  now: string | Date,
  weeks = 8,
): WeeklyValue[] {
  const byWeek = new Map<string, number>()
  for (const w of workouts) {
    if (w.type !== 'cardio') continue
    const k = weekKey(w.date)
    byWeek.set(k, (byWeek.get(k) ?? 0) + w.durationMin)
  }
  const out: WeeklyValue[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const key = weekKey(addDays(toDate(now), -7 * i))
    out.push({ week: key, value: byWeek.get(key) ?? 0 })
  }
  return out
}

export interface PRRecord {
  value: number
  /** ISO date of the session where this record was first set. */
  date: string
}

/** All-time personal records for one exercise, each with the date first hit. */
export interface ExercisePRs {
  /** Heaviest working-set load (kg). */
  weight?: PRRecord
  /** Most reps in a single working set, plus the load it was done at. */
  reps?: (PRRecord & { weightKg: number })
  /** Best Epley e1RM (external load only). */
  e1rm?: PRRecord
  /** Best single-session volume load. */
  volume?: PRRecord
}

export function exercisePRs(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
): ExercisePRs {
  const def = resolveExercise(exerciseId, customExercises)
  const out: ExercisePRs = {}
  for (const w of sessionsForExercise(workouts, exerciseId)) {
    const sets = workingSetsFor(w, exerciseId)
    if (sets.length === 0) continue

    for (const s of sets) {
      if (s.weightKg !== undefined && s.weightKg > 0) {
        if (!out.weight || s.weightKg > out.weight.value) {
          out.weight = { value: s.weightKg, date: w.date }
        }
      }
      if (s.reps !== undefined && s.reps > 0) {
        if (!out.reps || s.reps > out.reps.value) {
          out.reps = { value: s.reps, weightKg: s.weightKg ?? 0, date: w.date }
        }
      }
    }

    const e = bestE1RM(sets, def)
    if (e !== null && (!out.e1rm || e > out.e1rm.value)) {
      out.e1rm = { value: e, date: w.date }
    }

    const vol = volumeLoad(sets)
    if (vol > 0 && (!out.volume || vol > out.volume.value)) {
      out.volume = { value: vol, date: w.date }
    }
  }
  return out
}

/** One compact recent-session row for the exercise detail history. */
export interface ExerciseSessionRow {
  date: string
  workingSets: number
  volume: number
  /** Best e1RM this session (external loads), else null. */
  e1rm: number | null
}

/** The last `count` sessions for an exercise (most recent first). */
export function recentExerciseSessions(
  workouts: Workout[],
  exerciseId: string,
  customExercises: ExerciseDef[] = [],
  count = 5,
): ExerciseSessionRow[] {
  const def = resolveExercise(exerciseId, customExercises)
  return sessionsForExercise(workouts, exerciseId)
    .slice()
    .reverse()
    .slice(0, count)
    .map((w) => {
      const sets = workingSetsFor(w, exerciseId)
      return {
        date: w.date,
        workingSets: sets.length,
        volume: volumeLoad(sets),
        e1rm: bestE1RM(sets, def),
      }
    })
}

/** Summary row for the Fortschritt exercise list. */
export interface ExerciseProgress {
  exerciseId: string
  name: string
  /** ISO date of the most recent session for this exercise. */
  lastDate: string
  /** Whether e1RM is the meaningful headline metric (external load). */
  external: boolean
  /** Weekly best e1RM (sparkline source) for external loads. */
  weeklyE1RM: WeeklyE1RM[]
  /** Weekly volume load (sparkline source), used for bodyweight etc. */
  weeklyVolume: WeeklyValue[]
  /** Best all-time e1RM (external) or null. */
  bestE1RM: number | null
  /** Best all-time single-session volume load. */
  bestVolume: number
  stall: StallState
  sessionCount: number
}

/**
 * Every strength exercise with at least one logged working set, sorted by most
 * recent session first — the Fortschritt tab's list model. Bodyweight/isolation
 * exercises (no meaningful e1RM) fall back to volume as their headline metric.
 */
export function exerciseProgressList(
  workouts: Workout[],
  customExercises: ExerciseDef[] = [],
  now: string | Date = new Date(),
): ExerciseProgress[] {
  void now
  const ids = new Set<string>()
  for (const w of workouts) {
    if (!w.entries) continue
    for (const entry of w.entries) {
      if (entry.sets.some(isWorkingSet)) ids.add(entry.exerciseId)
    }
  }

  const out: ExerciseProgress[] = []
  for (const id of ids) {
    const def = resolveExercise(id, customExercises)
    if (!def || def.category !== 'strength') continue
    const sessions = sessionsForExercise(workouts, id)
    if (sessions.length === 0) continue

    const prs = exercisePRs(workouts, id, customExercises)
    out.push({
      exerciseId: id,
      name: def.name,
      lastDate: sessions[sessions.length - 1].date,
      external: def.loadType === 'external',
      weeklyE1RM: weeklyBestE1RM(workouts, id, customExercises),
      weeklyVolume: weeklyVolumeLoad(workouts, id, customExercises),
      bestE1RM: prs.e1rm?.value ?? null,
      bestVolume: prs.volume?.value ?? 0,
      stall: stallState(workouts, id, customExercises),
      sessionCount: sessions.length,
    })
  }

  return out.sort((a, b) => toEpoch(b.lastDate) - toEpoch(a.lastDate))
}

/** A single, most-relevant progress line for the Dashboard's Fortschritt card. */
export interface ProgressHeadline {
  exerciseId: string
  name: string
  /** One-line German summary (e.g. "Bankdrücken: bereit für +2,5 kg"). */
  text: string
  tone: 'ready' | 'stall'
}

/**
 * Pick the single most relevant strength headline for the Dashboard:
 * a stalled exercise (with its de-stall nudge) outranks one that is ready for a
 * load bump. Returns null when neither applies → the Dashboard keeps its
 * existing "beat last week" load framing.
 */
export function topProgressHeadline(
  workouts: Workout[],
  customExercises: ExerciseDef[] = [],
  now: string | Date = new Date(),
): ProgressHeadline | null {
  const list = exerciseProgressList(workouts, customExercises, now)
  if (list.length === 0) return null

  // 1) A genuine stall (calm, actionable) takes priority.
  const stalled = list.find((e) => e.stall === 'stalled')
  if (stalled) {
    return {
      exerciseId: stalled.exerciseId,
      name: stalled.name,
      text: `${stalled.name}: festgefahren — Zeit für einen neuen Reiz`,
      tone: 'stall',
    }
  }

  // 2) Otherwise, the first exercise that is ready for more weight.
  for (const e of list) {
    const hint = progressionHint(workouts, e.exerciseId, customExercises)
    if (hint?.action === 'addWeight') {
      const amount = hint.amountKg.toLocaleString('de-DE', { maximumFractionDigits: 2 })
      return {
        exerciseId: e.exerciseId,
        name: e.name,
        text: `${e.name}: bereit für +${amount} kg`,
        tone: 'ready',
      }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Ghost-beat & ego-lift helpers (shared with the XP integration in the store)
// ---------------------------------------------------------------------------

/** Best single-set "metric" for a ghost comparison: weight×reps for loaded
 *  sets, else reps (bodyweight). Warmups excluded by the caller. */
export function bestSetMetric(sets: SetEntry[]): number {
  let best = 0
  for (const s of sets) {
    const m =
      s.weightKg !== undefined && s.reps !== undefined
        ? s.weightKg * s.reps
        : s.reps ?? 0
    if (m > best) best = m
  }
  return best
}

/**
 * Exercise ids in `newWorkout` whose best working set beats the same exercise's
 * best working set in its most recent prior session ("Schlag dein letztes Mal").
 * Pure over prior history + new workout. Backfilled workouts never beat a ghost.
 */
export function ghostBeats(
  priorWorkouts: Workout[],
  newWorkout: Workout,
): string[] {
  if (!newWorkout.entries || newWorkout.backfilled) return []
  const prior = priorWorkouts.filter((w) => w.id !== newWorkout.id)
  const out: string[] = []
  for (const entry of newWorkout.entries) {
    const newBest = bestSetMetric(entry.sets.filter(isWorkingSet))
    if (newBest <= 0) continue
    const priorSessions = sessionsForExercise(prior, entry.exerciseId)
    if (priorSessions.length === 0) continue // no ghost yet → not a "beat"
    const lastPrior = priorSessions[priorSessions.length - 1]
    const ghost = bestSetMetric(workingSetsFor(lastPrior, entry.exerciseId))
    if (ghost > 0 && newBest > ghost) out.push(entry.exerciseId)
  }
  return out
}

/**
 * Exercise ids in `newWorkout` flagged as an ego-lift: top working-set weight
 * jumped more than 2× the exercise's increment above the prior best. These earn
 * no bonus XP and no celebration (still logged as data) — anti-exploit.
 */
export function egoLiftExercises(
  priorWorkouts: Workout[],
  newWorkout: Workout,
  customExercises: ExerciseDef[] = [],
): Set<string> {
  const flagged = new Set<string>()
  if (!newWorkout.entries) return flagged
  const prior = priorWorkouts.filter((w) => w.id !== newWorkout.id)
  for (const entry of newWorkout.entries) {
    const def = resolveExercise(entry.exerciseId, customExercises)
    if (!def || def.loadType !== 'external' || def.incrementKg <= 0) continue
    const newMaxW = maxWeight(entry.sets.filter(isWorkingSet))
    const priorSets = sessionsForExercise(prior, entry.exerciseId).flatMap((w) =>
      workingSetsFor(w, entry.exerciseId),
    )
    const priorMaxW = maxWeight(priorSets)
    if (priorMaxW > 0 && newMaxW - priorMaxW > 2 * def.incrementKg) {
      flagged.add(entry.exerciseId)
    }
  }
  return flagged
}
