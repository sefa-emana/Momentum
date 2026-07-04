/**
 * Evidence-based tuning constants.
 *
 * Every number here traces back to a principle from the research summary
 * (see docs/PSYCHOLOGY.md). They are centralised so the mechanics can be
 * reasoned about — and tested — in one place.
 */

// ---------------------------------------------------------------------------
// Momentum — the core "Rückfall" (relapse) mechanic.
// A continuous 0–100 scale, NOT a binary streak, so a lapse cools it down
// rather than destroying it (loss aversion applied gently, with a floor).
// ---------------------------------------------------------------------------

/** Momentum never drops below this once training has begun — protects the
 *  comeback so getting back on track always feels near (anti "what-the-hell").*/
export const MOMENTUM_FLOOR = 15
export const MOMENTUM_MAX = 100

/** Momentum added per logged workout (capped at MOMENTUM_MAX). */
export const MOMENTUM_GAIN = 15

/** A return after a lapse grants a larger boost + a "welcome back" moment. */
export const COMEBACK_GAIN = 25
/** A gap of this many days (or more) since the previous workout counts as a
 *  comeback. */
export const COMEBACK_GAP_DAYS = 3

/** Rest days are physiologically correct and a single missed day does not
 *  harm habit formation (Lally et al. 2010) — so the first inactive day
 *  causes zero decay. */
export const MOMENTUM_GRACE_DAYS = 1

/** Decay = K * (inactiveDays - grace)^EXP. Gentle at first, accelerating,
 *  but always bounded by MOMENTUM_FLOOR. */
export const MOMENTUM_DECAY_K = 6
export const MOMENTUM_DECAY_EXP = 1.3

// ---------------------------------------------------------------------------
// XP & leveling.
// ---------------------------------------------------------------------------

/** Completion floor — "showing up" always counts (Tiny Habits). */
export const XP_BASE = 20

/** XP per effective minute, scaled by intensity. */
export const XP_PER_MIN: Record<'light' | 'moderate' | 'vigorous', number> = {
  light: 0.8,
  moderate: 1.1,
  vigorous: 1.5,
}

/** Duration beyond this (minutes) earns no extra XP — anti-gaming cap. */
export const XP_DURATION_CAP_MIN = 120

/** Diminishing returns for multiple sessions on the same day — rewards
 *  consistency over volume-spam. Index 0 = first session of the day. */
export const SAME_DAY_FACTORS = [1, 0.5, 0.25]
export const SAME_DAY_MIN_FACTOR = 0.15

/** Momentum couples into reward: bonus XP = floor(momentum / DIVISOR).
 *  Consistency compounds into progression. */
export const MOMENTUM_XP_DIVISOR = 5

/** Level curve: total XP required to *reach* a level = COEF * (level-1)^EXP.
 *  Concave-fast early (quick first levels), steeper later. */
export const LEVEL_XP_COEF = 100
export const LEVEL_XP_EXP = 1.5

// ---------------------------------------------------------------------------
// Weekly goals (Goal-Setting Theory: specific + moderately challenging).
// ---------------------------------------------------------------------------

export const DEFAULT_WEEKLY_GOAL = 4
export const MIN_WEEKLY_GOAL = 1
export const MAX_WEEKLY_GOAL = 14

/** Reward for meeting the weekly goal (granted once per ISO week). */
export const WEEKLY_GOAL_BONUS_XP = 150
