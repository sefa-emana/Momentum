import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Angry,
  ChevronDown,
  Frown,
  Laugh,
  Meh,
  Plus,
  Smile,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useStore, type WorkoutReward } from '../state/store'
import { useDerived } from '../ui/hooks'
import {
  INTENSITY_META,
  WORKOUT_TYPE_META,
  dayKey,
  ghostSetsFor,
  progressionHint,
  resolveExercise,
  restSecondsFor,
  xpForWorkout,
  type ExerciseDef,
  type Intensity,
  type ProgressionHint,
  type WorkoutType,
} from '../domain'
import { WORKOUT_TYPE_ICON, INTENSITY_ICON, ICON_STROKE } from '../ui/icons'
import { BottomSheet } from '../ui/BottomSheet'
import { RestTimerBar, type RestControl } from './RestTimerBar'
import { ExercisePicker } from './ExercisePicker'
import { ExerciseSetEditor } from './ExerciseSetEditor'
import {
  confirmedSetCount,
  draftFromEntry,
  draftFromGhost,
  entriesFromDrafts,
  type DraftExercise,
  type LogInitial,
} from './setDraft'

const TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'sport', 'other']
const INTENSITIES: Intensity[] = ['light', 'moderate', 'vigorous']
const DURATIONS = [15, 30, 45, 60, 90]

/** Post-session RPE tap ("Wie hart war's wirklich?"). Sharpens load, not XP. */
const FEEL_OPTIONS: { label: string; value: number }[] = [
  { label: 'Locker', value: 3 },
  { label: 'Solide', value: 5 },
  { label: 'Hart', value: 7 },
  { label: 'Alles gegeben', value: 9 },
]

/** Mood-after 5-tap (affective response predicts adherence, PMC2390920). */
const MOOD_ICONS: { value: 1 | 2 | 3 | 4 | 5; Icon: LucideIcon; label: string }[] = [
  { value: 1, Icon: Angry, label: 'schlecht' },
  { value: 2, Icon: Frown, label: 'mäßig' },
  { value: 3, Icon: Meh, label: 'okay' },
  { value: 4, Icon: Smile, label: 'gut' },
  { value: 5, Icon: Laugh, label: 'top' },
]

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Sets-based duration estimate (min): ~4 min per confirmed working set. */
function estimateDuration(sets: number): number {
  return Math.max(10, Math.min(120, sets * 4))
}

