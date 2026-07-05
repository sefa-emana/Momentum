/**
 * Draft model for set-based logging/editing. A DraftSet carries UI-only flags
 * (`confirmed`, `ghost`, `id`) on top of the domain SetEntry fields; on save we
 * strip those and keep only confirmed sets.
 */
import type {
  ExerciseDef,
  ExerciseEntry,
  Intensity,
  SetEntry,
  WorkoutType,
} from '../domain'

/** Prefill for opening the log sheet from a "Duplizieren" action. */
export interface LogInitial {
  type?: WorkoutType
  intensity?: Intensity
  durationMin?: number
  note?: string
  entries?: ExerciseEntry[]
}

export interface DraftSet {
  id: string
  weightKg?: number
  reps?: number
  rir?: number
  kind: SetEntry['kind']
  /** Confirmed via the ✓ tap — only confirmed sets are saved. */
  confirmed: boolean
  /** Pre-filled from last session (rendered grey until confirmed). */
  ghost: boolean
}

export interface DraftExercise {
  key: string
  exerciseId: string
  sets: DraftSet[]
}

let seq = 0
export function newDraftId(): string {
  seq += 1
  return `d${Date.now().toString(36)}-${seq}`
}

/** A single blank working set seeded with the exercise's target-band minimum. */
export function blankSet(def?: ExerciseDef): DraftSet {
  return {
    id: newDraftId(),
    weightKg: def && def.loadType === 'external' ? undefined : undefined,
    reps: def?.defaultRepRange.min,
    kind: 'normal',
    confirmed: false,
    ghost: false,
  }
}

/** Build a draft exercise from ghost sets (grey, unconfirmed). Falls back to a
 *  single blank set when there is no history. */
export function draftFromGhost(
  exerciseId: string,
  ghostSets: SetEntry[],
  def?: ExerciseDef,
): DraftExercise {
  const sets: DraftSet[] =
    ghostSets.length > 0
      ? ghostSets.map((s) => ({
          id: newDraftId(),
          weightKg: s.weightKg,
          reps: s.reps,
          rir: s.rir,
          kind: s.kind === 'warmup' ? 'normal' : s.kind,
          confirmed: false,
          ghost: true,
        }))
      : [blankSet(def)]
  return { key: newDraftId(), exerciseId, sets }
}

/** Build an editable draft from a saved entry (all sets confirmed, not ghost). */
export function draftFromEntry(entry: ExerciseEntry): DraftExercise {
  return {
    key: newDraftId(),
    exerciseId: entry.exerciseId,
    sets: entry.sets.map((s) => ({
      id: newDraftId(),
      weightKg: s.weightKg,
      reps: s.reps,
      rir: s.rir,
      kind: s.kind,
      confirmed: true,
      ghost: false,
    })),
  }
}

/** Duplicate the last set (for "+ Satz"), keeping its values but unconfirmed. */
export function duplicateLastSet(sets: DraftSet[], def?: ExerciseDef): DraftSet {
  const last = sets[sets.length - 1]
  if (!last) return blankSet(def)
  return {
    id: newDraftId(),
    weightKg: last.weightKg,
    reps: last.reps,
    rir: last.rir,
    kind: last.kind === 'warmup' ? 'normal' : last.kind,
    confirmed: false,
    ghost: false,
  }
}

/** Convert drafts to domain entries, keeping only confirmed sets and exercises
 *  that end up with at least one. */
export function entriesFromDrafts(drafts: DraftExercise[]): ExerciseEntry[] {
  const out: ExerciseEntry[] = []
  for (const d of drafts) {
    const sets: SetEntry[] = d.sets
      .filter((s) => s.confirmed)
      .map((s) => ({
        weightKg: s.weightKg,
        reps: s.reps,
        rir: s.rir,
        kind: s.kind,
      }))
    if (sets.length > 0) out.push({ exerciseId: d.exerciseId, sets })
  }
  return out
}

/** Total confirmed working sets across drafts (drives the duration estimate). */
export function confirmedSetCount(drafts: DraftExercise[]): number {
  return drafts.reduce(
    (n, d) => n + d.sets.filter((s) => s.confirmed && s.kind !== 'warmup').length,
    0,
  )
}
