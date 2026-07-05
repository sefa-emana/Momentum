import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Activity,
  ArrowUpCircle,
  Dumbbell,
  Lightbulb,
  Minus,
  TrendingUp,
} from 'lucide-react'
import { useStore } from '../state/store'
import { useNow } from '../ui/hooks'
import {
  cardioProgressionHint,
  exercisePRs,
  exerciseProgressList,
  progressionHint,
  recentExerciseSessions,
  resolveExercise,
  stallSuggestion,
  weeklyBestE1RM,
  weeklyCardioMinutes,
  weeklySetsByPattern,
  weeklyVolumeLoad,
  type ExerciseProgress,
  type StallState,
} from '../domain'
import { ICON_STROKE } from '../ui/icons'
import { Sparkline } from '../ui/Sparkline'
import { TrendChart } from '../ui/TrendChart'
import { BarsChart } from '../ui/BarsChart'
import { BottomSheet } from '../ui/BottomSheet'
import { EmptyState } from '../ui/EmptyState'
import { PATTERN_LABEL, PR_KIND_LABEL } from '../ui/exerciseMeta'

const fmtKg = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 })
const fmtInt = (v: number) => Math.round(v).toLocaleString('de-DE')
const fmtDate = (iso: string) => format(new Date(iso), 'd. MMM yyyy', { locale: de })

/** Amber (never red) status label for watched/stalled exercises. */
const STALL_LABEL: Record<Exclude<StallState, 'progressing'>, string> = {
  watch: 'Beobachten',
  stalled: 'Stagniert',
}

