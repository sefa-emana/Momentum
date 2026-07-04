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
  WEEKLY_GOAL_BONUS_XP,
  computeMomentum,
  dayKey,
  levelFromXp,
  longestStreak,
  computeStreak,
  momentumGainFor,
  newlyUnlocked,
  totalXp as sumWorkoutXp,
  xpForWorkout,
  weekKey,
  weekProgress,
  type AchievementDef,
  type AppState,
  type Intensity,
  type Workout,
  type WorkoutType,
} from '../domain'

export const STORAGE_KEY = 'momentum-state-v1'
const STATE_VERSION = 1

export interface LogWorkoutInput {
  type: WorkoutType
  durationMin: number
  intensity: Intensity
  note?: string
  /** Optional ISO timestamp; defaults to now. Allows back-dating. */
  date?: string
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
    unlocked: [],
    onboarded: false,
    settings: {
      name: '',
      weeklyGoal: { workoutsPerWeek: DEFAULT_WEEKLY_GOAL },
      reducedMotion: false,
    },
  }
}

/** Pure reducer for logging a workout — extracted so it can be unit-tested
 *  independently of React/Zustand. Returns the next state and the reward. */
export function reduceLogWorkout(
  state: AppState,
  input: LogWorkoutInput,
): { next: AppState; reward: WorkoutReward } {
  const at = input.date ?? nowIso()

  const momentumBefore = computeMomentum(state.workouts, at)
  const totalXpBefore = sumWorkoutXp(state.workouts) + state.bonusXp
  const levelBefore = levelFromXp(totalXpBefore).level

  const priorSameDayCount = state.workouts.filter(
    (w) => dayKey(w.date) === dayKey(at),
  ).length

  const lastWorkoutDate =
    state.workouts.length > 0
      ? [...state.workouts].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0].date
      : null

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
  }

  const workouts = [...state.workouts, workout]
  const momentumAfter = computeMomentum(workouts, at)
  const isComeback =
    momentumGainFor(lastWorkoutDate, at) > 15 && lastWorkoutDate !== null

  // Weekly goal — award the bonus at most once per ISO week.
  const wk = weekKey(at)
  const progress = weekProgress(
    workouts,
    state.settings.weeklyGoal.workoutsPerWeek,
    at,
  )
  const goalAlreadyRewarded = state.goalMetWeeks.includes(wk)
  const goalJustMet = progress.met && !goalAlreadyRewarded
  const goalBonusXp = goalJustMet ? WEEKLY_GOAL_BONUS_XP : 0
  const goalMetWeeks = goalJustMet ? [...state.goalMetWeeks, wk] : state.goalMetWeeks

  // Achievements — evaluate against the fresh derived context.
  const totalXpMid = sumWorkoutXp(workouts) + state.bonusXp + goalBonusXp
  const levelMid = levelFromXp(totalXpMid).level
  const distinctTypesThisWeek = new Set(
    workouts
      .filter((w) => weekKey(w.date) === wk)
      .map((w) => w.type),
  ).size

  const unlockedIds = state.unlocked.map((u) => u.id)
  const fresh = newlyUnlocked(unlockedIds, {
    totalWorkouts: workouts.length,
    currentStreak: computeStreak(workouts, at),
    longestStreak: longestStreak(workouts),
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

  const bonusXp = state.bonusXp + goalBonusXp + achievementBonus
  const totalXpAfter = sumWorkoutXp(workouts) + bonusXp
  const levelAfter = levelFromXp(totalXpAfter).level

  const next: AppState = {
    ...state,
    workouts,
    bonusXp,
    goalMetWeeks,
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
    newAchievements: fresh,
    bonusXp: goalBonusXp + achievementBonus,
  }

  return { next, reward }
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
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) }))
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
      partialize: (s) => ({
        version: s.version,
        createdAt: s.createdAt,
        workouts: s.workouts,
        bonusXp: s.bonusXp,
        goalMetWeeks: s.goalMetWeeks,
        unlocked: s.unlocked,
        settings: s.settings,
        onboarded: s.onboarded,
      }),
    },
  ),
)
