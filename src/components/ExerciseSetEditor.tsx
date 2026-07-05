import { useRef, useState } from 'react'
import { Check, Minus, Plus, Target, Trash2, X } from 'lucide-react'
import {
  DEFAULT_BAR_KG,
  formatPerSide,
  platesPerSide,
  type ExerciseDef,
  type ProgressionHint,
} from '../domain'
import { ICON_STROKE } from '../ui/icons'
import type { DraftExercise, DraftSet } from './setDraft'
import { blankSet, duplicateLastSet } from './setDraft'

type ActiveCell = { setId: string; field: 'weight' | 'reps' } | null

export function ExerciseSetEditor({
  draft,
  def,
  hint,
  onChange,
  onRemove,
  onSetConfirmed,
}: {
  draft: DraftExercise
  def: ExerciseDef | undefined
  hint: ProgressionHint | null
  onChange: (d: DraftExercise) => void
  onRemove: () => void
  onSetConfirmed?: (def: ExerciseDef | undefined) => void
}) {
  const [active, setActive] = useState<ActiveCell>(null)
  const [barKg, setBarKg] = useState(DEFAULT_BAR_KG)
  const longPress = useRef<number | null>(null)

  const showWeight = !def || def.loadType === 'external'
  const inc = def?.incrementKg && def.incrementKg > 0 ? def.incrementKg : 2.5
  const isBarbell = def?.equipment === 'barbell'
  const name = def?.name ?? draft.exerciseId

  const patchSet = (id: string, patch: Partial<DraftSet>) => {
    onChange({
      ...draft,
      sets: draft.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const confirmSet = (s: DraftSet) => {
    patchSet(s.id, { confirmed: true, ghost: false })
    setActive(null)
    onSetConfirmed?.(def)
  }

  const addSet = () => {
    onChange({ ...draft, sets: [...draft.sets, duplicateLastSet(draft.sets, def)] })
  }

  const removeSet = (id: string) => {
    const rest = draft.sets.filter((s) => s.id !== id)
    if (active?.setId === id) setActive(null)
    // Never leave an exercise with zero sets — keep one blank.
    onChange({ ...draft, sets: rest.length > 0 ? rest : [blankSet(def)] })
  }

  const step = (s: DraftSet, field: 'weight' | 'reps', dir: 1 | -1) => {
    if (field === 'weight') {
      const cur = s.weightKg ?? 0
      const next = Math.max(0, Math.round((cur + dir * inc) * 100) / 100)
      patchSet(s.id, { weightKg: next, ghost: false })
    } else {
      const cur = s.reps ?? 0
      patchSet(s.id, { reps: Math.max(0, cur + dir), ghost: false })
    }
  }

  const fmt = (v: number | undefined) =>
    v === undefined ? '–' : v.toLocaleString('de-DE', { maximumFractionDigits: 2 })

  const showHint = hint && (hint.action === 'addWeight' || hint.action === 'addReps')

  return (
    <div className="exercise-block">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <strong style={{ fontSize: 15 }}>{name}</strong>
        <button
          type="button"
          className="btn-ghost"
          aria-label={`${name} entfernen`}
          onClick={onRemove}
          style={{ display: 'inline-flex', padding: 4, color: 'var(--text-faint)' }}
        >
          <X size={18} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
      </div>

      {showHint && (
        <div className="progress-hint" style={{ marginBottom: 10 }} data-testid="progress-hint">
          <Target size={17} strokeWidth={ICON_STROKE} aria-hidden className="progress-hint-icon" />
          <div>
            <div className="progress-hint-title">
              {hint.action === 'addWeight'
                ? `Bereit für +${fmt(hint.amountKg)} kg`
                : 'Mehr Wiederholungen holen'}
            </div>
            <div className="progress-hint-reason">{hint.reason}</div>
          </div>
        </div>
      )}

      {draft.sets.map((s, i) => {
        const isActive = active?.setId === s.id
        return (
          <div key={s.id}>
            <div className="set-row" data-ghost={s.ghost} data-testid="set-row">
              <div className="set-index">
                <span
                  onPointerDown={() => {
                    longPress.current = window.setTimeout(() => removeSet(s.id), 550)
                  }}
                  onPointerUp={() => {
                    if (longPress.current) window.clearTimeout(longPress.current)
                  }}
                  onPointerLeave={() => {
                    if (longPress.current) window.clearTimeout(longPress.current)
                  }}
                >
                  {s.kind === 'warmup' ? 'A' : i + 1}
                </span>
                <button
                  type="button"
                  className="warmup-chip"
                  data-on={s.kind === 'warmup'}
                  aria-label="Aufwärmsatz umschalten"
                  aria-pressed={s.kind === 'warmup'}
                  onClick={() =>
                    patchSet(s.id, { kind: s.kind === 'warmup' ? 'normal' : 'warmup' })
                  }
                >
                  A
                </button>
              </div>

              {showWeight ? (
                <button
                  type="button"
                  className="set-cell"
                  data-active={isActive && active?.field === 'weight'}
                  aria-label={`Gewicht Satz ${i + 1}`}
                  onClick={() =>
                    setActive(
                      isActive && active?.field === 'weight'
                        ? null
                        : { setId: s.id, field: 'weight' },
                    )
                  }
                >
                  <span className="set-cell-value">{fmt(s.weightKg)}</span>
                  <span className="set-cell-unit">kg</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                className="set-cell"
                data-active={isActive && active?.field === 'reps'}
                aria-label={`Wiederholungen Satz ${i + 1}`}
                onClick={() =>
                  setActive(
                    isActive && active?.field === 'reps'
                      ? null
                      : { setId: s.id, field: 'reps' },
                  )
                }
              >
                <span className="set-cell-value">{fmt(s.reps)}</span>
                <span className="set-cell-unit">Wdh.</span>
              </button>

              <button
                type="button"
                className="set-confirm"
                data-done={s.confirmed}
                aria-label={`Satz ${i + 1} bestätigen`}
                aria-pressed={s.confirmed}
                onClick={() => confirmSet(s)}
              >
                <Check size={20} strokeWidth={2.25} aria-hidden />
              </button>
            </div>

            {isActive && (
              <div className="stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Verringern"
                  onClick={() => step(s, active.field, -1)}
                >
                  <Minus size={18} strokeWidth={ICON_STROKE} aria-hidden />
                </button>
                <div>
                  <div className="stepper-value">
                    {fmt(active.field === 'weight' ? s.weightKg : s.reps)}
                  </div>
                  <div className="stepper-label">
                    {active.field === 'weight' ? `kg · ±${fmt(inc)}` : 'Wdh. · ±1'}
                  </div>
                </div>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label="Erhöhen"
                  onClick={() => step(s, active.field, 1)}
                >
                  <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  aria-label="Satz löschen"
                  onClick={() => removeSet(s.id)}
                  style={{ padding: 8, color: 'var(--text-faint)' }}
                >
                  <Trash2 size={18} strokeWidth={ICON_STROKE} aria-hidden />
                </button>
              </div>
            )}

            {isActive && active.field === 'weight' && isBarbell && s.weightKg !== undefined && (
              <PlateHint totalKg={s.weightKg} barKg={barKg} onBar={setBarKg} />
            )}
          </div>
        )
      })}

      <button
        type="button"
        className="btn btn-block"
        style={{ marginTop: 10, padding: '10px 14px' }}
        onClick={addSet}
      >
        <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden />
        Satz
      </button>
    </div>
  )
}

function PlateHint({
  totalKg,
  barKg,
  onBar,
}: {
  totalKg: number
  barKg: number
  onBar: (kg: number) => void
}) {
  const b = platesPerSide(totalKg, barKg)
  return (
    <div className="plate-line" data-testid="plate-hint">
      <div className="row-between" style={{ gap: 8 }}>
        <span>
          pro Seite: <strong>{formatPerSide(b.perSide)}</strong>
          {!b.achievable && b.remainderKg > 0 && (
            <span className="faint"> (+{formatPerSide([b.remainderKg])} Rest)</span>
          )}
        </span>
        <span className="row" style={{ gap: 4 }}>
          <span className="faint">Stange</span>
          <input
            type="number"
            aria-label="Stangengewicht"
            value={barKg}
            min={0}
            max={40}
            step={2.5}
            onChange={(e) => onBar(Number(e.target.value))}
            style={{
              width: 56,
              padding: '3px 6px',
              borderRadius: 8,
              background: 'var(--control-bg)',
              border: '1px solid var(--control-border)',
              fontSize: 13,
            }}
          />
          <span className="faint">kg</span>
        </span>
      </div>
    </div>
  )
}
