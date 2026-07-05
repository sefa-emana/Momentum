import { useState } from 'react'
import { Activity, Dumbbell, Flame, Shield, Shuffle, TrendingUp } from 'lucide-react'
import { useStore } from '../state/store'
import {
  MAX_WEEKLY_GOAL,
  MIN_WEEKLY_GOAL,
  DEFAULT_WEEKLY_GOAL,
  type TrainingFocus,
} from '../domain'
import { ICON_STROKE } from '../ui/icons'

const STEPS = 3

const FOCUS_OPTIONS: { id: TrainingFocus; label: string; Icon: typeof Dumbbell }[] = [
  { id: 'strength', label: 'Kraft', Icon: Dumbbell },
  { id: 'cardio', label: 'Cardio', Icon: Activity },
  { id: 'mixed', label: 'Gemischt', Icon: Shuffle },
]

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(DEFAULT_WEEKLY_GOAL)
  const [focus, setFocus] = useState<TrainingFocus>('mixed')

  const finish = () => completeOnboarding(name || 'Athlet', goal, focus)

  return (
    <div className="screen onboarding" style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column' }}>
      <div className="row-between" style={{ minHeight: 32 }}>
        <span />
        {step < STEPS - 1 && (
          <button className="btn-ghost onboarding-skip" onClick={finish}>
            Überspringen
          </button>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {step === 0 && (
          <div className="stack" style={{ textAlign: 'center', gap: 18 }}>
            <div style={{ display: 'inline-flex', justifyContent: 'center', color: 'var(--accent)' }}>
              <Flame size={64} strokeWidth={ICON_STROKE} aria-hidden />
            </div>
            <h1 style={{ fontSize: 34 }}>Momentum</h1>
            <p className="muted" style={{ fontSize: 16, maxWidth: 340, margin: '0 auto' }}>
              Echter Fortschritt, ehrlich gemessen. Keine Strafen.
            </p>
            <ul className="stack" style={{ listStyle: 'none', padding: 0, textAlign: 'left', maxWidth: 340, margin: '10px auto 0', gap: 14 }}>
              <li className="row">
                <Flame size={22} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)', flex: 'none' }} aria-hidden />
                <span><strong>Momentum</strong> hält dich in Bewegung — statt harter Streaks.</span>
              </li>
              <li className="row">
                <TrendingUp size={22} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)', flex: 'none' }} aria-hidden />
                <span><strong>Progression</strong> zeigt deine echten Steigerungen, Satz für Satz.</span>
              </li>
              <li className="row">
                <Shield size={22} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)', flex: 'none' }} aria-hidden />
                <span><strong>Vergebung</strong> fängt schlechte Tage ab — Pausen sind erlaubt.</span>
              </li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 8 }}>
              <h1 style={{ fontSize: 28 }}>Wer bist du?</h1>
              <p className="muted" style={{ margin: 0 }}>Damit wir dich richtig feiern können.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="ob-name">Dein Name</label>
              <input
                id="ob-name"
                className="input"
                placeholder="z. B. Sefa"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="ob-goal">Wochenziel</label>
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="hero-number tnum" style={{ fontSize: 54 }}>{goal}</div>
                <div className="muted" style={{ marginTop: 6 }}>Einheiten pro Woche</div>
                <input
                  id="ob-goal"
                  type="range"
                  min={MIN_WEEKLY_GOAL}
                  max={MAX_WEEKLY_GOAL}
                  value={goal}
                  aria-label="Wochenziel"
                  onChange={(e) => setGoal(Number(e.target.value))}
                  style={{ width: '100%', marginTop: 16, accentColor: 'var(--accent)' }}
                />
              </div>
              <p className="faint" style={{ fontSize: 12.5, margin: '10px 2px 0' }}>
                Spezifische, leicht fordernde Ziele wirken am besten. Du kannst es
                jederzeit anpassen.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 20 }}>
            <div className="stack" style={{ gap: 8 }}>
              <h1 style={{ fontSize: 28 }}>Wie trainierst du hauptsächlich?</h1>
              <p className="muted" style={{ margin: 0 }}>
                Damit richten wir dein Logging passend ein. Umstellen kannst du es
                jederzeit.
              </p>
            </div>
            <div className="onboarding-focus" role="group" aria-label="Trainingsart">
              {FOCUS_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  className="focus-tile"
                  data-active={focus === id}
                  aria-pressed={focus === id}
                  onClick={() => setFocus(id)}
                >
                  <Icon size={26} strokeWidth={ICON_STROKE} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <p className="faint" style={{ fontSize: 12.5, margin: '0 2px' }}>
              {focus === 'cardio'
                ? 'Wir loggen standardmäßig nach Dauer — schnell und leicht.'
                : 'Wir aktivieren den Satz-Modus, damit deine Steigerungen sichtbar werden.'}
            </p>
          </div>
        )}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === step ? 22 : 8,
                height: 8,
                borderRadius: 999,
                background: i === step ? 'var(--accent)' : 'var(--surface-3)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            if (step < STEPS - 1) setStep(step + 1)
            else finish()
          }}
        >
          {step < STEPS - 1 ? 'Weiter' : "Los geht's"}
        </button>
      </div>
    </div>
  )
}
