/**
 * Global application store (Zustand + localStorage persistence).
 *
 * Momentum, level, streaks and stats are all *derived* from the workout
 * history via pure domain functions — the store only persists raw facts
 * (workouts, bonus XP, unlocked achievements, settings). This keeps a single
 * source of truth and makes the mechanics reproducible.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { idbStorage } from './idbStorage'
import {
  DEFAULT_WEEKLY_GOAL,
  PR_BONUS_XP,
  PROGRESS_BONUS_XP,
  LOAD_RATIO_ELEVATED,
  SURPRISE_BONUS_XP,
  WEEKLY_GOAL_BONUS_XP,
  GHOST_BEAT_XP,
  E1RM_PR_XP,
  WEIGHT_PR_XP,
  REP_PR_XP,
  VOLUME_PR_XP,
  PR_XP_CAP,
  WORKOUT_TYPES,
  computeMomentumDetail,
  countComebacks,
  dayKey,
  daysBetween,
  detectPRs,
  ghostBeats,
  egoLiftExercises,
  EXERCISE_MAP,
  levelFromXp,
  loadRatio,
  loadTrend,
  longestStreak,
  computeStreak,
  isComebackNow,
  newlyCompletedQuests,
  newlyUnlocked,
  offeredQuests,
  overreachStatus,
  surpriseBonusFor,
  toEpoch,
  totalXp as sumWorkoutXp,
  typesAtMasteryLevel,
  weeklyWhoPoints,
  whoWeeksMet,
  xpForWorkout,
  weekKey,
  weekProgress,
  type AchievementDef,
  type AcceptedQuest,
  type AppState,
  type ExerciseDef,
  type ExerciseEntry,
  type Intensity,
  type Pause,
  type PRKind,
  type QuestDef,
  type Workout,
  type WorkoutType,
} from '../domain'

export const STORAGE_KEY = 'momentum-state-v1'
const STATE_VERSION = 4

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
  /** Optional per-exercise set log (Progression Engine v2). */
  entries?: ExerciseEntry[]
  /** True when this is a back-dated session (date < today−1). Derived by the
   *  live `logWorkout` action and preserved through replay — a stored fact, so
   *  the reducer stays pure. Backfilled sessions earn no ghost/PR bonus XP. */
  backfilled?: boolean
  /** Preserve an existing workout id (used by the replay in
   *  rebuildFromWorkouts so id-keyed rewards like the surprise bonus stay
   *  deterministic). Live logging omits it and a fresh id is minted. */
  id?: string
}

/** The fields of a workout that editing may change (`updateWorkout`). */
export type WorkoutPatch = Partial<
  Pick<
    Workout,
    | 'type'
    | 'durationMin'
    | 'intensity'
    | 'note'
    | 'date'
    | 'feel'
    | 'prBeaten'
    | 'moodBefore'
    | 'moodAfter'
    | 'entries'
  >
>

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
  /** Accepted quests this session just completed (drives quest pills + confetti). */
  questsCompleted: QuestDef[]
  /** Total bonus XP from quests completed this session. */
  questBonusXp: number
  /** Ethical surprise bonus for this workout (0 or SURPRISE_BONUS_XP). */
  surpriseXp: number
  /** Progression Engine v2: personal records detected this session (per
   *  exercise). Empty for backfilled sessions or when no entries were logged.
   *  When entries exist these REPLACE the manual `prBeaten` flag's role. */
  prEvents: { exerciseId: string; kinds: PRKind[] }[]
  /** Exercise ids that beat their own last session ("Schlag dein letztes Mal"). */
  ghostBeaten: string[]
  /** Total ghost-beat + PR bonus XP awarded this session (0 on overreach/backfill). */
  setBonusXp: number
  newAchievements: AchievementDef[]
  bonusXp: number
}

interface StoreActions {
  logWorkout: (input: LogWorkoutInput) => WorkoutReward
  deleteWorkout: (id: string) => void
  /** Edit a workout: merge the patch, then replay so every derived value
   *  (XP, momentum, PRs, achievements) recomputes consistently. The edited
   *  workout keeps its original `backfilled` flag. */
  updateWorkout: (id: string, patch: WorkoutPatch) => void
  /** Re-insert a previously deleted workout (undo), then replay so all derived
   *  state recomputes consistently. Idempotent if the id already exists. */
  restoreWorkout: (workout: Workout) => void
  /** Add a user-defined custom exercise (id validated + prefixed 'custom-'). */
  addCustomExercise: (def: ExerciseDef) => void
  setWeeklyGoal: (n: number) => void
  setName: (name: string) => void
  setReducedMotion: (v: boolean) => void
  /** Record that the user just exported their data (backup-freshness nudge). */
  markBackup: () => void
  completeOnboarding: (name: string, weeklyGoal: number) => void
  /** Opt into a weekly quest offered this ISO week (at most 2 per week). */
  acceptQuest: (id: string) => void
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
    acceptedQuests: [],
    questsDone: [],
    unlocked: [],
    customExercises: [],
    onboarded: false,
    settings: {
      name: '',
      weeklyGoal: { workoutsPerWeek: DEFAULT_WEEKLY_GOAL },
      reducedMotion: false,
    },
  }
}

