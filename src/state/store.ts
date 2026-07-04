/**
 * Global application store (Zustand + localStorage persistence).
 *
 * Momentum, level, streaks and stats are all *derived* from the workout
 * history via pure domain functions — the store only persists raw facts
 * (workouts, bonus XP, unlocked achievements, settings). This keeps a single
 * source of truth and makes the mechanics reproducible.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_WEEKLY_GOAL,
  PR_BONUS_XP,
  PROGRESS_BONUS_XP,
  LOAD_RATIO_ELEVATED,
  WEEKLY_GOAL_BONUS_XP,
  computeMomentumDetail,
  dayKey,
  levelFromXp,
  loadRatio,
  loadTrend,
  longestStreak,
  computeStreak,
  isComebackNow,
  newlyUnlocked,
  overreachStatus,
  totalXp as sumWorkoutXp,
  weeklyWhoPoints,
  xpForWorkout,
  weekKey,
  weekProgress,
  type AchievementDef,
  type AppState,
  type Intensity,
  type Pause,
  type Workout,
  type WorkoutType,
} from '../domain'

export const STORAGE_KEY = 'momentum-state-v1'
const STATE_VERSION = 2

export interface LogWorkoutInput {
  type: WorkoutType
  durationMin: number
  intensity: Intensity
  note?: string
  /** Optional ISO timestamp; defaults to now. Allows back-dating. */
  date?: string
  /** Optional post-session RPE tap (3|5|7|9). */
  feel?: number
  /** User marked an honest personal record this session. */
  prBeaten?: boolean
  moodBefore?: 1 | 2 | 3 | 4 | 5
  moodAfter?: 1 | 2 | 3 | 4 | 5
}

/** Rich result describing everything that changed — drives the reward UI. */
export interface WorkoutReward {
  workoutId: string
  workoutXp: number
  momentumBefore: number
  momentumAfter: number
  momentumGain: number
  levelBefore: number
  levelAfter: number
  leveledUp: boolean
  isComeback: boolean
  goalJustMet: boolean
  goalBonusXp: number
  /** Bonus for an honest PR (0 unless prBeaten and load is calm). */
  prBonusXp: number
  /** Bonus for beating last week's load (0 unless the safe band is met). */
  progressBonusXp: number
  /** True when this session earned the weekly progress bonus. */
  progressJustMade: boolean
  /** Rest Shields banked after this session. */
  shieldsRemaining: number
  /** WHO activity points accumulated this ISO week. */
  weeklyWhoPoints: number
  /** True when the load ratio is elevated — UI shows a gentle note and no
   *  progress/PR bonus is granted (never reward overreaching). */
  overreach: boolean
  newAchievements: AchievementDef[]
  bonusXp: number
}

interface StoreActions {
  logWorkout: (input: LogWorkoutInput) => WorkoutReward
  deleteWorkout: (id: string) => void
  setWeeklyGoal: (n: number) => void
  setName: (name: string) => void
  setReducedMotion: (v: boolean) => void
  completeOnboarding: (name: string, weeklyGoal: number) => void
  /** Begin a "Life happened" pause (no-op if one is already active). */
  startPause: () => void
  /** End the active pause (sets its `to` to today). */
  endPause: () => void
  resetAll: () => void
  importState: (state: AppState) => void
}

