import { useState } from 'react'
import { useStore } from '../state/store'
import { MAX_WEEKLY_GOAL, MIN_WEEKLY_GOAL, DEFAULT_WEEKLY_GOAL } from '../domain'

const STEPS = 3

export function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState(DEFAULT_WEEKLY_GOAL)

  return (
    <div className="screen" style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {step === 0 && (
          <div className="stack" style={{ textAlign: 'center', gap: 18 }}>
            <div style={{ fontSize: 64 }}>🔥</div>
            <h1 style={{ fontSize: 34 }}>Momentum</h1>
            <p className="muted" style={{ fontSize: 16, maxWidth: 340, margin: '0 auto' }}>
              Dein evidenzbasierter Sport-Tracker. Sammle XP, halte deine Streak
              und baue Momentum auf — Tag für Tag.
            </p>
            <ul className="stack" style={{ listStyle: 'none', padding: 0, textAlign: 'left', maxWidth: 340, margin: '10px auto 0' }}>
              <li className="row"><span style={{ fontSize: 22 }}>⚡</span><span>XP & Level für jede Einheit</span></li>
              <li className="row"><span style={{ fontSize: 22 }}>🔥</span><span>Momentum, das dich in Bewegung hält</span></li>
              <li className="row"><span style={{ fontSize: 22 }}>🎯</span><span>Wochenziele & Erfolge</span></li>
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="stack" style={{ gap: 16 }}>
            <h1 style={{ fontSize: 28 }}>Wie heißt du?</h1>
            <p className="muted">Damit wir dich richtig feiern können.</p>
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
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 16 }}>
            <h1 style={{ fontSize: 28 }}>Dein Wochenziel</h1>
            <p className="muted">
              Spezifische, leicht fordernde Ziele wirken am besten. Du kannst es
              jederzeit anpassen.
            </p>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 54, fontWeight: 800 }}>{goal}</div>
              <div className="muted">Einheiten pro Woche</div>
              <input
                type="range"
                min={MIN_WEEKLY_GOAL}
                max={MAX_WEEKLY_GOAL}
                value={goal}
                aria-label="Wochenziel"
                onChange={(e) => setGoal(Number(e.target.value))}
                style={{ width: '100%', marginTop: 16, accentColor: 'var(--accent)' }}
              />
            </div>
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
                background: i === step ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            if (step < STEPS - 1) setStep(step + 1)
            else completeOnboarding(name || 'Athlet', goal)
          }}
        >
          {step < STEPS - 1 ? 'Weiter' : "Los geht's 🚀"}
        </button>
      </div>
    </div>
  )
}
