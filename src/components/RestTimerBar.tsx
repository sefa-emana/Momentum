import { forwardRef, useImperativeHandle } from 'react'
import { useRestTimer } from '../ui/useRestTimer'

export interface RestControl {
  /** Start (or restart) the rest countdown for `seconds`. */
  start: (seconds: number) => void
}

function mmss(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.max(0, sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Sticky rest-timer bar. Owns its own countdown state so the per-second ticks
 * re-render ONLY this component — never the parent sheet's animated tree (which
 * would otherwise stall the sheet's enter/exit animation). Exposed imperatively
 * via a ref so the set editor can auto-start it on ✓.
 */
export const RestTimerBar = forwardRef<RestControl, unknown>(function RestTimerBar(_props, ref) {
  const rest = useRestTimer()
  useImperativeHandle(ref, () => ({ start: rest.start }), [rest.start])

  if (!rest.running) return null

  return (
    <div className="rest-bar" data-testid="rest-bar">
      <span className="rest-bar-time">Pause {mmss(rest.remaining)}</span>
      <div className="rest-bar-track" aria-hidden>
        <div
          className="rest-bar-fill"
          style={{ width: `${rest.total > 0 ? (rest.remaining / rest.total) * 100 : 0}%` }}
        />
      </div>
      <button type="button" className="rest-bar-btn" onClick={() => rest.add(30)}>
        +30s
      </button>
      <button type="button" className="rest-bar-btn" onClick={rest.skip}>
        Überspringen
      </button>
    </div>
  )
})
