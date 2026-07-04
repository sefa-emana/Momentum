import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
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

const TYPES: WorkoutType[] = ['strength', 'cardio', 'mobility', 'sport', 'other']
const INTENSITIES: Intensity[] = ['light', 'moderate', 'vigorous']
const DURATIONS = [15, 30, 45, 60, 90]

export function LogWorkoutSheet({
  onClose,
  onLogged,
}: {
  onClose: () => void
  onLogged: (reward: WorkoutReward) => void
}) {
  const logWorkout = useStore((s) => s.logWorkout)
  const workouts = useStore((s) => s.workouts)
  const { momentum } = useDerived()

  const [type, setType] = useState<WorkoutType>('strength')
  const [intensity, setIntensity] = useState<Intensity>('moderate')
  const [duration, setDuration] = useState(30)
  const [note, setNote] = useState('')

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
    const reward = logWorkout({ type, durationMin: duration, intensity, note })
    onLogged(reward)
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
          Auch 5 Minuten zählen. Zeig dich. 💪
        </p>

        <div className="stack" style={{ gap: 18 }}>
          <div>
            <span className="field-label">Art</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  className="chip"
                  data-active={type === t}
                  onClick={() => setType(t)}
                >
                  <span aria-hidden>{WORKOUT_TYPE_META[t].icon}</span>
                  {WORKOUT_TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="field-label">Intensität</span>
            <div className="row" style={{ gap: 8 }}>
              {INTENSITIES.map((i) => (
                <button
                  key={i}
                  className="chip"
                  data-active={intensity === i}
                  onClick={() => setIntensity(i)}
                >
                  <span aria-hidden>{INTENSITY_META[i].icon}</span>
                  {INTENSITY_META[i].label}
                </button>
              ))}
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

          <div className="row-between card" style={{ padding: 14, background: 'var(--bg-card-2)' }}>
            <span className="muted">Belohnung</span>
            <strong style={{ fontSize: 18, color: 'var(--xp)' }}>
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