export function Progress({ onLog }: { onLog?: () => void }) {
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const exercises = useMemo(
    () => exerciseProgressList(workouts, customExercises, now),
    [workouts, customExercises, now],
  )
  const patterns = useMemo(
    () => weeklySetsByPattern(workouts, now, customExercises),
    [workouts, now, customExercises],
  )
  const hasCardio = useMemo(() => workouts.some((w) => w.type === 'cardio'), [workouts])

  const nothing = exercises.length === 0 && patterns.length === 0 && !hasCardio

  return (
    <div className="screen">
      <h1 className="screen-title">Fortschritt</h1>
      <p className="screen-sub">Echter Fortschritt pro Übung — sichtbar gemacht.</p>

      {nothing ? (
        <EmptyState
          icon={<TrendingUp size={40} strokeWidth={1.5} aria-hidden />}
          action={
            onLog ? (
              <button className="btn btn-primary" onClick={onLog}>
                <Dumbbell size={18} strokeWidth={ICON_STROKE} aria-hidden />
                Kraft im Satz-Modus loggen
              </button>
            ) : undefined
          }
        >
          Logge eine Kraft-Einheit im Satz-Modus — dann zeigen wir dir hier
          deinen Verlauf, deine Bestwerte und die nächste Steigerung.
        </EmptyState>
      ) : (
        <div className="stack" style={{ gap: 20 }}>
          {patterns.length > 0 && <PatternBalance />}

          <section className="stack" style={{ gap: 12 }}>
            <SectionTitle>Übungen</SectionTitle>
            {exercises.length === 0 ? (
              <div className="card">
                <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                  Noch keine Übung mit Sätzen geloggt. Nutze den Satz-Modus beim
                  Kraft-Training, um e1RM und Volumen zu verfolgen.
                </p>
              </div>
            ) : (
              <div className="progress-list">
                {exercises.map((ex) => (
                  <ExerciseRow key={ex.exerciseId} ex={ex} onOpen={() => setSelectedId(ex.exerciseId)} />
                ))}
              </div>
            )}
          </section>

          {hasCardio && <CardioSection />}
        </div>
      )}

      {selectedId && (
        <ExerciseDetail exerciseId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Übungs-Liste
// ---------------------------------------------------------------------------

function ExerciseRow({ ex, onOpen }: { ex: ExerciseProgress; onOpen: () => void }) {
  const spark = ex.external
    ? ex.weeklyE1RM.map((w) => w.e1rm)
    : ex.weeklyVolume.map((w) => w.value)
  const badge = ex.stall === 'progressing' ? null : STALL_LABEL[ex.stall]

  return (
    <button className="progress-row" onClick={onOpen} aria-label={`${ex.name} — Details`}>
      <span className="badge-icon" aria-hidden>
        <Dumbbell size={20} strokeWidth={ICON_STROKE} />
      </span>
      <span className="progress-row-main">
        <span className="row" style={{ gap: 8 }}>
          <strong className="progress-row-name">{ex.name}</strong>
          {badge && (
            <span className="stall-badge">
              <span className="stall-dot" aria-hidden />
              {badge}
            </span>
          )}
        </span>
        <span className="faint tnum" style={{ fontSize: 12 }}>
          {ex.external && ex.bestE1RM !== null
            ? `${fmtKg(ex.bestE1RM)} kg e1RM`
            : `${fmtInt(ex.bestVolume)} kg Volumen`}
        </span>
      </span>
      {spark.length >= 2 && (
        <span className="progress-row-spark" aria-hidden>
          <Sparkline data={spark} width={72} height={28} label={`${ex.name} Trend`} />
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Muster-Balance
// ---------------------------------------------------------------------------

function PatternBalance() {
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)
  const now = useNow()
  const patterns = useMemo(
    () => weeklySetsByPattern(workouts, now, customExercises),
    [workouts, now, customExercises],
  )
  const max = Math.max(1, ...patterns.map((p) => p.sets))

  return (
    <section className="stack" style={{ gap: 12 }}>
      <SectionTitle>Muster-Balance · diese Woche</SectionTitle>
      <div className="card stack" style={{ gap: 12 }}>
        {patterns.map((p) => (
          <div key={p.pattern} className="stack" style={{ gap: 5 }}>
            <div className="row-between">
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{PATTERN_LABEL[p.pattern]}</span>
              <span className="muted tnum" style={{ fontSize: 12.5 }}>
                {p.sets.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Sätze · {p.band}
              </span>
            </div>
            <div className="pattern-track">
              <div
                className="pattern-bar"
                data-band={p.band === 'produktive Zone' ? 'good' : undefined}
                style={{ width: `${(p.sets / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <p className="faint" style={{ fontSize: 11.5, margin: 0 }}>
          Harte Sätze pro Bewegungsmuster (Nebenmuskeln zählen anteilig). Die
          Bänder sind Richtwerte, keine Vorschrift.
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Cardio-Section
// ---------------------------------------------------------------------------

function CardioSection() {
  const workouts = useStore((s) => s.workouts)
  const now = useNow()
  const weekly = useMemo(() => weeklyCardioMinutes(workouts, now, 8), [workouts, now])
  const hint = useMemo(() => cardioProgressionHint(workouts, now), [workouts, now])
  const series = weekly.map((w) => w.value)

  return (
    <section className="stack" style={{ gap: 12 }}>
      <SectionTitle>Cardio</SectionTitle>
      <div className="card stack" style={{ gap: 14 }}>
        <div className="row-between">
          <strong className="row" style={{ gap: 8 }}>
            <Activity size={18} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} aria-hidden />
            Dauer je Woche
          </strong>
          <span className="faint" style={{ fontSize: 12 }}>letzte 8 Wochen</span>
        </div>
        <Sparkline data={series} height={38} label="Cardio-Dauer je Woche" />
        <div className="progress-hint">
          <Lightbulb size={16} strokeWidth={ICON_STROKE} className="progress-hint-icon" aria-hidden />
          <div>
            <div className="progress-hint-title">Nächster Schritt</div>
            <div className="progress-hint-reason">{hint.reason}</div>
            {hint.polarizationNote && (
              <div className="progress-hint-reason" style={{ marginTop: 4 }}>
                {hint.polarizationNote}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Übungs-Detail (sheet)
// ---------------------------------------------------------------------------

function ExerciseDetail({ exerciseId, onClose }: { exerciseId: string; onClose: () => void }) {
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)

  const def = resolveExercise(exerciseId, customExercises)
  const external = def?.loadType === 'external'

  const e1rmWeekly = useMemo(
    () => weeklyBestE1RM(workouts, exerciseId, customExercises),
    [workouts, exerciseId, customExercises],
  )
  const volumeWeekly = useMemo(
    () => weeklyVolumeLoad(workouts, exerciseId, customExercises),
    [workouts, exerciseId, customExercises],
  )
  const prs = useMemo(
    () => exercisePRs(workouts, exerciseId, customExercises),
    [workouts, exerciseId, customExercises],
  )
  const hint = useMemo(
    () => progressionHint(workouts, exerciseId, customExercises),
    [workouts, exerciseId, customExercises],
  )
  const suggestion = useMemo(
    () => stallSuggestion(workouts, exerciseId, customExercises),
    [workouts, exerciseId, customExercises],
  )
  const sessions = useMemo(
    () => recentExerciseSessions(workouts, exerciseId, customExercises, 5),
    [workouts, exerciseId, customExercises],
  )

  const trendData = external ? e1rmWeekly.map((w) => ({ week: w.week, value: w.e1rm })) : volumeWeekly
  const trendEnough = trendData.length >= 2

  const prItems: { kind: keyof typeof PR_KIND_LABEL; value: string; date: string }[] = []
  if (prs.weight) prItems.push({ kind: 'weight', value: `${fmtKg(prs.weight.value)} kg`, date: prs.weight.date })
  if (prs.reps) prItems.push({ kind: 'rep', value: `${prs.reps.value}${prs.reps.weightKg > 0 ? ` @ ${fmtKg(prs.reps.weightKg)} kg` : ''}`, date: prs.reps.date })
  if (prs.e1rm) prItems.push({ kind: 'e1rm', value: `${fmtKg(prs.e1rm.value)} kg`, date: prs.e1rm.date })
  if (prs.volume) prItems.push({ kind: 'volume', value: `${fmtInt(prs.volume.value)} kg`, date: prs.volume.date })

  return (
    <BottomSheet
      onClose={onClose}
      ariaLabel={`${def?.name ?? 'Übung'} — Fortschritt`}
      data-testid="exercise-detail"
      header={
        <div className="row" style={{ gap: 10, paddingBottom: 8 }}>
          <span className="badge-icon" aria-hidden>
            <Dumbbell size={20} strokeWidth={ICON_STROKE} />
          </span>
          <strong style={{ fontSize: 17 }}>{def?.name ?? exerciseId}</strong>
        </div>
      }
    >
      <div className="stack" style={{ gap: 18 }}>
        {/* Trend */}
        <div className="stack" style={{ gap: 8 }}>
          <div className="row-between">
            <strong style={{ fontSize: 14 }}>{external ? 'e1RM-Trend' : 'Volumen-Trend'}</strong>
            <span className="faint" style={{ fontSize: 12 }}>wöchentlicher Bestwert</span>
          </div>
          {trendEnough ? (
            <TrendChart
              data={trendData}
              label={`${external ? 'e1RM' : 'Volumen'}-Trend für ${def?.name ?? exerciseId}`}
              formatValue={external ? (v) => `${fmtKg(v)}` : fmtInt}
            />
          ) : (
            <div className="empty-chart faint">Noch zu wenig Daten — logge 2–3 Einheiten.</div>
          )}
        </div>

        {/* Volume bars (external only — bodyweight already uses volume as trend) */}
        {external && volumeWeekly.length >= 1 && (
          <div className="stack" style={{ gap: 8 }}>
            <div className="row-between">
              <strong style={{ fontSize: 14 }}>Volumen je Woche</strong>
              <span className="faint" style={{ fontSize: 12 }}>Last = Gewicht × Wdh.</span>
            </div>
            <BarsChart
              data={volumeWeekly}
              label={`Wöchentliches Volumen für ${def?.name ?? exerciseId}`}
              formatValue={fmtInt}
            />
          </div>
        )}

        {/* Progression hint */}
        {hint && (
          <div className="progress-hint" data-tone={hint.action === 'hold' ? 'hold' : undefined}>
            {hint.action === 'addWeight' ? (
              <ArrowUpCircle size={16} strokeWidth={ICON_STROKE} className="progress-hint-icon" aria-hidden />
            ) : hint.action === 'hold' ? (
              <Minus size={16} strokeWidth={ICON_STROKE} className="progress-hint-icon" aria-hidden />
            ) : (
              <TrendingUp size={16} strokeWidth={ICON_STROKE} className="progress-hint-icon" aria-hidden />
            )}
            <div>
              <div className="progress-hint-title">
                {hint.action === 'addWeight'
                  ? `Bereit für +${fmtKg(hint.amountKg)} kg`
                  : hint.action === 'addReps'
                    ? 'Mehr Wiederholungen'
                    : 'Gewicht halten'}
              </div>
              <div className="progress-hint-reason">{hint.reason}</div>
            </div>
          </div>
        )}

        {/* Stall de-stall suggestion */}
        {suggestion && (
          <div className="card stall-card stack" style={{ gap: 6 }}>
            <strong style={{ fontSize: 14 }}>
              {suggestion.kind === 'deload'
                ? 'Mini-Deload'
                : suggestion.kind === 'repRangeSwitch'
                  ? 'Wiederholungsbereich wechseln'
                  : 'Variation probieren'}
            </strong>
            <div className="muted" style={{ fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: 'var(--state-steady)' }}>Warum? </span>
              {suggestion.reason}
            </div>
          </div>
        )}

        {/* Bestwerte */}
        {prItems.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <strong style={{ fontSize: 14 }}>Bestwerte</strong>
            <div className="card pr-grid">
              {prItems.map((pr) => (
                <div key={pr.kind} className="pr-cell">
                  <span className="pr-value tnum">{pr.value}</span>
                  <span className="pr-label">{PR_KIND_LABEL[pr.kind]}</span>
                  <span className="faint tnum" style={{ fontSize: 11 }}>{fmtDate(pr.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verlauf: letzte Einheiten */}
        {sessions.length > 0 && (
          <div className="stack" style={{ gap: 8 }}>
            <strong style={{ fontSize: 14 }}>Letzte Einheiten</strong>
            <div className="card stack" style={{ gap: 0 }}>
              {sessions.map((s, i) => (
                <div
                  key={`${s.date}-${i}`}
                  className="row-between session-row"
                  style={i > 0 ? { borderTop: '1px solid var(--hairline)' } : undefined}
                >
                  <span className="tnum" style={{ fontSize: 13 }}>{fmtDate(s.date)}</span>
                  <span className="faint tnum" style={{ fontSize: 12.5 }}>
                    {s.workingSets} {s.workingSets === 1 ? 'Satz' : 'Sätze'} ·{' '}
                    {s.volume > 0 ? `${fmtInt(s.volume)} kg` : '—'}
                    {s.e1rm !== null && ` · ${fmtKg(s.e1rm)} kg e1RM`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <strong className="section-title">{children}</strong>
}
