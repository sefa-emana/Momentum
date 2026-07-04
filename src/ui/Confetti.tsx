import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from './hooks'

const COLORS = [
  'var(--accent)',
  'var(--accent-hot)',
  'var(--xp)',
  'var(--state-strong)',
  'var(--state-steady)',
]

/**
 * A small, hand-rolled celebration burst (~20 particles, ~1.2s) for genuine
 * milestones only. Auto-cleans by ending on opacity 0; the caller unmounts it.
 * Renders nothing under reduced motion.
 */
export function Confetti({ count = 20 }: { count?: number }) {
  const reduced = useReducedMotion()

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 260,
        y: 90 + Math.random() * 140,
        rotate: (Math.random() - 0.5) * 540,
        delay: Math.random() * 0.12,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.5,
      })),
    [count],
  )

  if (reduced) return null

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
          animate={{ opacity: [1, 1, 0], x: p.x, y: p.y, rotate: p.rotate }}
          transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  )
}
