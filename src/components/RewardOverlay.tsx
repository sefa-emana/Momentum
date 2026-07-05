import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Check, Flame, Heart, Share2, Sparkles, Star, Target, TrendingUp, Trophy, Zap } from 'lucide-react'
import type { WorkoutReward } from '../state/store'
import { achievementIcon, ICON_STROKE } from '../ui/icons'
import { Ticker } from '../ui/Ticker'
import { Confetti } from '../ui/Confetti'
import { renderAchievementCard, shareImage } from '../ui/shareCard'

/**
 * Immediate, celebratory feedback after logging — the "emotional glue" that
 * (per Fogg) turns repetition into habit. Reveals in order: headline, XP,
 * then momentum + bonus pills, then achievements. Overreaching is never
 * rewarded, so its pills are replaced by a gentle recovery reminder.
 */
export function RewardOverlay({
  reward,
  moodAfter,
  onClose,
}: {
  reward: WorkoutReward
  moodAfter?: 1 | 2 | 3 | 4 | 5
  onClose: () => void
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(id)
  }, [onClose])

  const headline = reward.leveledUp
    ? `Level ${reward.levelAfter}!`
    : reward.isComeback
      ? 'Willkommen zurück!'
      : 'Stark gemacht!'

  const subtitle = reward.isComeback && !reward.leveledUp
    ? 'Dein Einsatz zahlt sich doppelt aus.'
    : null

  const HeroIcon = reward.leveledUp ? Star : reward.isComeback ? Flame : Zap

  const shareAchievement = async () => {
    const first = reward.newAchievements[0]
    if (!first) return
    try {
      const blob = await renderAchievementCard({
        title: first.title,
        subtitle: first.description,
      })
      await shareImage(blob, 'momentum-erfolg.png', `Erfolg freigeschaltet: ${first.title}`)
    } catch {
      /* sharing failed / cancelled — nothing to do */
    }
  }
  const celebrate =
    reward.leveledUp ||
    reward.newAchievements.length > 0 ||
    reward.questsCompleted.length > 0

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
        style={{ position: 'relative', overflow: 'hidden' }}
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        onClick={(e) => e.stopPropagation()}
      >
        {celebrate && <Confetti />}

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
          transition={{ delay: 0.1, duration: 0.6 }}
          style={{ display: 'inline-flex', color: 'var(--accent)', position: 'relative' }}
        >
          <HeroIcon size={64} strokeWidth={ICON_STROKE} aria-hidden />
        </motion.div>

        <h2 style={{ fontSize: 26, marginTop: 8 }}>{headline}</h2>
        {subtitle && (
          <p className="muted" style={{ fontSize: 14, margin: '4px 0 0' }}>{subtitle}</p>
        )}

        <motion.div
          className="hero-number"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ fontSize: 40, color: 'var(--xp)', margin: '12px 0 4px' }}
        >
          <Ticker value={reward.workoutXp} prefix="+" suffix=" XP" />
        </motion.div>

        <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
          <span className="pill" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            <Flame size={14} strokeWidth={ICON_STROKE} aria-hidden />
            +{reward.momentumGain} Momentum
          </span>
          {reward.weeklyWhoPoints > 0 && (
            <span className="pill" style={{ borderColor: 'var(--state-rest)', color: 'var(--state-rest)' }}>
              <Heart size={14} strokeWidth={ICON_STROKE} aria-hidden />
              {reward.weeklyWhoPoints} WHO-Punkte
            </span>
          )}
        </div>

        {reward.overreach ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.4 }}>
            Große Woche! Denk an Erholung — Fortschritts-Boni pausieren bei sehr
            steilen Sprüngen.
          </p>
        ) : (
          (reward.progressJustMade || reward.prBonusXp > 0 || reward.goalJustMet) && (
            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {reward.progressJustMade && (
                <span className="pill" style={{ borderColor: 'var(--state-strong)', color: 'var(--state-strong)' }}>
                  <TrendingUp size={14} strokeWidth={ICON_STROKE} aria-hidden />
                  Wochen-Fortschritt! +{reward.progressBonusXp} XP
                </span>
              )}
              {reward.prBonusXp > 0 && (
                <span className="pill" style={{ borderColor: 'var(--accent-hot)', color: 'var(--accent-hot)' }}>
                  <Trophy size={14} strokeWidth={ICON_STROKE} aria-hidden />
                  PR! +{reward.prBonusXp} XP
                </span>
              )}
              {reward.goalJustMet && (
                <span className="pill" style={{ borderColor: 'var(--state-strong)', color: 'var(--state-strong)' }}>
                  <Target size={14} strokeWidth={ICON_STROKE} aria-hidden />
                  Wochenziel! +{reward.goalBonusXp} XP
                </span>
              )}
            </div>
          )
        )}

        {(reward.questsCompleted.length > 0 || reward.surpriseXp > 0) && (
          <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {reward.questsCompleted.map((q) => (
              <span
                key={q.id}
                className="pill"
                style={{ borderColor: 'var(--state-strong)', color: 'var(--state-strong)' }}
              >
                <Check size={14} strokeWidth={ICON_STROKE} aria-hidden />
                Quest geschafft: {q.title} +{q.bonusXp} XP
              </span>
            ))}
            {reward.surpriseXp > 0 && (
              <span className="pill" style={{ borderColor: 'var(--xp)', color: 'var(--xp)' }}>
                <Sparkles size={14} strokeWidth={ICON_STROKE} aria-hidden />
                Überraschung! +{reward.surpriseXp} XP
              </span>
            )}
          </div>
        )}

        {moodAfter !== undefined && moodAfter >= 4 && (
          <p className="faint" style={{ fontSize: 12.5, marginTop: 12 }}>
            Gutes Gefühl nach dem Training — merk dir das.
          </p>
        )}

        {reward.newAchievements.length > 0 && (
          <div className="stack" style={{ marginTop: 18, gap: 10 }}>
            <div className="faint" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Neuer Erfolg
            </div>
            {reward.newAchievements.map((a, i) => {
              const Icon = achievementIcon(a.id)
              return (
                <motion.div
                  key={a.id}
                  className="list-item"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.1 }}
                >
                  <span className="badge-icon" aria-hidden>
                    <Icon size={22} strokeWidth={ICON_STROKE} />
                  </span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <strong>{a.title}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>{a.description}</div>
                  </div>
                  <span className="pill" style={{ color: 'var(--xp)' }}>+{a.bonusXp}</span>
                </motion.div>
              )
            })}
            <button className="btn btn-block" onClick={shareAchievement}>
              <Share2 size={18} strokeWidth={ICON_STROKE} aria-hidden />
              Teilen
            </button>
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={onClose}>
          Weiter
        </button>
      </motion.div>
    </motion.div>
  )
}
