import { TIER_META, momentumTier } from '../domain'

/**
 * Circular momentum gauge. The arc fill and colour reflect the current
 * momentum tier — the emotional centrepiece of the dashboard.
 */
export function MomentumRing({
  momentum,
  size = 200,
}: {
  momentum: number
  size?: number
}) {
  const tier = momentumTier(momentum)
  const meta = TIER_META[tier]
  const stroke = 16
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, momentum))
  const offset = c * (1 - clamped / 100)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Momentum ${momentum} von 100, ${meta.label}`}>
        <defs>
          <linearGradient id="momentum-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0a33b" />
            <stop offset="100%" stopColor={meta.color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1b2340"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#momentum-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Momentum
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          {Math.round(momentum)}
        </div>
        <div
          className="pill"
          style={{
            marginTop: 6,
            background: 'transparent',
            borderColor: meta.color,
            color: meta.color,
          }}
        >
          {meta.label}
        </div>
      </div>
    </div>
  )
}
