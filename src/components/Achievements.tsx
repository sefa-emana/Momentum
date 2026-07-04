import { useStore } from '../state/store'
import { useDerived } from '../ui/hooks'
import { ACHIEVEMENTS } from '../domain'

export function Achievements() {
  const unlocked = useStore((s) => s.unlocked)
  const d = useDerived()
  const unlockedIds = new Set(unlocked.map((u) => u.id))

  const total = ACHIEVEMENTS.length
  const count = unlockedIds.size

  return (
    <div className="screen">
      <h1 className="screen-title">Erfolge</h1>
      <p className="screen-sub">
        {count} von {total} freigeschaltet
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <strong>Fortschritt</strong>
          <span className="muted" style={{ fontSize: 13 }}>{Math.round((count / total) * 100)}%</span>
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${(count / total) * 100}%`, background: 'var(--accent-grad)' }} />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 12 }}>
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlockedIds.has(a.id)
          return (
            <div key={a.id} className="badge-tile" data-locked={!isUnlocked}>
              <span className="badge-icon" aria-hidden>{isUnlocked ? a.icon : '🔒'}</span>
              <strong style={{ fontSize: 14 }}>{a.title}</strong>
              <span className="muted" style={{ fontSize: 12 }}>{a.description}</span>
              <span className="pill" style={{ marginTop: 4, color: isUnlocked ? 'var(--success)' : 'var(--text-faint)' }}>
                {isUnlocked ? '✓ Erreicht' : `+${a.bonusXp} XP`}
              </span>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <strong>Nächstes Ziel</strong>
        <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 0 }}>
          {nextHint(d.currentStreak, d.totalWorkouts, d.level.level)}
        </p>
      </div>
    </div>
  )
}

function nextHint(streak: number, workouts: number, level: number): string {
  if (workouts === 0) return 'Logge deine erste Einheit für den ersten Erfolg. 🌱'
  if (streak < 7) return `Halte deine Streak — noch ${7 - streak} Tage bis "Woche der Konsistenz". 🔥`
  if (workouts < 10) return `Noch ${10 - workouts} Einheiten bis "Aufgewärmt".`
  if (level < 5) return `Sammle XP bis Level 5 für "Aufsteiger". ⭐`
  return 'Bleib dran — die großen Meilensteine warten. 🚀'
}
