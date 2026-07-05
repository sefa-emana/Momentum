import type { CSSProperties, ReactNode } from 'react'
import { Check, Lock, Medal, Sprout } from 'lucide-react'
import { useStore } from '../state/store'
import { useNow } from '../ui/hooks'
import {
  ACHIEVEMENTS,
  WORKOUT_TYPES,
  WORKOUT_TYPE_META,
  masteryFor,
  masteryRank,
  offeredQuests,
  weekKey,
  type MasteryInfo,
  type QuestDef,
  type WorkoutType,
} from '../domain'
import {
  ICON_STROKE,
  WORKOUT_TYPE_ICON,
  achievementIcon,
  questIcon,
} from '../ui/icons'
import { EmptyState } from '../ui/EmptyState'

export function Achievements() {
  const workouts = useStore((s) => s.workouts)
  const acceptedQuests = useStore((s) => s.acceptedQuests)
  const questsDone = useStore((s) => s.questsDone)
  const unlocked = useStore((s) => s.unlocked)
  const acceptQuest = useStore((s) => s.acceptQuest)
  const now = useNow()
  const wk = weekKey(now)

  const unlockedIds = new Set(unlocked.map((u) => u.id))
  const total = ACHIEVEMENTS.length
  const count = unlockedIds.size

  // --- Mastery: one row per trained type; untried ones become a gentle hint. --
  const trained = WORKOUT_TYPES.map((t) => ({ type: t, info: masteryFor(workouts, t) })).filter(
    (m) => m.info.totalSessions > 0,
  )
  const untried = WORKOUT_TYPES.filter((t) => masteryFor(workouts, t).totalSessions === 0)

  // --- Quests: strictly this ISO week's two offers (past quests never appear). -
  const offers = offeredQuests(wk)
  const weekWs = workouts.filter((w) => weekKey(w.date) === wk)
  const acceptedThisWeek = new Set(
    acceptedQuests.filter((q) => q.week === wk).map((q) => q.id),
  )
  const doneThisWeek = new Set(questsDone.filter((q) => q.week === wk).map((q) => q.id))

  const unlockedAch = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id))
  const lockedAch = ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.id))

  return (
    <div className="screen">
      <h1 className="screen-title">Erfolge</h1>
      <p className="screen-sub">
        {count} von {total} freigeschaltet
      </p>

      {/* ---- Mastery — competence per discipline (identity, not currency). ---- */}
      <section className="stack" style={{ gap: 12, marginBottom: 22 }}>
        <SectionTitle>Meisterschaft</SectionTitle>
        {trained.length === 0 ? (
          <EmptyState icon={<Medal size={40} strokeWidth={1.5} aria-hidden />}>
            Logge deine erste Einheit — jede Trainingsart baut ihre eigene
            Meisterschaft auf.
          </EmptyState>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {trained.map(({ type, info }) => (
              <MasteryRow key={type} type={type} info={info} />
            ))}
          </div>
        )}
        {untried.length > 0 && (
          <p className="faint" style={{ fontSize: 12.5, margin: '2px 2px 0' }}>
            Neue Disziplin ausprobieren:{' '}
            {untried.map((t) => WORKOUT_TYPE_META[t].label).join(' · ')}
          </p>
        )}
      </section>

      {/* ---- Quests — this week's opt-in mini-challenges. -------------------- */}
      <section className="stack" style={{ gap: 12, marginBottom: 22 }}>
        <SectionTitle>Quests der Woche</SectionTitle>
        <div className="stack" style={{ gap: 12 }}>
          {offers.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              progress={q.progress(weekWs, wk)}
              accepted={acceptedThisWeek.has(q.id)}
              done={doneThisWeek.has(q.id)}
              onAccept={() => acceptQuest(q.id)}
            />
          ))}
        </div>
      </section>

      {/* ---- Achievements — unlocked first, then long-term goals in sight. --- */}
      <section className="stack" style={{ gap: 12 }}>
        <SectionTitle>Freigeschaltet</SectionTitle>
        {unlockedAch.length === 0 ? (
          <EmptyState icon={<Sprout size={40} strokeWidth={1.5} aria-hidden />}>
            Noch keine — dein erstes Training schaltet den ersten Erfolg frei.
          </EmptyState>
        ) : (
          <div className="grid-2" style={{ gap: 12 }}>
            {unlockedAch.map((a) => (
              <AchievementTile key={a.id} id={a.id} title={a.title} description={a.description} bonusXp={a.bonusXp} unlocked />
            ))}
          </div>
        )}

        <SectionTitle style={{ marginTop: 10 }}>Noch offen</SectionTitle>
        <div className="grid-2" style={{ gap: 12 }}>
          {lockedAch.map((a) => (
            <AchievementTile key={a.id} id={a.id} title={a.title} description={a.description} bonusXp={a.bonusXp} unlocked={false} />
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionTitle({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <strong className="section-title" style={style}>
      {children}
    </strong>
  )
}

function MasteryRow({ type, info }: { type: WorkoutType; info: MasteryInfo }) {
  const Icon = WORKOUT_TYPE_ICON[type]
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="row-between">
        <span className="row" style={{ gap: 10 }}>
          <span className="badge-icon" aria-hidden>
            <Icon size={20} strokeWidth={ICON_STROKE} />
          </span>
          <span>
            <strong style={{ display: 'block' }}>{WORKOUT_TYPE_META[type].label}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {masteryRank(info.level)} · Level {info.level}
            </span>
          </span>
        </span>
        <span className="muted tnum" style={{ fontSize: 13 }}>
          {info.totalSessions} {info.totalSessions === 1 ? 'Einheit' : 'Einheiten'}
        </span>
      </div>
      <div className="bar">
        <div
          className="bar-fill"
          style={{ width: `${info.progress * 100}%`, background: 'var(--xp-grad)' }}
        />
      </div>
      <span className="faint" style={{ fontSize: 11.5 }}>
        {info.sessionsForNextLevel > 0
          ? `Noch ${info.sessionsForNextLevel - info.sessionsIntoLevel} bis Level ${info.level + 1}`
          : 'Höchste Meisterschaft erreicht'}
      </span>
    </div>
  )
}

function QuestCard({
  quest,
  progress,
  accepted,
  done,
  onAccept,
}: {
  quest: QuestDef
  progress: number
  accepted: boolean
  done: boolean
  onAccept: () => void
}) {
  const Icon = questIcon(quest.id)
  const pct = Math.min(1, quest.target === 0 ? 0 : progress / quest.target)
  const shown = Math.min(progress, quest.target)

  return (
    <div className="card stack" style={{ gap: 10 }} data-done={done || undefined}>
      <div className="row-between">
        <span className="row" style={{ gap: 10 }}>
          <span className="badge-icon" aria-hidden>
            <Icon size={20} strokeWidth={ICON_STROKE} />
          </span>
          <span>
            <strong style={{ display: 'block' }}>{quest.title}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>{quest.description}</span>
          </span>
        </span>
        {done && (
          <span
            className="pill"
            style={{ borderColor: 'var(--state-strong)', color: 'var(--state-strong)', flex: 'none' }}
          >
            <Check size={14} strokeWidth={ICON_STROKE} aria-hidden />
            +{quest.bonusXp} XP
          </span>
        )}
      </div>

      {done ? (
        <span className="faint" style={{ fontSize: 12 }}>Geschafft — Bonus gutgeschrieben.</span>
      ) : accepted ? (
        <>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${pct * 100}%`, background: 'var(--xp-grad)' }}
            />
          </div>
          <div className="row-between">
            <span className="faint" style={{ fontSize: 11.5 }}>Angenommen</span>
            <span className="muted tnum" style={{ fontSize: 12.5 }}>
              {shown} / {quest.target}
            </span>
          </div>
        </>
      ) : (
        <div className="row-between" style={{ gap: 10 }}>
          <span className="faint" style={{ fontSize: 12 }}>+{quest.bonusXp} XP · optional</span>
          <button className="chip" data-active onClick={onAccept}>
            Annehmen
          </button>
        </div>
      )}
    </div>
  )
}

function AchievementTile({
  id,
  title,
  description,
  bonusXp,
  unlocked,
}: {
  id: string
  title: string
  description: string
  bonusXp: number
  unlocked: boolean
}) {
  const Icon = achievementIcon(id)
  return (
    <div className="badge-tile" data-locked={!unlocked}>
      <span className="badge-icon" aria-hidden>
        {unlocked ? (
          <Icon size={22} strokeWidth={ICON_STROKE} />
        ) : (
          <Lock size={20} strokeWidth={ICON_STROKE} />
        )}
      </span>
      <strong style={{ fontSize: 14 }}>{title}</strong>
      <span className="muted" style={{ fontSize: 12 }}>{description}</span>
      <span
        className="pill"
        style={{ marginTop: 4, color: unlocked ? 'var(--state-strong)' : 'var(--text-faint)' }}
      >
        {unlocked ? '✓ Erreicht' : `+${bonusXp} XP`}
      </span>
    </div>
  )
}
