import { useState, type ReactNode } from 'react'
import {
  Check,
  Dumbbell,
  Flame,
  Heart,
  Play,
  Shield,
  Shuffle,
  Snowflake,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useStore } from '../state/store'
import { useDerived, useNow } from '../ui/hooks'
import { MomentumRing } from './MomentumRing'
import { MiniBarChart } from './MiniBarChart'
import {
  TIER_META,
  WHO_WEEKLY_POINTS_TARGET,
  WHO_WEEKLY_STRENGTH_TARGET,
  almostCompleteQuest,
} from '../domain'
import { ICON_STROKE } from '../ui/icons'
import { Ticker } from '../ui/Ticker'
import { Sparkline } from '../ui/Sparkline'
import { WeekStrip } from '../ui/WeekStrip'

const GOAL_NUDGE_KEY = 'momentum-goalnudge-dismissed'

function readGoalDismiss(): string | null {
  try {
    return localStorage.getItem(GOAL_NUDGE_KEY)
  } catch {
    return null
  }
}
function writeGoalDismiss(week: string): void {
  try {
    localStorage.setItem(GOAL_NUDGE_KEY, week)
  } catch {
    /* ignore */
  }
}

export function Dashboard({ onLog }: { onLog: () => void }) {
  const name = useStore((s) => s.settings.name)
  const setWeeklyGoal = useStore((s) => s.setWeeklyGoal)
  const endPause = useStore((s) => s.endPause)
  const workouts = useStore((s) => s.workouts)
  const acceptedQuests = useStore((s) => s.acceptedQuests)
  const questsDone = useStore((s) => s.questsDone)
  const now = useNow()
  const d = useDerived()
  const almostQuest = almostCompleteQuest(acceptedQuests, questsDone, workouts, now)
  const tierMeta = TIER_META[d.momentumTier]
  const greeting = getGreeting()

  const [dismissedWeek, setDismissedWeek] = useState<string | null>(() => readGoalDismiss())
  const goalDismissed = dismissedWeek === d.week.weekKey

  // Nudge system — at most ONE, priority: overreach → monotony → adaptive goal
  // → quest-almost-done (lowest, purely encouraging).
  type Nudge = 'overreach' | 'monotony' | 'goal' | 'quest'
  let nudge: Nudge | null = null
  if (d.overreach === 'elevated') nudge = 'overreach'
  else if (d.monotony === 'samey') nudge = 'monotony'
  else if (d.goalSuggestion.reason !== 'keep' && !goalDismissed) nudge = 'goal'
  else if (almostQuest) nudge = 'quest'

  const applyGoal = () => setWeeklyGoal(d.goalSuggestion.suggestion)
  const dismissGoal = () => {
    writeGoalDismiss(d.week.weekKey)
    setDismissedWeek(d.week.weekKey)
  }

  const whoPct = Math.min(1, d.weeklyWhoPoints / WHO_WEEKLY_POINTS_TARGET)
  const whoMet = d.weeklyWhoPoints >= WHO_WEEKLY_POINTS_TARGET

  return (
    <div className="screen">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>{greeting},</div>
          <h1 className="screen-title">{name || 'Athlet'}</h1>
        </div>
        <div className="pill" aria-label={`Level ${d.level.level}`}>
          <Star size={16} strokeWidth={ICON_STROKE} aria-hidden />
          Level <Ticker value={d.level.level} />
        </div>
      </div>

      <div className="stack">
        {/* Momentum centrepiece */}
        <div className="card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span
            className="shield-badge"
            style={{ position: 'absolute', top: 14, right: 14 }}
            title="Schutzschilde: fangen verpasste Tage automatisch ab"
            aria-label={`${d.shieldsRemaining} Schutzschilde — fangen verpasste Tage ab`}
          >
            <Shield size={14} strokeWidth={ICON_STROKE} aria-hidden />
            {d.shieldsRemaining}
          </span>

          <MomentumRing momentum={d.momentum} />

          {d.paused ? (
            <div className="stack" style={{ gap: 10, width: '100%' }}>
              <div
                className="row"
                style={{
                  gap: 10,
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  background: 'color-mix(in srgb, var(--state-rest) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--state-rest) 30%, transparent)',
                }}
              >
                <Snowflake size={20} strokeWidth={ICON_STROKE} style={{ color: 'var(--state-rest)', flex: 'none' }} aria-hidden />
                <span style={{ fontSize: 13.5 }}>Pause aktiv — dein Momentum ist eingefroren.</span>
              </div>
              <button className="btn btn-block" onClick={endPause}>
                <Play size={18} strokeWidth={ICON_STROKE} aria-hidden />
                Pause beenden
              </button>
            </div>
          ) : (
            <>
              <p className="muted" style={{ textAlign: 'center', margin: 0, fontSize: 14 }}>
                {d.trainedToday ? 'Stark! Heute schon trainiert.' : tierMeta.message}
              </p>
              {!d.trainedToday && (
                <button className="btn btn-primary btn-block" onClick={onLog}>
                  <Zap size={18} strokeWidth={ICON_STROKE} aria-hidden />
                  Jetzt Training loggen
                </button>
              )}
            </>
          )}
        </div>

        {/* Level / XP progress */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <strong>Level {d.level.level}</strong>
            <span className="muted tnum" style={{ fontSize: 13 }}>
              <Ticker value={d.level.xpIntoLevel} /> / {d.level.xpForNextLevel.toLocaleString('de-DE')} XP
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

        {/* One contextual nudge — calm, never alarming. */}
        {nudge === 'overreach' && (
          <NudgeCard icon={<TrendingUp size={20} strokeWidth={ICON_STROKE} aria-hidden />} title="Große Woche">
            Du hast diese Woche deutlich mehr trainiert als sonst — stark! Steigere
            dich trotzdem schrittweise, dein Körper dankt es dir.
          </NudgeCard>
        )}
        {nudge === 'monotony' && (
          <NudgeCard icon={<Shuffle size={20} strokeWidth={ICON_STROKE} aria-hidden />} title="Zeit für Abwechslung">
            Deine Einheiten ähneln sich zuletzt stark. Ein leichterer Tag oder eine
            neue Trainingsart hält dich frisch.
          </NudgeCard>
        )}
        {nudge === 'quest' && almostQuest && (
          <NudgeCard icon={<Target size={20} strokeWidth={ICON_STROKE} aria-hidden />} title="Quest fast geschafft">
            {`Nur noch eine passende Einheit für „${almostQuest.title}" — du hast es fast.`}
          </NudgeCard>
        )}
        {nudge === 'goal' && (
          <NudgeCard icon={<Sparkles size={20} strokeWidth={ICON_STROKE} aria-hidden />} title="Neues Wochenziel?">
            <div style={{ marginBottom: 12 }}>
              {d.goalSuggestion.reason === 'raise'
                ? `Du triffst dein Ziel zuverlässig — wie wär's mit ${d.goalSuggestion.suggestion} Einheiten/Woche?`
                : `Zuletzt lief weniger — ${d.goalSuggestion.suggestion} Einheiten/Woche halten dich im Flow.`}
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyGoal}>
                Übernehmen
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={dismissGoal}>
                Behalten
              </button>
            </div>
          </NudgeCard>
        )}

        {/* Diese Woche — the health anchor. */}
        <div className="card stack" style={{ gap: 14 }}>
          <div className="row-between">
            <strong className="row" style={{ gap: 8 }}>
              <Target size={18} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
              Diese Woche
            </strong>
            <span className="muted tnum" style={{ fontSize: 13 }}>
              {d.week.completed} / {d.week.target}
            </span>
          </div>

          <WeekStrip days={d.weekStrip} />

          <div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="row" style={{ gap: 6, fontSize: 13.5, fontWeight: 600 }}>
                <Heart size={15} strokeWidth={ICON_STROKE} style={{ color: 'var(--state-rest)' }} aria-hidden />
                WHO-Aktivitätspunkte
              </span>
              <span className="muted tnum" style={{ fontSize: 13 }}>
                <Ticker value={d.weeklyWhoPoints} /> / {WHO_WEEKLY_POINTS_TARGET}
              </span>
            </div>
            <div className="bar">
              <div
                className="bar-fill"
                style={{
                  width: `${whoPct * 100}%`,
                  background: whoMet ? 'var(--state-strong)' : 'var(--xp-grad)',
                }}
              />
            </div>
            <div className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>
              moderat 1 Pkt/min · intensiv 2 Pkt/min
            </div>
          </div>

          <div className="row-between">
            <span className="row" style={{ gap: 6, fontSize: 13.5, fontWeight: 600 }}>
              <Dumbbell size={15} strokeWidth={ICON_STROKE} style={{ color: 'var(--state-rest)' }} aria-hidden />
              Kraft (2× / Woche)
            </span>
            <span
              className="pip-row"
              aria-label={`${Math.min(d.strengthThisWeek, WHO_WEEKLY_STRENGTH_TARGET)} von ${WHO_WEEKLY_STRENGTH_TARGET} Krafteinheiten`}
            >
              {Array.from({ length: WHO_WEEKLY_STRENGTH_TARGET }, (_, i) => (
                <span key={i} className="pip" data-filled={i < d.strengthThisWeek} />
              ))}
            </span>
          </div>
        </div>

        {/* Fortschritt — beat your own last week (relative, never raw AU). */}
        <div className="card stack" style={{ gap: 12 }}>
          <div className="row-between">
            <strong className="row" style={{ gap: 8 }}>
              <TrendingUp size={18} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
              Fortschritt
            </strong>
          </div>
          <Sparkline data={d.load14} label="Trainingslast der letzten 14 Tage" height={36} />
          <ProgressLine thisWeek={d.loadTrend.thisWeek} lastWeek={d.loadTrend.lastWeek} />
        </div>

        {/* Stat tiles */}
        <div className="grid-2">
          <div className="stat">
            <div className="stat-value" data-testid="stat-streak">
              <Flame size={20} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
              <Ticker className="tnum" value={d.currentStreak} />
            </div>
            <div className="stat-label">Tage-Streak {d.currentStreak > 0 ? '(never miss twice)' : ''}</div>
          </div>
          <div className="stat">
            <div className="stat-value" data-testid="stat-total-workouts">
              <Dumbbell size={20} strokeWidth={ICON_STROKE} style={{ color: 'var(--text-dim)' }} aria-hidden />
              <Ticker className="tnum" value={d.totalWorkouts} />
            </div>
            <div className="stat-label">Einheiten gesamt</div>
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

function NudgeCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="card nudge row" style={{ gap: 12, alignItems: 'flex-start' }}>
      <span className="nudge-icon">{icon}</span>
      <div style={{ flex: 1 }}>
        <strong style={{ display: 'block', marginBottom: 4 }}>{title}</strong>
        <div className="muted" style={{ fontSize: 13.5 }}>{children}</div>
      </div>
    </div>
  )
}

function ProgressLine({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  if (lastWeek <= 0) {
    return (
      <div className="faint" style={{ fontSize: 13 }}>
        Baseline entsteht — logge weiter, dann vergleichen wir mit deiner letzten Woche.
      </div>
    )
  }

  const pct = Math.round((thisWeek / lastWeek - 1) * 100)
  const beaten = thisWeek > lastWeek

  if (beaten) {
    return (
      <div className="row" style={{ gap: 8, color: 'var(--state-strong)', fontWeight: 700, fontSize: 14 }}>
        <Check size={16} strokeWidth={ICON_STROKE} aria-hidden />
        +{pct} % vs. letzte Woche
      </div>
    )
  }

  const ratio = Math.min(1, thisWeek / lastWeek)
  const remaining = Math.max(0, Math.round((1 - ratio) * 100))
  return (
    <div>
      <div className="row-between" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Schlag deine letzte Woche</span>
        <span className="muted tnum" style={{ fontSize: 13 }}>{Math.round(ratio * 100)} %</span>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${ratio * 100}%`, background: 'var(--accent-grad)' }} />
      </div>
      <div className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>
        Noch {remaining} % bis zum Niveau der letzten Woche.
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
