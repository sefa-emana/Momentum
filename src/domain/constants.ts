/**
 * Evidence-based tuning constants.
 *
 * Every number here traces back to a principle from the research summary
 * (see docs/PSYCHOLOGY.md). They are centralised so the mechanics can be
 * reasoned about — and tested — in one place.
 */
import type { WorkoutType } from './types'

/** All workout types, in a stable order (used by mastery + quest logic). */
export const WORKOUT_TYPES: WorkoutType[] = [
  'strength',
  'cardio',
  'mobility',
  'sport',
  'other',
]

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

/** A gap of this many days (or more) since the previous workout counts as a
 *  comeback. */
export const COMEBACK_GAP_DAYS = 3

/**
 * Earn-back comeback (Duolingo "Earn Back" retention winner): instead of a flat
 * bonus, a return restores part of what a lapse actually cost. The gain scales
 * with the momentum lost to decay in that lapse:
 *   `gain = clamp(MOMENTUM_GAIN + round(0.5 · decayLost), MOMENTUM_GAIN, MAX)`.
 * Recovery therefore feels *earned* and proportional — bottoming out barely
 * costs you your progress, but a big real drop is partly handed back. Capped so
 * it can never fully erase a lapse (still bounded, still honest).
 */
export const COMEBACK_GAIN_MAX = 40

// ---------------------------------------------------------------------------
// Rest Shields — the forgiveness layer (Duolingo streak-freeze economics:
// −21% churn, day-14 retention nearly doubled; "two beats one, three is
// pointless" → a hard cap of 2). Shields silently absorb decay days so a rough
// week doesn't punish you, and they regenerate through training rather than
// being bought — earn-back, not buy-back.
// ---------------------------------------------------------------------------

/** Shields a fresh momentum run starts with (also the cap). */
export const SHIELD_START = 2
/** Hard cap on banked shields — beyond two the retention benefit vanishes. */
export const MAX_SHIELDS = 2
/** One shield regenerates per this many distinct active training days. */
export const SHIELD_EARN_ACTIVE_DAYS = 4

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

// ---------------------------------------------------------------------------
// Progression bonuses — reward *real* progress, not mere attendance
// (Progress Principle, Amabile; Pelland 2025 dose-response). Both are gated so
// overreaching is never rewarded (no Strava-style injury incentive).
// ---------------------------------------------------------------------------

/** Bonus for an honestly self-marked personal record ("heute gesteigert").
 *  Only granted while the load nudge is calm (overreach status 'none'). */
export const PR_BONUS_XP = 30

/** Bonus for beating last week's training load — baseline-relative progression
 *  ("schlag deine letzte Woche"). Granted at most once per ISO week and only
 *  inside the safe band (load ratio ≤ 1.5). */
export const PROGRESS_BONUS_XP = 40

/**
 * Ethical surprise bonus (Thema 3): base XP is always guaranteed; on top, a
 * workout *occasionally* grants a small delight. The trigger is a stable hash of
 * the workout id (≈1 in 8), so it is replay-safe (ids are preserved) and never
 * uses `Math.random`. Rule: variable rewards stay always-additive, never
 * subtractive, never purchasable (Finch positive-only model).
 */
export const SURPRISE_BONUS_XP = 25

/** Load ratio above which we consider the acute:chronic balance elevated —
 *  used both to gate bonuses and to surface a gentle plain-language nudge. The
 *  raw ratio (ACWR) is deliberately never shown: its predictive evidence is
 *  contested (PMC7047972), so we use it only as an internal heuristic. */
export const LOAD_RATIO_ELEVATED = 1.5

// ---------------------------------------------------------------------------
// Adaptive weekly goal (adaptive goals beat static ones in RCTs, PMC8820277).
// A suggestion from history; the user always keeps the final word (autonomy).
// ---------------------------------------------------------------------------

/** Upper bound for an auto-suggested weekly goal — protects ≥1 rest day. */
export const ADAPTIVE_GOAL_MAX = 6
/** Lower bound for an auto-suggested weekly goal. */
export const ADAPTIVE_GOAL_MIN = 2

// ---------------------------------------------------------------------------
// WHO physical-activity anchor (WHO 2020 guidelines; Google-Fit "Heart Points"
// model, AHA-endorsed) — an externally validated health target alongside the
// self-referential game layer. Moderate = 1 pt/min, vigorous = 2 pt/min.
// ---------------------------------------------------------------------------

export const WHO_POINTS_PER_MIN: Record<'light' | 'moderate' | 'vigorous', number> = {
  light: 0,
  moderate: 1,
  vigorous: 2,
}
export const WHO_WEEKLY_POINTS_TARGET = 150
export const WHO_WEEKLY_STRENGTH_TARGET = 2

// ---------------------------------------------------------------------------
// Session load — Foster session-RPE model (`Last = Intensität × Minuten`,
// PMC5673663), Borg-CR10-anchored. Validated against heart-rate load across
// many sports, so it is a legitimate progression proxy without set/rep logging.
// ---------------------------------------------------------------------------

/** Intensity → RPE weight (Borg CR10). Used when no post-session `feel` is set. */
export const INTENSITY_RPE: Record<'light' | 'moderate' | 'vigorous', number> = {
  light: 3,
  moderate: 5,
  vigorous: 8,
}
/** A single session's duration is capped here (minutes) for load, mirroring the
 *  XP anti-gaming cap but tuned to the physiological plausibility of one bout. */
export const LOAD_DURATION_CAP_MIN = 180