/**
 * Persist migration up to the current STATE_VERSION. Cumulative and defensive:
 * v1 → v2 added the forgiveness-layer fields (`progressWeeks`, `pauses`);
 * v2 → v3 added the endgame quest fields (`acceptedQuests`, `questsDone`);
 * v3 → v4 adds Progression Engine v2 (`customExercises`; workouts gain optional
 * `entries`/`backfilled`, which need no backfill as they are optional). Any key
 * missing from an older persisted state is filled from `initialState()`.
 * Exported so it can be unit-tested directly.
 */
export function migratePersisted(persisted: unknown, _version: number): AppState {
  const s = (persisted ?? {}) as Partial<AppState>
  return {
    ...initialState(),
    ...s,
    progressWeeks: s.progressWeeks ?? [],
    pauses: s.pauses ?? [],
    acceptedQuests: s.acceptedQuests ?? [],
    questsDone: s.questsDone ?? [],
    customExercises: s.customExercises ?? [],
    version: STATE_VERSION,
  }
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
    id: input.id ?? newId(),
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
    entries: input.entries,
    backfilled: input.backfilled || undefined,
  }

  const workouts = [...state.workouts, workout]
  const afterDetail = computeMomentumDetail(workouts, pauses, at)
  const momentumAfter = afterDetail.momentum

  // --- Safety rail: overreaching is never rewarded (Thema 1). --------------
  const overreach = overreachStatus(workouts, at) === 'elevated'

  // --- Progression Engine v2: honest per-exercise XP. ----------------------
  // Ghost-beat + PR bonuses, all derived from the preserved set entries so they
  // replay bit-for-bit. Zeroed on overreach OR for a backfilled (back-dated)
  // session — both must never yield celebration flags or bonus XP (anti-exploit).
  const custom = state.customExercises ?? []
  let prEvents: { exerciseId: string; kinds: PRKind[] }[] = []
  let ghostBeaten: string[] = []
  let setBonusXp = 0
  if (workout.entries && workout.entries.length > 0 && !workout.backfilled && !overreach) {
    // Ego-lifts (weight jump > 2× increment) earn no bonus and no celebration.
    const egoLifts = egoLiftExercises(state.workouts, workout, custom)
    ghostBeaten = ghostBeats(state.workouts, workout).filter((id) => !egoLifts.has(id))
    const ghostXp = ghostBeaten.length * GHOST_BEAT_XP

    prEvents = detectPRs(state.workouts, workout, custom).filter(
      (p) => !egoLifts.has(p.exerciseId),
    )
    let prXp = 0
    for (const p of prEvents) {
      for (const k of p.kinds) {
        prXp +=
          k === 'e1rm'
            ? E1RM_PR_XP
            : k === 'weight'
              ? WEIGHT_PR_XP
              : k === 'rep'
                ? REP_PR_XP
                : VOLUME_PR_XP
      }
    }
    setBonusXp = ghostXp + Math.min(prXp, PR_XP_CAP)
  }

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

  // --- Weekly quests: award an accepted quest's bonus the moment a logged ---
  // workout completes it (derived, once per (week,id) — replay reproduces it).
  const questsCompleted = newlyCompletedQuests(
    state.acceptedQuests,
    state.questsDone,
    workouts,
    at,
  )
  const questBonusXp = questsCompleted.reduce((s, q) => s + q.bonusXp, 0)
  const questsDone = questsCompleted.length
    ? [...state.questsDone, ...questsCompleted.map((q) => ({ id: q.id, week: wk }))]
    : state.questsDone

  // --- Ethical surprise bonus: always additive, id-hash-triggered (≈1/8). ---
  const surpriseXp = surpriseBonusFor(workout.id) ? SURPRISE_BONUS_XP : 0

  const preAchievementBonus =
    goalBonusXp + prBonusXp + progressBonusXp + questBonusXp + surpriseXp + setBonusXp

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
    whoWeeksMet: whoWeeksMet(workouts),
    progressWeeksCount: progressWeeks.length,
    prCount: workouts.filter((w) => w.prBeaten).length,
    mastery5Count: typesAtMasteryLevel(workouts, WORKOUT_TYPES, 5),
    comebackCount: countComebacks(workouts),
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
    questsDone,
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
    questsCompleted,
    questBonusXp,
    surpriseXp,
    prEvents,
    ghostBeaten,
    setBonusXp,
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
  prev: Pick<
    AppState,
    | 'createdAt'
    | 'onboarded'
    | 'settings'
    | 'version'
    | 'pauses'
    | 'acceptedQuests'
    | 'customExercises'
  >,
  workouts: Workout[],
): AppState {
  const sorted = [...workouts].sort((a, b) => toEpoch(a.date) - toEpoch(b.date))

  // Pauses, accepted quests and custom exercises are raw user facts, not derived
  // accumulators — carry them through so the replay computes momentum/streaks/
  // quests/PRs against the same inputs. Everything else (bonusXp, goalMetWeeks,
  // progressWeeks, questsDone, unlocked) rebuilds via replay.
  let base: AppState = {
    ...initialState(),
    version: prev.version,
    createdAt: prev.createdAt,
    onboarded: prev.onboarded,
    settings: prev.settings,
    pauses: prev.pauses,
    acceptedQuests: prev.acceptedQuests,
    customExercises: prev.customExercises ?? [],
  }

  for (const w of sorted) {
    // Pass every persisted field through — id (so id-keyed rewards like the
    // surprise bonus stay deterministic), feel/prBeaten/mood (so load and
    // PR-based derivations replay identically) and entries/backfilled (so the
    // Progression Engine v2 XP replays and edited workouts keep their flag).
    base = reduceLogWorkout(base, {
      id: w.id,
      type: w.type,
      durationMin: w.durationMin,
      intensity: w.intensity,
      note: w.note,
      date: w.date,
      feel: w.feel,
      prBeaten: w.prBeaten,
      moodBefore: w.moodBefore,
      moodAfter: w.moodAfter,
      entries: w.entries,
      backfilled: w.backfilled,
    }).next
  }

  return base
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      logWorkout: (input) => {
        // Derive `backfilled` from the real clock: a NEW session dated before
        // yesterday is a back-fill. Computed here (not in the pure reducer) and
        // then stored, so replay reads it as a fact and stays deterministic.
        const backfilled =
          input.backfilled ??
          (input.date ? daysBetween(input.date, nowIso()) > 1 : false)
        const { next, reward } = reduceLogWorkout(get(), { ...input, backfilled })
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

      updateWorkout: (id, patch) => {
        set((s) => {
          const idx = s.workouts.findIndex((w) => w.id === id)
          if (idx === -1) return {}
          const updated = s.workouts.map((w) =>
            // Keep the original id and `backfilled` flag; everything else is
            // patchable, then a full replay recomputes all derived state.
            w.id === id ? { ...w, ...patch, id: w.id, backfilled: w.backfilled } : w,
          )
          return rebuildFromWorkouts(s, updated)
        })
      },

      restoreWorkout: (workout) => {
        set((s) => {
          if (s.workouts.some((w) => w.id === workout.id)) return {}
          // Replay so bonus XP / achievements recompute; the restored workout's
          // stored xp is recomputed by the replay exactly like a fresh log.
          return rebuildFromWorkouts(s, [...s.workouts, workout])
        })
      },

      addCustomExercise: (def) => {
        set((s) => {
          const id = def.id.startsWith('custom-') ? def.id : `custom-${def.id}`
          // Reject id collisions against both built-ins and existing customs.
          const clash =
            EXERCISE_MAP[id] !== undefined ||
            s.customExercises.some((e) => e.id === id)
          if (clash) return {}
          return { customExercises: [...s.customExercises, { ...def, id }] }
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

      markBackup: () => {
        set((s) => ({ settings: { ...s.settings, lastBackupAt: nowIso() } }))
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

      acceptQuest: (id) => {
        set((s) => {
          const wk = weekKey(nowIso())
          // Only quests actually offered this ISO week can be accepted.
          if (!offeredQuests(wk).some((q) => q.id === id)) return {}
          const thisWeek = s.acceptedQuests.filter((q) => q.week === wk)
          if (thisWeek.some((q) => q.id === id)) return {} // already accepted
          if (thisWeek.length >= 2) return {} // at most 2 per week
          const accepted: AcceptedQuest = { id, week: wk, acceptedAt: nowIso() }
          return { acceptedQuests: [...s.acceptedQuests, accepted] }
        })
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
      // Durable, eviction-resistant storage (IndexedDB) with a transparent
      // one-time migration from the legacy localStorage snapshot — see
      // idbStorage.ts. Same key + same migrate chain, so both layers match.
      storage: createJSONStorage(() => idbStorage),
      migrate: (persisted, version) => migratePersisted(persisted, version),
      partialize: (s) => ({
        version: s.version,
        createdAt: s.createdAt,
        workouts: s.workouts,
        bonusXp: s.bonusXp,
        goalMetWeeks: s.goalMetWeeks,
        progressWeeks: s.progressWeeks,
        pauses: s.pauses,
        acceptedQuests: s.acceptedQuests,
        questsDone: s.questsDone,
        unlocked: s.unlocked,
        customExercises: s.customExercises,
        settings: s.settings,
        onboarded: s.onboarded,
      }),
    },
  ),
)
