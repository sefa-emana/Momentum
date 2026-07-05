import { kwLabel } from './chartScale'

export interface BarPoint {
  /** ISO week key, e.g. '2026-W27'. */
  week: string
  value: number
}

interface BarsChartProps {
  data: BarPoint[]
  height?: number
  label: string
  formatValue?: (v: number) => string
  color?: string
}

/**
 * Weekly bar chart (e.g. volume load per ISO week), laid out with flexbox so
 * value labels, bars and week labels stay perfectly column-aligned. Bars scale
 * to the series' own max (value 0 → baseline tick only, max → full track with a
 * little headroom), are capped at a sensible width and centred so a 2-week
 * history never renders as grotesque full-width slabs. Theme-aware, accessible,
 * static (calm — no entrance animation).
 */
export function BarsChart({
  data,
  height = 130,
  label,
  formatValue = (v) => Math.round(v).toLocaleString('de-DE'),
  color = 'var(--accent)',
}: BarsChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div
      className="bars-chart"
      role="img"
      aria-label={label}
      style={{ ['--bars-h' as string]: `${height}px` }}
    >
      <div className="bars-row">
        {data.map((d) => {
          // Headroom: the tallest bar reaches 92% of the track, never the ceiling.
          const pct = d.value > 0 ? Math.max(2, (d.value / max) * 92) : 0
          return (
            <div className="bars-col" key={d.week}>
              <span className="bars-val faint tnum">{formatValue(d.value)}</span>
              <div className="bars-track">
                <div
                  className="bars-fill"
                  style={{ height: `${pct}%`, background: color }}
                />
              </div>
              <span className="bars-x tnum">{kwLabel(d.week)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
