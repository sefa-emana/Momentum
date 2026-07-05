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

const PAD_BOTTOM = 20
const VIEW_W = 300

/**
 * Hand-rolled SVG weekly bar chart (e.g. volume load per ISO week). Bars scale
 * to the series' own max; sparse 'KW nn' labels sit under the first/last week.
 * Theme-aware and accessible. No entrance animation (calm, and bars read fine
 * static — respects reduced-motion by simply not animating at all).
 */
export function BarsChart({
  data,
  height = 130,
  label,
  formatValue = (v) => Math.round(v).toLocaleString('de-DE'),
  color = 'var(--accent)',
}: BarsChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const n = Math.max(1, data.length)
  const gap = n > 12 ? 2 : 4
  const barW = (VIEW_W - gap * (n - 1)) / n
  const baseY = height - PAD_BOTTOM

  const labelIdx = new Set<number>([0, data.length - 1])

  return (
    <div className="trend-chart">
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        <line
          x1={0}
          y1={baseY}
          x2={VIEW_W}
          y2={baseY}
          stroke="var(--hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const h = d.value > 0 ? Math.max(2, (d.value / max) * (baseY - 4)) : 0
          const x = i * (barW + gap)
          return (
            <rect
              key={d.week}
              x={x}
              y={baseY - h}
              width={barW}
              height={h}
              rx={2}
              fill={d.value > 0 ? color : 'var(--surface-3)'}
              opacity={d.value > 0 ? 0.85 : 1}
            />
          )
        })}
      </svg>
      <div className="trend-axis" aria-hidden>
        {data.map((d, i) =>
          labelIdx.has(i) ? (
            <span
              key={d.week}
              className="trend-axis-x tnum"
              style={{ left: `${((i * (barW + gap) + barW / 2) / VIEW_W) * 100}%` }}
            >
              {kwLabel(d.week)}
            </span>
          ) : null,
        )}
      </div>
      <div className="trend-yrange faint tnum" aria-hidden>
        <span>{formatValue(max)}</span>
        <span>0</span>
      </div>
    </div>
  )
}