export type Store = AppState & StoreActions

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `w-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function initialState(): AppState {
  const ts = nowIso()
  return {
    version: STATE_VERSION,
    createdAt: ts,
    workouts: [],
    bonusXp: 0,
    goalMetWeeks: [],
    progressWeeks: [],
    pauses: [],
    unlocked: [],
    onboarded: false,
    settings: {
      name: '',
      weeklyGoal: { workoutsPerWeek: DEFAULT_WEEKLY_GOAL },
      reducedMotion: false,
    },
  }
}

/**
 * Persist migration (v1 → v2): add the forgiveness-layer fields
 * (`progressWeeks`, `pauses`) and tolerate any other keys missing from an older
 * persisted state. Exported so it can be unit-tested directly.
 */
export function migratePersisted(persisted: unknown, version: number): AppState {
  const s = (persisted ?? {}) as Partial<AppState>
  if (version < 2) {
    return {
      ...initialState(),
      ...s,
      progressWeeks: s.progressWeeks ?? [],
      pauses: s.pauses ?? [],
      version: STATE_VERSION,
    }
  }
  return s as AppState
}

/** Pure reducer for logging a workout — extracted so it can be unit-tested
 *  independently of React/Zustand. Returns the next state and the reward. */
export function reduceLogWorkout(
  state: AppState,
  input: LogWorkoutInput,
): { next: AppState; reward: WorkoutReward } {
  const at = input.date ?? nowIso()
  const pauses = state.pauses

  const momentumBefore = computeMomentumDetail(state.workouts, pauses, at).momentum
  const totalXpBefore = sumWorkoutXp(state.workouts) + state.bonusXp
  const levelBefore = levelFromXp(totalXpBefore).level

  const priorSameDayCount = state.workouts.filter(
    (w) => dayKey(w.date) === dayKey(at),
  ).length

  // Whether logging now ends a lapse (evaluated on the pre-log history).
  const isComeback = isComebackNow(state.workouts, at, pauses)

  // XP uses the momentum *before* the session so consistency is rewarded.
  const workoutXp = xpForWorkout({
    durationMin: input.durationMin,
    intensity: input.intensity,
    momentum: momentumBefore,
    priorSameDayCount,
  })

  const workout: Workout = {
    id: newId(),
    date: at,
    type: input.type,
    durationMin: input.durationMin,
    intensity: input.intensity,
    note: input.note?.trim() || undefined,
    xpEarned: workoutXp,
    feel: input.feel,
    prBeaten: input.prBeaten || undefined,
    moodBefore: input.moodBefore,
    moodAfter: input.moodAfter,
  }

  const workouts = [...state.workouts, workout]
  const afterDetail = computeMomentumDetail(workouts, pauses, at)
  const momentumAfter = afterDetail.momentum

  // --- Safety rail: overreaching is never rewarded (Thema 1). --------------
  const overreach = overreachStatus(workouts, at) === 'elevated'

  // --- PR bonus: an honest self-marked record, only while load is calm. ----
  const prBonusXp = input.prBeaten && !overreach ? PR_BONUS_XP : 0

  // --- Weekly progress bonus: first session that beats last week's load, ---
  // once per ISO week, and only inside the safe band (ratio ≤ 1.5).
  const wk = weekKey(at)
  const trend = loadTrend(workouts, at)
  const ratio = loadRatio(workouts, at)
  const ratioSafe = ratio === null || ratio <= LOAD_RATIO_ELEVATED
  const progressAlready = state.progressWeeks.includes(wk)
  const progressJustMade =
    !overreach &&
    ratioSafe &&
    trend.lastWeek > 0 &&
    trend.thisWeek > trend.lastWeek &&
    !progressAlready
  const progressBonusXp = progressJustMade ? PROGRESS_BONUS_XP : 0
  const progressWeeks = progressJustMade ? [...state.progressWeeks, wk] : state.progressWeeks

  // --- Weekly goal — award the bonus at most once per ISO week. ------------
  const progress = weekProgress(
    workouts,
    state.settings.weeklyGoal.workoutsPerWeek,
    at,
  )
  const goalAlreadyRewarded = state.goalMetWeeks.includes(wk)
  const goalJustMet = progress.met && !goalAlreadyRewarded
  const goalBonusXp = goalJustMet ? WEEKLY_GOAL_BONUS_XP : 0
  const goalMetWeeks = goalJustMet ? [...state.goalMetWeeks, wk] : state.goalMetWeeks

  const preAchievementBonus = goalBonusXp + prBonusXp + progressBonusXp

  // Achievements — evaluate against the fresh derived context.
  const totalXpMid = sumWorkoutXp(workouts) + state.bonusXp + preAchievementBonus
  const levelMid = levelFromXp(totalXpMid).level
  const distinctTypesThisWeek = new Set(
    workouts
      .filter((w) => weekKey(w.date) === wk)
      .map((w) => w.type),
  ).size

  const unlockedIds = state.unlocked.map((u) => u.id)
  const fresh = newlyUnlocked(unlockedIds, {
    totalWorkouts: workouts.length,
    currentStreak: computeStreak(workouts, at, pauses),
    longestStreak: longestStreak(workouts, pauses),
    level: levelMid,
    momentum: momentumAfter,
    weeklyGoalsMet: goalMetWeeks.length,
    distinctTypesThisWeek,
    workouts,
  })
  const achievementBonus = fresh.reduce((s, a) => s + a.bonusXp, 0)
  const unlocked = [
    ...state.unlocked,
    ...fresh.map((a) => ({ id: a.id, unlockedAt: at })),
  ]

  const bonusXp = state.bonusXp + preAchievementBonus + achievementBonus
  const totalXpAfter = sumWorkoutXp(workouts) + bonusXp
  const levelAfter = levelFromXp(totalXpAfter).level

  const next: AppState = {
    ...state,
    workouts,
    bonusXp,
    goalMetWeeks,
    progressWeeks,
    unlocked,
  }

  const reward: WorkoutReward = {
    workoutId: workout.id,
    workoutXp,
    momentumBefore,
    momentumAfter,
    momentumGain: momentumAfter - momentumBefore,
    levelBefore,
    levelAfter,
    leveledUp: levelAfter > levelBefore,
    isComeback,
    goalJustMet,
    goalBonusXp,
    prBonusXp,
    progressBonusXp,
    progressJustMade,
    shieldsRemaining: afterDetail.shieldsRemaining,
    weeklyWhoPoints: weeklyWhoPoints(workouts, at),
    overreach,
    newAchievements: fresh,
    bonusXp: preAchievementBonus + achievementBonus,
  }

  return { next, reward }
}

/**
 * Rebuild the full state from a set of workouts by replaying them
 * chronologically. Because momentum, XP, goal bonuses and achievements are
 * all deterministic functions of the history, this keeps the derived
 * accumulators (bonusXp / goalMetWeeks / unlocked) perfectly consistent —
 * essential after a deletion, which would otherwise leave them stranded.
 */
export function rebuildFromWorkouts(
  prev: Pick<AppState, 'createdAt' | 'onboarded' | 'settings' | 'version' | 'pauses'>,
  workouts: Workout[],
): AppState {
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  // Pauses are raw facts, not derived accumulators — carry them through so the
  // replay computes momentum/streaks against the same frozen days. Everything
  // else (bonusXp, goalMetWeeks, progressWeeks, unlocked) rebuilds via replay.
  let base: AppState = {
    ...initialState(),
    version: prev.version,
    createdAt: prev.createdAt,
    onboarded: prev.onboarded,
    settings: prev.settings,
    pauses: prev.pauses,
  }

  for (const w of sorted) {
    base = reduceLogWorkout(base, {
      type: w.type,
      durationMin: w.durationMin,
      intensity: w.intensity,
      note: w.note,
      date: w.date,
    }).next
  }

  // Preserve the original workout ids (replay regenerates them). The replay
  // processes workouts in the same chronological order, so indices align.
  base.workouts = base.workouts.map((w, i) => ({ ...w, id: sorted[i].id }))
  return base
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      logWorkout: (input) => {
        const { next, reward } = reduceLogWorkout(get(), input)
        set(next)
        return reward
      },

      deleteWorkout: (id) => {
        set((s) => {
          const remaining = s.workouts.filter((w) => w.id !== id)
          // Replay so bonus XP, weekly-goal credit and achievements stay
          // consistent with the reduced history (they are non-invertible
          // accumulators otherwise).
          return rebuildFromWorkouts(s, remaining)
        })
      },

      setWeeklyGoal: (n) => {
        set((s) => ({
          settings: {
            ...s.settings,
            weeklyGoal: { workoutsPerWeek: n },
          },
        }))
      },

      setName: (name) => {
        set((s) => ({ settings: { ...s.settings, name } }))
      },

      setReducedMotion: (v) => {
        set((s) => ({ settings: { ...s.settings, reducedMotion: v } }))
      },

      completeOnboarding: (name, weeklyGoal) => {
        set((s) => ({
          onboarded: true,
          settings: {
            ...s.settings,
            name: name.trim(),
            weeklyGoal: { workoutsPerWeek: weeklyGoal },
          },
        }))
      },

      startPause: () => {
        set((s) => {
          // At most one active pause.
          if (s.pauses.some((p) => p.to === null)) return {}
          const pause: Pause = { from: nowIso(), to: null }
          return { pauses: [...s.pauses, pause] }
        })
      },

      endPause: () => {
        set((s) => {
          const idx = s.pauses.findIndex((p) => p.to === null)
          if (idx === -1) return {}
          const to = nowIso()
          return {
            pauses: s.pauses.map((p, i) => (i === idx ? { ...p, to } : p)),
          }
        })
      },

      resetAll: () => {
        set(initialState())
      },

      importState: (state) => {
        set(state)
      },
    }),
    {
      name: STORAGE_KEY,
      version: STATE_VERSION,
      migrate: (persisted, version) => migratePersisted(persisted, version),
      partialize: (s) => ({
        version: s.version,
        createdAt: s.createdAt,
        workouts: s.workouts,
        bonusXp: s.bonusXp,
        goalMetWeeks: s.goalMetWeeks,
        progressWeeks: s.progressWeeks,
        pauses: s.pauses,
        unlocked: s.unlocked,
        settings: s.settings,
        onboarded: s.onboarded,
      }),
    },
  ),
)
