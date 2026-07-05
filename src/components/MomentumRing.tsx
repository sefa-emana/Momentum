import { TIER_META, momentumTier, type MomentumTier } from '../domain'
import { Ticker } from '../ui/Ticker'

/** Tier → design-token colour for the label pill (domain tier code is untouched). */
const TIER_TOKEN: Record<MomentumTier, string> = {
  cold: 'var(--state-rest)',
  warm: 'var(--state-steady)',
  hot: 'var(--accent)',
  blazing: 'var(--accent-hot)',
}

/**
 * Circular momentum gauge. The arc uses the reserved hero gradient with a
 * soft accent glow; the tier only tints the label. The centre value is set
 * in the display face (Space Grotesk, tabular) — the number is the interface.
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
  const tierColor = TIER_TOKEN[tier]
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
            <stop offset="0%" stopColor="#ff6b3d" />
            <stop offset="100%" stopColor="#ff3d6e" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
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
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)',
            filter: 'drop-shadow(0 0 7px var(--accent-glow))',
          }}
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
        <div className="metric-label">Momentum</div>
        <div className="hero-number" style={{ fontSize: 54, margin: '2px 0 4px' }}>
          <Ticker value={Math.round(momentum)} />
        </div>
        <div
          className="pill"
          style={{
            background: 'transparent',
            borderColor: tierColor,
            color: tierColor,
          }}
        >
          {meta.label}
        </div>
      </div>
    </div>
  )
}
