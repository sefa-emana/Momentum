import type { DaySeriesPoint } from '../domain'

/** Lightweight hand-rolled SVG bar chart for daily XP — no chart dependency. */
export function MiniBarChart({ data }: { data: DaySeriesPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.xp))
  const width = 100
  const height = 60
  const gap = 2
  const barW = (width - gap * (data.length - 1)) / data.length

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="90"
        preserveAspectRatio="none"
        role="img"
        aria-label="XP der letzten Tage"
      >
        {data.map((d, i) => {
          const h = (d.xp / max) * (height - 4)
          const x = i * (barW + gap)
          const y = height - h
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, d.xp > 0 ? 2 : 0.6)}
              rx={1.2}
              fill={d.xp > 0 ? 'url(#bar-grad)' : '#232b47'}
            />
          )
        })}
        <defs>
          <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="row-between" style={{ marginTop: 4 }}>
        <span className="faint" style={{ fontSize: 11 }}>
          {data[0]?.label}
        </span>
        <span className="faint" style={{ fontSize: 11 }}>
          heute
        </span>
      </div>
    </div>
  )
}
