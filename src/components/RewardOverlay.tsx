import { motion } from 'framer-motion'
import { useEffect } from 'react'
import type { WorkoutReward } from '../state/store'

/**
 * Immediate, celebratory feedback after logging — the "emotional glue" that
 * (per Fogg) turns repetition into habit. Surfaces XP, level-ups, comebacks,
 * goal completion and freshly unlocked achievements.
 */
export function RewardOverlay({
  reward,
  onClose,
}: {
  reward: WorkoutReward
  onClose: () => void
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(id)
  }, [onClose])

  const headline = reward.leveledUp
    ? `Level ${reward.levelAfter}! 🎉`
    : reward.isComeback
      ? 'Willkommen zurück! 🔄'
      : 'Stark gemacht! 💪'

  return (
    <motion.div
      className="reward-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Belohnung"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="reward-card"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{ fontSize: 64 }}
        >
          {reward.leveledUp ? '⭐' : reward.isComeback ? '🔥' : '⚡'}
        </motion.div>

        <h2 style={{ fontSize: 26, marginTop: 8 }}>{headline}</h2>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: 'var(--xp)',
            margin: '12px 0 4px',
          }}
        >
          +{reward.workoutXp} XP
        </motion.div>

        <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <span className="pill" style={{ borderColor: 'var(--accent)', color: 'var(--accent-2)' }}>
            🔥 Momentum {Math.round(reward.momentumAfter)}
          </span>
          {reward.goalJustMet && (
            <span className="pill" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              🎯 Wochenziel! +{reward.goalBonusXp} XP
            </span>
          )}
        </div>

        {reward.newAchievements.length > 0 && (
          <div className="stack" style={{ marginTop: 18, gap: 10 }}>
            <div className="faint" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Neuer Erfolg
            </div>
            {reward.newAchievements.map((a, i) => (
              <motion.div
                key={a.id}
                className="list-item"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
              >
                <span style={{ fontSize: 30 }}>{a.icon}</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <strong>{a.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>{a.description}</div>
                </div>
                <span className="pill" style={{ color: 'var(--xp)' }}>+{a.bonusXp}</span>
              </motion.div>
            ))}
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={onClose}>
          Weiter
        </button>
      </motion.div>
    </motion.div>
  )
}
