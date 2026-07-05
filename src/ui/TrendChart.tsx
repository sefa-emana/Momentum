import { useId } from 'react'
import { useReducedMotion } from './hooks'
import { kwLabel, projectY, xPositions, yBounds } from './chartScale'

export interface TrendPoint {
  /** ISO week key, e.g. '2026-W27'. */
  week: string
  value: number
}

interface TrendChartProps {
  data: TrendPoint[]
  height?: number
  /** Accessible summary of what the trend shows. */
  label: string
  /** Value → display string for the tabular y-axis end labels. */
  formatValue?: (v: number) => string
  /** Colour of the line/dots/area — defaults to the accent token. */
  color?: string
}

const PAD_TOP = 14
const PAD_BOTTOM = 22 // room for the KW labels
const VIEW_W = 300

/**
 * Hand-rolled SVG line chart (line + dots + soft area) for weekly best-e1RM or
 * volume trends. X is ISO weeks with sparse German 'KW nn' labels, Y is
 * auto-scaled with head/foot room. Theme-aware (currentColor-friendly tokens),
 * accessible, and static under reduced motion.
 */
export function TrendChart({
  data,
  height = 150,
  label,
  formatValue = (v) => Math.round(v).toLocaleString('de-DE'),
  color = 'var(--accent)',
}: TrendChartProps) {
  const gid = useId().replace(/:/g, '')
  const reduced = useReducedMotion()

  const values = data.map((d) => d.value)
  const bounds = yBounds(values)
  const xs = xPositions(data.length, VIEW_W)
  const pts = data.map((d, i) => ({
    x: xs[i],
    y: projectY(d.value, bounds, height, PAD_TOP, PAD_BOTTOM),
    week: d.week,
    value: d.value,
  }))

  const line = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const baseY = height - PAD_BOTTOM
  const area = pts.length
    ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`
    : ''

  // Sparse x labels: first, last, and (when there is room) the middle week.
  const labelIdx = new Set<number>([0, data.length - 1])
  if (data.length >= 5) labelIdx.add(Math.floor((data.length - 1) / 2))

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
        <defs>
          <linearGradient id={`trend-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={0}
          y1={baseY}
          x2={VIEW_W}
          y2={baseY}
          stroke="var(--hairline)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {area && <path d={area} fill={`url(#trend-fill-${gid})`} stroke="none" />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={
              reduced || pts.length < 2
                ? undefined
                : { strokeDasharray: 1000, strokeDashoffset: 0, animation: 'trend-draw 0.7s ease' }
            }
          />
        )}

        {pts.map((p) => (
          <circle
            key={p.week}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--card-bg)"
            stroke={color}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Non-scaling overlay for tabular labels (kept out of the stretched SVG). */}
      <div className="trend-axis" aria-hidden>
        {pts.map((p, i) =>
          labelIdx.has(i) ? (
            <span
              key={p.week}
              className="trend-axis-x tnum"
              style={{ left: `${(p.x / VIEW_W) * 100}%` }}
            >
              {kwLabel(p.week)}
            </span>
          ) : null,
        )}
      </div>
      <div className="trend-yrange faint tnum" aria-hidden>
        <span>{formatValue(bounds.max)}</span>
        <span>{formatValue(Math.min(...values))}</span>
      </div>
    </div>
  )
}
