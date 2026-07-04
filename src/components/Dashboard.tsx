import { Flame, Dumbbell, Star, Target, Zap } from 'lucide-react'
import { useStore } from '../state/store'
import { useDerived } from '../ui/hooks'
import { MomentumRing } from './MomentumRing'
import { MiniBarChart } from './MiniBarChart'
import { TIER_META } from '../domain'
import { ICON_STROKE } from '../ui/icons'

export function Dashboard({ onLog }: { onLog: () => void }) {
  const name = useStore((s) => s.settings.name)
  const d = useDerived()
  const tierMeta = TIER_META[d.momentumTier]

  const greeting = getGreeting()

  return (
    <div className="screen">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>{greeting},</div>
          <h1 className="screen-title">{name || 'Athlet'}</h1>
        </div>
        <div className="pill" aria-label={`Level ${d.level.level}`}>
          <Star size={16} strokeWidth={ICON_STROKE} aria-hidden />
          Level {d.level.level}
        </div>
      </div>

      <div className="stack">
        {/* Momentum centrepiece */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <MomentumRing momentum={d.momentum} />
          <p className="muted" style={{ textAlign: 'center', margin: 0, fontSize: 14 }}>
            {d.trainedToday ? 'Stark! Heute schon trainiert.' : tierMeta.message}
          </p>
          {!d.trainedToday && (
            <button className="btn btn-primary btn-block" onClick={onLog}>
              <Zap size={18} strokeWidth={ICON_STROKE} aria-hidden />
              Jetzt Training loggen
            </button>
          )}
        </div>

        {/* Level / XP progress */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <strong>Level {d.level.level}</strong>
            <span className="muted tnum" style={{ fontSize: 13 }}>
              {d.level.xpIntoLevel} / {d.level.xpForNextLevel} XP
            </span>
          </div>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${d.level.progress * 100}%`, background: 'var(--xp-grad)' }}
            />
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            {d.totalXp.toLocaleString('de-DE')} XP gesamt · noch{' '}
            {(d.level.xpForNextLevel - d.level.xpIntoLevel).toLocaleString('de-DE')} bis Level{' '}
            {d.level.level + 1}
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid-2">
          <div className="stat">
            <div className="stat-value" data-testid="stat-streak">
              <Flame size={20} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
              <span className="tnum">{d.currentStreak}</span>
            </div>
            <div className="stat-label">Tage-Streak {d.currentStreak > 0 ? '(never miss twice)' : ''}</div>
          </div>
          <div className="stat">
            <div className="stat-value" data-testid="stat-total-workouts">
              <Dumbbell size={20} strokeWidth={ICON_STROKE} style={{ color: 'var(--text-dim)' }} aria-hidden />
              <span className="tnum">{d.totalWorkouts}</span>
            </div>
            <div className="stat-label">Einheiten gesamt</div>
          </div>
        </div>

        {/* Weekly goal */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <strong className="row" style={{ gap: 8 }}>
              <Target size={18} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
              Wochenziel
            </strong>
            <span className="muted tnum" style={{ fontSize: 13 }}>
              {d.week.completed} / {d.week.target}
            </span>
          </div>
          <div className="bar">
            <div
              className="bar-fill"
              style={{
                width: `${d.week.ratio * 100}%`,
                background: d.week.met ? 'var(--state-strong)' : 'var(--accent-grad)',
              }}
            />
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            {d.week.met
              ? 'Wochenziel erreicht — stark!'
              : `Noch ${d.week.target - d.week.completed} Einheit${
                  d.week.target - d.week.completed === 1 ? '' : 'en'
                } bis zum Ziel.`}
          </div>
        </div>

        {/* Activity chart */}
        {d.totalWorkouts > 0 && (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 6 }}>
              <strong>Aktivität</strong>
              <span className="faint" style={{ fontSize: 12 }}>letzte 14 Tage</span>
            </div>
            <MiniBarChart data={d.series} />
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Guten Tag'
  if (h < 22) return 'Guten Abend'
  return 'Gute Nacht'
}
