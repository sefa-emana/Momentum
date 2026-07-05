import { useMemo, useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../state/store'
import {
  INTENSITY_META,
  WORKOUT_TYPE_META,
  progressionHint,
  resolveExercise,
  type Intensity,
  type Workout,
  type WorkoutType,
} from '../domain'
import { WORKOUT_TYPE_ICON, INTENSITY_ICON, ICON_STROKE } from '../ui/icons'
import { BottomSheet } from '../ui/BottomSheet'
import { ExercisePicker } from './ExercisePicker'
import { ExerciseSetEditor } from './ExerciseSetEditor'
import {
  draftFromEntry,
  draftFromGhost,
  entriesFromDrafts,
  type DraftExercise,
  type LogInitial,
} from './setDraft'

const TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'sport', 'other']
const INTENSITIES: Intensity[] = ['light', 'moderate', 'vigorous']
const DURATIONS = [15, 30, 45, 60, 90]

const FEEL_OPTIONS = [
  { label: 'Locker', value: 3 },
  { label: 'Solide', value: 5 },
  { label: 'Hart', value: 7 },
  { label: 'Alles gegeben', value: 9 },
]

export function EditWorkoutSheet({
  workout,
  onClose,
  onDeleted,
  onDuplicate,
}: {
  workout: Workout
  onClose: () => void
  onDeleted: (workout: Workout) => void
  onDuplicate: (initial: LogInitial) => void
}) {
  const updateWorkout = useStore((s) => s.updateWorkout)
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)

  const [type, setType] = useState<WorkoutType>(workout.type)
  const [intensity, setIntensity] = useState<Intensity>(workout.intensity)
  const [duration, setDuration] = useState(workout.durationMin)
  const [note, setNote] = useState(workout.note ?? '')
  const [feel, setFeel] = useState<number | undefined>(workout.feel)
  const [dateStr, setDateStr] = useState(() => isoToDate(workout.date))
  const [timeStr, setTimeStr] = useState(() => isoToTime(workout.date))
  const [exercises, setExercises] = useState<DraftExercise[]>(
    () => workout.entries?.map(draftFromEntry) ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  const hasEntries = exercises.length > 0 || (workout.entries?.length ?? 0) > 0

  // Progression hints as of the history BEFORE this workout (exclude self).
  const priorWorkouts = useMemo(
    () => workouts.filter((w) => w.id !== workout.id),
    [workouts, workout.id],
  )
  const hints = useMemo(
    () =>
      Object.fromEntries(
        exercises.map((e) => [
          e.key,
          progressionHint(priorWorkouts, e.exerciseId, customExercises),
        ]),
      ),
    [exercises, priorWorkouts, customExercises],
  )

  const addExercise = (exerciseId: string) => {
    const def = resolveExercise(exerciseId, customExercises)
    setExercises((xs) => [...xs, draftFromGhost(exerciseId, [], def)])
    setPickerOpen(false)
  }

  const combinedIso = () => new Date(`${dateStr}T${timeStr || '12:00'}:00`).toISOString()

  const save = () => {
    const entries = entriesFromDrafts(exercises)
    updateWorkout(workout.id, {
      type,
      intensity,
      durationMin: duration,
      note,
      feel,
      date: combinedIso(),
      entries: hasEntries ? entries : undefined,
    })
    onClose()
  }

  const duplicate = () => {
    onDuplicate({
      type,
      intensity,
      durationMin: duration,
      note: note || undefined,
      entries: hasEntries ? entriesFromDrafts(exercises) : undefined,
    })
  }

  return (
    <>
      <BottomSheet
        onClose={onClose}
        ariaLabel="Einheit bearbeiten"
        data-testid="edit-sheet"
        header={<h2 style={{ fontSize: 22 }}>Einheit bearbeiten</h2>}
      >
        <div className="stack" style={{ gap: 18, paddingTop: 12 }}>
          {workout.backfilled && (
            <p className="backfill-note">Nachgetragen — zählt ohne Feier-Boni.</p>
          )}

          <div>
            <span className="field-label">Art</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((t) => {
                const Icon = WORKOUT_TYPE_ICON[t]
                return (
                  <button
                    key={t}
                    className="chip"
                    data-active={type === t}
                    onClick={() => setType(t)}
                  >
                    <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden />
                    {WORKOUT_TYPE_META[t].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label" htmlFor="edit-date">Datum</label>
              <input
                id="edit-date"
                className="input"
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div style={{ width: 120 }}>
              <label className="field-label" htmlFor="edit-time">Uhrzeit</label>
              <input
                id="edit-time"
                className="input"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
              />
            </div>
          </div>

          {hasEntries && (
            <div className="stack" style={{ gap: 14 }}>
              {exercises.map((ex) => (
                <ExerciseSetEditor
                  key={ex.key}
                  draft={ex}
                  def={resolveExercise(ex.exerciseId, customExercises)}
                  hint={hints[ex.key] ?? null}
                  onChange={(d) =>
                    setExercises((xs) => xs.map((x) => (x.key === d.key ? d : x)))
                  }
                  onRemove={() => setExercises((xs) => xs.filter((x) => x.key !== ex.key))}
                />
              ))}
              <button
                type="button"
                className="btn btn-block"
                onClick={() => setPickerOpen(true)}
                data-testid="add-exercise"
              >
                <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />
                Übung
              </button>
            </div>
          )}

          <div>
            <span className="field-label">Dauer: {duration} Min</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {DURATIONS.map((min) => (
                <button
                  key={min}
                  className="chip"
                  data-active={duration === min}
                  onClick={() => setDuration(min)}
                >
                  {min}′
                </button>
              ))}
            </div>
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={duration}
              aria-label="Dauer in Minuten"
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div>
            <span className="field-label">Intensität</span>
            <div className="row" style={{ gap: 8 }}>
              {INTENSITIES.map((i) => {
                const { Icon, color } = INTENSITY_ICON[i]
                return (
                  <button
                    key={i}
                    className="chip"
                    data-active={intensity === i}
                    onClick={() => setIntensity(i)}
                  >
                    <Icon size={16} strokeWidth={ICON_STROKE} style={{ color }} aria-hidden />
                    {INTENSITY_META[i].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <span className="field-label">Wie hart war&apos;s?</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {FEEL_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className="chip"
                  data-active={feel === f.value}
                  aria-pressed={feel === f.value}
                  onClick={() => setFeel(feel === f.value ? undefined : f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="edit-note">Notiz</label>
            <input
              id="edit-note"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={save} data-testid="save-edit">
            Speichern
          </button>

          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={duplicate}>
              <Copy size={18} strokeWidth={ICON_STROKE} aria-hidden />
              Duplizieren
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, color: 'var(--accent-hot)' }}
              onClick={() => onDeleted(workout)}
              data-testid="delete-workout"
            >
              <Trash2 size={18} strokeWidth={ICON_STROKE} aria-hidden />
              Löschen
            </button>
          </div>
        </div>
      </BottomSheet>

      {pickerOpen && (
        <ExercisePicker
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
          excludeIds={exercises.map((e) => e.exerciseId)}
        />
      )}
    </>
  )
}

function isoToDate(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
