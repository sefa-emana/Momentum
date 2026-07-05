import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Inbox, Pencil, Trash2, Undo2, X } from 'lucide-react'
import { useStore, type WorkoutReward } from '../state/store'
import { useNow } from '../ui/hooks'
import { WORKOUT_TYPE_META, dayKey, type Workout } from '../domain'
import { WORKOUT_TYPE_ICON, INTENSITY_ICON, ICON_STROKE } from '../ui/icons'
import { summarizeEntries } from '../ui/entrySummary'
import { Heatmap } from './Heatmap'
import { EditWorkoutSheet } from './EditWorkoutSheet'
import { LogWorkoutSheet } from './LogWorkoutSheet'
import { RewardOverlay } from './RewardOverlay'
import type { LogInitial } from './setDraft'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const UNDO_MS = 6000

export function History() {
  const workouts = useStore((s) => s.workouts)
  const deleteWorkout = useStore((s) => s.deleteWorkout)
  const restoreWorkout = useStore((s) => s.restoreWorkout)
  const customExercises = useStore((s) => s.customExercises)
  const now = useNow()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const [editing, setEditing] = useState<Workout | null>(null)
  const [duplicate, setDuplicate] = useState<LogInitial | null>(null)
  const [reward, setReward] = useState<
    { reward: WorkoutReward; moodAfter?: 1 | 2 | 3 | 4 | 5 } | null
  >(null)
  const [undo, setUndo] = useState<Workout | null>(null)
  const undoTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }, [])

  const doDelete = (w: Workout) => {
    setEditing(null)
    deleteWorkout(w.id)
    setUndo(w)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS)
  }

  const doUndo = () => {
    if (undo) restoreWorkout(undo)
    setUndo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }

  const sorted = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  const filtered = selectedDay
    ? sorted.filter((w) => dayKey(w.date) === selectedDay)
    : sorted
  const groups = groupByDay(filtered)

  return (
    <div className="screen">
      <h1 className="screen-title">Verlauf</h1>
      <p className="screen-sub">{workouts.length} Einheiten insgesamt</p>

      {sorted.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <Inbox size={40} strokeWidth={1.5} style={{ color: 'var(--text-faint)' }} aria-hidden />
          <p className="muted">Noch keine Einheiten. Tippe auf +, um loszulegen.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: 20 }}>
          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <strong>Konsistenz</strong>
              <span className="faint" style={{ fontSize: 12 }}>letzte {17} Wochen</span>
            </div>
            <Heatmap
              workouts={workouts}
              now={now}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </div>

          {selectedDay && (
            <div className="row-between" style={{ gap: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>
                {formatDayHeader(selectedDay)} ·{' '}
                {filtered.length === 0
                  ? 'Ruhetag'
                  : `${filtered.length} Einheit${filtered.length === 1 ? '' : 'en'}`}
              </span>
              <button
                className="chip"
                onClick={() => setSelectedDay(null)}
                aria-label="Filter aufheben"
              >
                <X size={14} strokeWidth={ICON_STROKE} aria-hidden />
                Alle zeigen
              </button>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p className="muted" style={{ margin: 0 }}>
                Ruhetag — Erholung ist Teil des Trainings.
              </p>
            </div>
          ) : (
            groups.map(([day, items]) => (
              <div key={day} className="stack" style={{ gap: 8 }}>
                <div className="faint" style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {formatDayHeader(day)}
                </div>
                {items.map((w) => {
                  const TypeIcon = WORKOUT_TYPE_ICON[w.type]
                  const intensity = INTENSITY_ICON[w.intensity]
                  const IntensityIcon = intensity.Icon
                  const summary = summarizeEntries(w, customExercises)
                  const label = WORKOUT_TYPE_META[w.type].label
                  return (
                    <div key={w.id} className="list-item">
                      <button
                        className="row"
                        aria-label={`${label} bearbeiten`}
                        onClick={() => setEditing(w)}
                        style={{ flex: 1, minWidth: 0, gap: 12, textAlign: 'left', background: 'none' }}
                      >
                        <span className="badge-icon" aria-hidden>
                          <TypeIcon size={22} strokeWidth={ICON_STROKE} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row" style={{ gap: 8 }}>
                            <strong>{label}</strong>
                            <span className="faint row" style={{ fontSize: 12, gap: 4 }}>
                              <IntensityIcon size={13} strokeWidth={ICON_STROKE} style={{ color: intensity.color }} aria-hidden />
                              {w.durationMin}′
                            </span>
                            <Pencil size={13} strokeWidth={ICON_STROKE} aria-hidden style={{ color: 'var(--text-faint)' }} />
                          </div>
                          {summary ? (
                            <div className="entry-summary">{summary}</div>
                          ) : (
                            w.note && (
                              <div className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {w.note}
                              </div>
                            )
                          )}
                          <div className="faint" style={{ fontSize: 11.5 }}>
                            {format(new Date(w.date), 'HH:mm', { locale: de })} Uhr
                          </div>
                        </div>
                      </button>
                      <span className="pill" style={{ color: 'var(--xp)' }}>+{w.xpEarned}</span>
                      <button
                        aria-label="Einheit löschen"
                        className="btn-ghost"
                        style={{ display: 'inline-flex', padding: 6, color: 'var(--text-faint)' }}
                        onClick={() => doDelete(w)}
                      >
                        <Trash2 size={18} strokeWidth={ICON_STROKE} aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <EditWorkoutSheet
          workout={editing}
          onClose={() => setEditing(null)}
          onDeleted={doDelete}
          onDuplicate={(init) => {
            setEditing(null)
            setDuplicate(init)
          }}
        />
      )}

      {duplicate && (
        <LogWorkoutSheet
          initial={duplicate}
          onClose={() => setDuplicate(null)}
          onLogged={(r, moodAfter) => {
            setDuplicate(null)
            setReward({ reward: r, moodAfter })
          }}
        />
      )}

      <AnimatePresence>
        {reward && (
          <RewardOverlay
            key="reward"
            reward={reward.reward}
            moodAfter={reward.moodAfter}
            onClose={() => setReward(null)}
          />
        )}
      </AnimatePresence>

      {undo && (
        <div className="snackbar" role="status">
          <span style={{ flex: 1 }}>Einheit gelöscht</span>
          <button className="snackbar-action" onClick={doUndo}>
            <Undo2 size={16} strokeWidth={ICON_STROKE} aria-hidden style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Rückgängig
          </button>
        </div>
      )}
    </div>
  )
}

function groupByDay(workouts: Workout[]): [string, Workout[]][] {
  const map = new Map<string, Workout[]>()
  for (const w of workouts) {
    const key = format(new Date(w.date), 'yyyy-MM-dd')
    const arr = map.get(key) ?? []
    arr.push(w)
    map.set(key, arr)
  }
  return [...map.entries()]
}

function formatDayHeader(day: string): string {
  const d = new Date(`${day}T12:00:00`)
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
  if (day === today) return 'Heute'
  if (day === yesterday) return 'Gestern'
  return format(d, 'EEEE, d. MMMM', { locale: de })
}