export function LogWorkoutSheet({
  onClose,
  onLogged,
  initial,
}: {
  onClose: () => void
  onLogged: (reward: WorkoutReward, moodAfter?: 1 | 2 | 3 | 4 | 5) => void
  initial?: LogInitial
}) {
  const logWorkout = useStore((s) => s.logWorkout)
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)
  const { momentum } = useDerived()
  const restRef = useRef<RestControl>(null)

  const initType = initial?.type ?? 'strength'
  const [type, setType] = useState<WorkoutType>(initType)
  const [setsMode, setSetsMode] = useState(
    (initial?.entries?.length ?? 0) > 0 || initType === 'strength',
  )
  const [intensity, setIntensity] = useState<Intensity>(initial?.intensity ?? 'moderate')
  const [duration, setDuration] = useState(initial?.durationMin ?? 30)
  const [durationTouched, setDurationTouched] = useState(initial?.durationMin !== undefined)
  const [note, setNote] = useState(initial?.note ?? '')
  const [dateStr, setDateStr] = useState(todayStr())

  const [exercises, setExercises] = useState<DraftExercise[]>(
    () => initial?.entries?.map(draftFromEntry) ?? [],
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Optional "Mehr" section — all default-off, never preselected.
  const [moreOpen, setMoreOpen] = useState(false)
  const [feel, setFeel] = useState<number | undefined>(undefined)
  const [prBeaten, setPrBeaten] = useState(false)
  const [moodAfter, setMoodAfter] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined)

  const isBackfill = dateStr < todayStr()
  const confirmedSets = confirmedSetCount(exercises)

  // In Satz-Modus, derive duration from the set count until the user overrides.
  useEffect(() => {
    if (setsMode && !durationTouched && confirmedSets > 0) {
      setDuration(estimateDuration(confirmedSets))
    }
  }, [setsMode, durationTouched, confirmedSets])

  const changeType = (t: WorkoutType) => {
    setType(t)
    setSetsMode(t === 'strength')
  }

  const priorSameDayCount = useMemo(() => {
    const today = dayKey(new Date().toISOString())
    return workouts.filter((w) => dayKey(w.date) === today).length
  }, [workouts])

  const previewXp = useMemo(
    () => xpForWorkout({ durationMin: duration, intensity, momentum, priorSameDayCount }),
    [duration, intensity, momentum, priorSameDayCount],
  )

  const hints = useMemo(
    () =>
      Object.fromEntries(
        exercises.map((e) => [e.key, progressionHint(workouts, e.exerciseId, customExercises)]),
      ),
    [exercises, workouts, customExercises],
  )

  const addExercise = (exerciseId: string) => {
    const def = resolveExercise(exerciseId, customExercises)
    const ghost = ghostSetsFor(workouts, exerciseId)
    setExercises((xs) => [...xs, draftFromGhost(exerciseId, ghost, def)])
    setPickerOpen(false)
  }

  const isoForSubmit = () => {
    if (dateStr === todayStr()) return new Date().toISOString()
    return new Date(`${dateStr}T12:00:00`).toISOString()
  }

  const submit = () => {
    const entries = setsMode ? entriesFromDrafts(exercises) : undefined
    const reward = logWorkout({
      type,
      durationMin: duration,
      intensity,
      note,
      date: isoForSubmit(),
      feel,
      prBeaten,
      moodAfter,
      entries: entries && entries.length > 0 ? entries : undefined,
    })
    onLogged(reward, moodAfter)
  }

  // Never block saving: with no confirmed sets a Satz-Modus session simply logs
  // as a duration-only strength session (graceful fallback). We only nudge.
  const showSetsHint = setsMode && exercises.length > 0 && confirmedSets === 0

  return (
    <>
      <BottomSheet
        onClose={onClose}
        ariaLabel="Training loggen"
        data-testid="log-sheet"
        sticky={<RestTimerBar ref={restRef} />}
        header={
          <>
            <h2 style={{ fontSize: 22, marginBottom: 2 }}>Training loggen</h2>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Auch 5 Minuten zählen. Zeig dich.
            </p>
          </>
        }
      >
        <div className="stack" style={{ gap: 18, paddingTop: 12 }}>
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
                    onClick={() => changeType(t)}
                  >
                    <Icon size={16} strokeWidth={ICON_STROKE} aria-hidden />
                    {WORKOUT_TYPE_META[t].label}
                  </button>
                )
              })}
            </div>
            {type === 'strength' && (
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="chip"
                  data-active={setsMode}
                  onClick={() => setSetsMode(true)}
                >
                  Sätze
                </button>
                <button
                  type="button"
                  className="chip"
                  data-active={!setsMode}
                  onClick={() => setSetsMode(false)}
                >
                  Nur Dauer
                </button>
              </div>
            )}
          </div>

          {/* Date row — default Heute; a past date backfills automatically. */}
          <div>
            <label className="field-label" htmlFor="log-date">Datum</label>
            <input
              id="log-date"
              className="input"
              type="date"
              value={dateStr}
              max={todayStr()}
              onChange={(e) => setDateStr(e.target.value || todayStr())}
            />
            {isBackfill && (
              <p className="backfill-note" style={{ marginTop: 8 }}>
                Nachgetragen — zählt ohne Feier-Boni.
              </p>
            )}
          </div>

          {setsMode ? (
            <SatzMode
              exercises={exercises}
              setExercises={setExercises}
              hints={hints}
              customExercises={customExercises}
              onOpenPicker={() => setPickerOpen(true)}
              onSetConfirmed={(def) => {
                const secs = restSecondsFor(def)
                if (secs > 0) restRef.current?.start(secs)
              }}
              detailsOpen={detailsOpen}
              setDetailsOpen={setDetailsOpen}
              duration={duration}
              setDuration={(d) => {
                setDuration(d)
                setDurationTouched(true)
              }}
              intensity={intensity}
              setIntensity={setIntensity}
              note={note}
              setNote={setNote}
            />
          ) : (
            <QuickMode
              intensity={intensity}
              setIntensity={setIntensity}
              duration={duration}
              setDuration={(d) => {
                setDuration(d)
                setDurationTouched(true)
              }}
              note={note}
              setNote={setNote}
            />
          )}

          <div>
            <button
              type="button"
              className="row-between"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
              style={{ width: '100%', padding: '6px 0', color: 'var(--text-dim)', fontWeight: 600, fontSize: 14 }}
            >
              Mehr (optional)
              <ChevronDown
                size={18}
                strokeWidth={ICON_STROKE}
                aria-hidden
                style={{ transition: 'transform 0.2s ease', transform: moreOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {moreOpen && (
              <div className="stack" style={{ gap: 18, marginTop: 12 }}>
                <div>
                  <span className="field-label">Wie hart war&apos;s wirklich?</span>
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
                  <span className="field-label">Persönlicher Rekord?</span>
                  <button
                    type="button"
                    className="chip"
                    data-active={prBeaten}
                    aria-pressed={prBeaten}
                    onClick={() => setPrBeaten((v) => !v)}
                  >
                    <Trophy size={16} strokeWidth={ICON_STROKE} aria-hidden />
                    Heute gesteigert (PR)
                  </button>
                </div>

                <div>
                  <span className="field-label">Wie fühlst du dich jetzt?</span>
                  <div className="row" style={{ gap: 8 }}>
                    {MOOD_ICONS.map(({ value, Icon, label }) => (
                      <button
                        key={value}
                        type="button"
                        className="chip"
                        data-active={moodAfter === value}
                        aria-pressed={moodAfter === value}
                        aria-label={`Stimmung ${label}`}
                        onClick={() => setMoodAfter(moodAfter === value ? undefined : value)}
                        style={{ flex: 1, justifyContent: 'center', padding: '10px 0' }}
                      >
                        <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="row-between card" style={{ padding: 14, background: 'var(--surface-2)' }}>
            <span className="muted">Belohnung</span>
            <strong className="tnum" style={{ fontSize: 18, color: 'var(--xp)' }}>
              +{previewXp} XP
            </strong>
          </div>

          {showSetsHint && (
            <p className="faint" style={{ fontSize: 12.5, textAlign: 'center', margin: 0 }}>
              Tipp: Bestätige deine Sätze mit ✓, damit sie mitgezählt werden.
            </p>
          )}
          <button
            className="btn btn-primary btn-block"
            onClick={submit}
            data-testid="submit-workout"
          >
            Einheit speichern
          </button>
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

function SatzMode({
  exercises,
  setExercises,
  hints,
  customExercises,
  onOpenPicker,
  onSetConfirmed,
  detailsOpen,
  setDetailsOpen,
  duration,
  setDuration,
  intensity,
  setIntensity,
  note,
  setNote,
}: {
  exercises: DraftExercise[]
  setExercises: React.Dispatch<React.SetStateAction<DraftExercise[]>>
  hints: Record<string, ProgressionHint | null>
  customExercises: ExerciseDef[]
  onOpenPicker: () => void
  onSetConfirmed: (def: ExerciseDef | undefined) => void
  detailsOpen: boolean
  setDetailsOpen: (v: boolean) => void
  duration: number
  setDuration: (d: number) => void
  intensity: Intensity
  setIntensity: (i: Intensity) => void
  note: string
  setNote: (s: string) => void
}) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      {exercises.length === 0 && (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Füge eine Übung hinzu — die letzten Werte sind schon vorausgefüllt.
        </p>
      )}

      {exercises.map((ex) => (
        <ExerciseSetEditor
          key={ex.key}
          draft={ex}
          def={resolveExercise(ex.exerciseId, customExercises)}
          hint={hints[ex.key] ?? null}
          onChange={(d) => setExercises((xs) => xs.map((x) => (x.key === d.key ? d : x)))}
          onRemove={() => setExercises((xs) => xs.filter((x) => x.key !== ex.key))}
          onSetConfirmed={onSetConfirmed}
        />
      ))}

      <button type="button" className="btn btn-block" onClick={onOpenPicker} data-testid="add-exercise">
        <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />
        Übung
      </button>

      <div>
        <button
          type="button"
          className="row-between"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(!detailsOpen)}
          style={{ width: '100%', padding: '4px 0', color: 'var(--text-dim)', fontWeight: 600, fontSize: 14 }}
        >
          Details · {duration} Min · {INTENSITY_META[intensity].label}
          <ChevronDown
            size={18}
            strokeWidth={ICON_STROKE}
            aria-hidden
            style={{ transition: 'transform 0.2s ease', transform: detailsOpen ? 'rotate(180deg)' : 'none' }}
          />
        </button>
        {detailsOpen && (
          <div className="stack" style={{ gap: 16, marginTop: 12 }}>
            <DurationField duration={duration} setDuration={setDuration} />
            <IntensityField intensity={intensity} setIntensity={setIntensity} />
            <NoteField note={note} setNote={setNote} />
          </div>
        )}
      </div>
    </div>
  )
}

function QuickMode({
  intensity,
  setIntensity,
  duration,
  setDuration,
  note,
  setNote,
}: {
  intensity: Intensity
  setIntensity: (i: Intensity) => void
  duration: number
  setDuration: (d: number) => void
  note: string
  setNote: (s: string) => void
}) {
  return (
    <>
      <IntensityField intensity={intensity} setIntensity={setIntensity} />
      <DurationField duration={duration} setDuration={setDuration} />
      <NoteField note={note} setNote={setNote} />
    </>
  )
}

function IntensityField({
  intensity,
  setIntensity,
}: {
  intensity: Intensity
  setIntensity: (i: Intensity) => void
}) {
  return (
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
  )
}

function DurationField({
  duration,
  setDuration,
}: {
  duration: number
  setDuration: (d: number) => void
}) {
  return (
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
        max={120}
        step={5}
        value={duration}
        aria-label="Dauer in Minuten"
        onChange={(e) => setDuration(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  )
}

function NoteField({ note, setNote }: { note: string; setNote: (s: string) => void }) {
  return (
    <div>
      <label className="field-label" htmlFor="note">Notiz (optional)</label>
      <input
        id="note"
        className="input"
        placeholder="z. B. Neuer PR beim Bankdrücken"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={140}
      />
    </div>
  )
}
