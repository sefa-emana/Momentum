import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useDerived } from '../ui/hooks'
import {
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  type AppState,
} from '../domain'

export function Profile() {
  const settings = useStore((s) => s.settings)
  const setName = useStore((s) => s.setName)
  const setWeeklyGoal = useStore((s) => s.setWeeklyGoal)
  const setReducedMotion = useStore((s) => s.setReducedMotion)
  const resetAll = useStore((s) => s.resetAll)
  const importState = useStore((s) => s.importState)
  const d = useDerived()

  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  const exportData = () => {
    const state = useStore.getState()
    const data: AppState = {
      version: state.version,
      createdAt: state.createdAt,
      workouts: state.workouts,
      bonusXp: state.bonusXp,
      goalMetWeeks: state.goalMetWeeks,
      unlocked: state.unlocked,
      settings: state.settings,
      onboarded: state.onboarded,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `momentum-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Backup heruntergeladen.')
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState
        if (!Array.isArray(parsed.workouts)) throw new Error('invalid')
        importState({ ...parsed, onboarded: true })
        setStatus('Daten importiert.')
      } catch {
        setStatus('Import fehlgeschlagen — ungültige Datei.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Profil</h1>
      <p className="screen-sub">Einstellungen & Daten</p>

      <div className="stack" style={{ gap: 16 }}>
        <div className="grid-2">
          <div className="stat">
            <div className="stat-value">⏱️ {Math.round(d.totalMinutes / 60)}h</div>
            <div className="stat-label">Trainingszeit gesamt</div>
          </div>
          <div className="stat">
            <div className="stat-value">🏅 {d.longestStreak}</div>
            <div className="stat-label">Längste Streak</div>
          </div>
        </div>

        <div className="card stack" style={{ gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="p-name">Name</label>
            <input
              id="p-name"
              className="input"
              value={settings.name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="p-goal">
              Wochenziel: {settings.weeklyGoal.workoutsPerWeek} Einheiten
            </label>
            <input
              id="p-goal"
              type="range"
              min={MIN_WEEKLY_GOAL}
              max={MAX_WEEKLY_GOAL}
              value={settings.weeklyGoal.workoutsPerWeek}
              onChange={(e) => setWeeklyGoal(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <label className="row-between" style={{ cursor: 'pointer' }}>
            <span>Animationen reduzieren</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--accent)' }}
            />
          </label>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <strong>Daten</strong>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Deine Daten liegen ausschließlich lokal auf diesem Gerät. Erstelle
            ein Backup oder übertrage sie auf ein anderes Gerät.
          </p>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-block" onClick={exportData}>⬇️ Backup</button>
            <button className="btn btn-block" onClick={() => fileRef.current?.click()}>⬆️ Import</button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          {status && <div className="faint" style={{ fontSize: 12 }}>{status}</div>}
        </div>

        <div className="card stack" style={{ gap: 8 }}>
          <strong>Wie Momentum funktioniert</strong>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Momentum ist eine kontinuierliche Skala statt eines harten Streaks.
            Ein Ruhetag schadet nie (Erholung ist Teil des Trainings). Bleibst
            du länger inaktiv, kühlt dein Momentum langsam ab — fällt aber nie
            unter {15}. So ist dein Comeback immer nur eine Einheit entfernt.
            Deine Streak überlebt nach der „Never miss twice"-Regel einen
            einzelnen Pausentag.
          </p>
        </div>

        <button
          className="btn btn-block"
          style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
          onClick={() => {
            if (confirm('Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.')) {
              resetAll()
            }
          }}
        >
          Alle Daten zurücksetzen
        </button>

        <p className="faint" style={{ fontSize: 11, textAlign: 'center' }}>
          Momentum · evidenzbasierter Sport-Tracker
        </p>
      </div>
    </div>
  )
}
