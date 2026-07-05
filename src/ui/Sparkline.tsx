import type { CSSProperties } from 'react'

interface SparklineProps {
  /** Series of values, oldest first. */
  data: number[]
  width?: number
  height?: number
  /** Stroke colour (defaults to the accent token). */
  color?: string
  /** Accessible label for the trend. */
  label?: string
  style?: CSSProperties
}

/**
 * Tiny inline SVG line + area chart — no chart library. Draws a single stroke
 * with a soft filled area beneath it, scaled to the series' own max so it reads
 * as a relative trend rather than absolute values.
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = 'var(--accent)',
  label = 'Trend',
  style,
}: SparklineProps) {
  const n = data.length
  const max = Math.max(1, ...data)
  const pad = 2
  const usableH = height - pad * 2
  const step = n > 1 ? width / (n - 1) : width

  const points = data.map((v, i) => {
    const x = n > 1 ? i * step : width / 2
    const y = pad + usableH * (1 - v / max)
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const gradId = 'spark-fill'

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      style={style}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
