import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import type { CSSProperties } from 'react'
import { useReducedMotion } from './hooks'

interface TickerProps {
  /** Target value to display. */
  value: number
  /** Value the count-up starts from on mount (default 0). */
  from?: number
  /** Animation duration in seconds (600–900ms ease-out feel). */
  duration?: number
  /** Fixed decimal places. */
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  style?: CSSProperties
}

/**
 * Count-up number. Animates from `from` (default 0) to `value` with an
 * ease-out curve, re-animating from the previous value on change. Renders the
 * final value instantly when reduced motion is requested. Always tabular so the
 * width stays stable while counting.
 */
export function Ticker({
  value,
  from = 0,
  duration = 0.8,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  style,
}: TickerProps) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : from)
  const prev = useRef(reduced ? value : from)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      prev.current = value
      return
    }
    if (prev.current === value) {
      setDisplay(value)
      return
    }
    const controls = animate(prev.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        prev.current = value
      },
    })
    return () => {
      controls.stop()
      prev.current = value
    }
  }, [value, reduced, duration])

  const text = display.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {prefix}
      {text}
      {suffix}
    </span>
  )
}
