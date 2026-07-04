import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Angry,
  ChevronDown,
  Frown,
  Laugh,
  Meh,
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
  xpForWorkout,
  type Intensity,
  type WorkoutType,
} from '../domain'
import { WORKOUT_TYPE_ICON, INTENSITY_ICON, ICON_STROKE } from '../ui/icons'

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

export function LogWorkoutSheet({
  onClose,
  onLogged,
}: {
  onClose: () => void
  onLogged: (reward: WorkoutReward, moodAfter?: 1 | 2 | 3 | 4 | 5) => void
}) {
  const logWorkout = useStore((s) => s.logWorkout)
  const workouts = useStore((s) => s.workouts)
  const { momentum } = useDerived()

  const [type, setType] = useState<WorkoutType>('strength')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [duration, setDuration] = useState(30)
  const [note, setNote] = useState('')

  // Optional "Mehr" section — all default-off, never preselected.
  const [moreOpen, setMoreOpen] = useState(false)
  const [feel, setFeel] = useState<number | undefined>(undefined)
  const [prBeaten, setPrBeaten] = useState(false)
  const [moodAfter, setMoodAfter] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined)

  const priorSameDayCount = useMemo(() => {
    const today = dayKey(new Date().toISOString())
    return workouts.filter((w) => dayKey(w.date) === today).length
  }, [workouts])

  const previewXp = useMemo(
    () =>
      xpForWorkout({
        durationMin: duration,
        intensity,
        momentum,
        priorSameDayCount,
      }),
    [duration, intensity, momentum, priorSameDayCount],
  )

  const submit = () => {
    const reward = logWorkout({
      type,
      durationMin: duration,
      intensity,
      note,
      feel,
      prBeaten,
      moodAfter,
    })
    onLogged(reward, moodAfter)
  }

  return (
    <motion.div
      className="overlay-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Training loggen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 22, marginBottom: 4 }}>Training loggen</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 18 }}>
          Auch 5 Minuten zählen. Zeig dich.
        </p>

        <div className="stack" style={{ gap: 18 }}>
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

          <button className="btn btn-primary btn-block" onClick={submit} data-testid="submit-workout">
            Einheit speichern
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
