/**
 * Weekly quests — opt-in, rotating mini-challenges (Thema 3, endgame).
 *
 * Design guardrails from the research:
 *  - OPT-IN: the user accepts a quest; nothing is imposed.
 *  - NEVER shown as "failed": an expired (past-week) quest silently rolls away,
 *    no guilt, no trace ("Daily Quests or Daily Pests?", CHI PLAY 2022).
 *  - Fully DETERMINISTIC: the weekly rotation is a pure hash of the ISO-week
 *    key (no randomness source), and completion is derived from the workout
 *    history + accepted quests, so `rebuildFromWorkouts` replay stays consistent.
 */
import { WHO_POINTS_PER_MIN, WHO_WEEKLY_POINTS_TARGET } from './constants'
import { dayKey, toDate, weekKey } from './dates'
import type { AcceptedQuest, QuestRef, Workout } from './types'

export interface QuestDef {
  id: string
  title: string
  description: string
  /** Target the progress value must reach to complete the quest. */
  target: number
  /** Bonus XP granted once, when an accepted quest is completed (60–100). */
  bonusXp: number
  /** Pure progress function over the workouts of a single ISO week. */
  progress: (workouts: Workout[], weekKeyStr: string) => number
}

/** Workouts that fall in the given ISO week. */
function weekWorkouts(workouts: Workout[], weekKeyStr: string): Workout[] {
  return workouts.filter((w) => weekKey(w.date) === weekKeyStr)
}

/**
 * The quest pool. Order is stable — the rotation hash indexes into it, so the
 * order must never change without accepting a different rotation.
 */
export const QUEST_POOL: QuestDef[] = [
  {
    id: 'variety3',
    title: 'Allrounder-Woche',
    description: '3 verschiedene Trainingsarten in dieser Woche.',
    target: 3,
    bonusXp: 90,
    progress: (ws, wk) => new Set(weekWorkouts(ws, wk).map((w) => w.type)).size,
  },
  {
    id: 'active4',
    title: '4 aktive Tage',
    description: 'An 4 verschiedenen Tagen dieser Woche trainieren.',
    target: 4,
    bonusXp: 80,
    progress: (ws, wk) => new Set(weekWorkouts(ws, wk).map((w) => dayKey(w.date))).size,
  },
  {
    id: 'who150',
    title: '150 WHO-Punkte',
    description: 'Erreiche das WHO-Wochenziel von 150 Aktivitätspunkten.',
    target: WHO_WEEKLY_POINTS_TARGET,
    bonusXp: 100,
    progress: (ws, wk) =>
      weekWorkouts(ws, wk).reduce(
        (s, w) => s + WHO_POINTS_PER_MIN[w.intensity] * w.durationMin,
        0,
      ),
  },
  {
    id: 'mobility2',
    title: '2× Mobility',
    description: 'Zwei Mobility-Einheiten für Beweglichkeit und Erholung.',
    target: 2,
    bonusXp: 60,
    progress: (ws, wk) => weekWorkouts(ws, wk).filter((w) => w.type === 'mobility').length,
  },
  {
    id: 'strength2',
    title: '2× Kraft',
    description: 'Zwei Krafteinheiten — der WHO-Kraftanker.',
    target: 2,
    bonusXp: 60,
    progress: (ws, wk) => weekWorkouts(ws, wk).filter((w) => w.type === 'strength').length,
  },
  {
    id: 'light1',
    title: 'Lockere Erholung',
    description: 'Eine bewusst lockere Erholungseinheit einbauen.',
    target: 1,
    bonusXp: 60,
    progress: (ws, wk) => weekWorkouts(ws, wk).filter((w) => w.intensity === 'light').length,
  },
]

export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(
  QUEST_POOL.map((q) => [q.id, q]),
)

/** Deterministic FNV-1a hash of a string → unsigned 32-bit int. */
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The two quests offered for a given ISO week, chosen by a stable hash of the
 * week key over the pool (no randomness → same week always yields the same
 * offers). The two are always distinct.
 */
export function offeredQuests(weekKeyStr: string): [QuestDef, QuestDef] {
  const n = QUEST_POOL.length
  const h = hashStr(weekKeyStr)
  const i = h % n
  let j = Math.floor(h / n) % (n - 1)
  if (j >= i) j += 1
  return [QUEST_POOL[i], QUEST_POOL[j]]
}

/** Whether a quest is completed for its week, given the full history. */
export function isQuestComplete(
  def: QuestDef,
  workouts: Workout[],
  weekKeyStr: string,
): boolean {
  return def.progress(workouts, weekKeyStr) >= def.target
}

/**
 * Quests that an accepted-and-not-yet-done set *completes* the moment a workout
 * dated `at` is logged. Only current-week accepted quests count, and only when
 * the logged workout is at/after the acceptance time (so accepting a quest that
 * is already satisfied never retroactively grants it — this keeps live and
 * replay identical, since the gate uses only persisted facts).
 */
export function newlyCompletedQuests(
  accepted: AcceptedQuest[],
  done: QuestRef[],
  workouts: Workout[],
  at: string | Date,
): QuestDef[] {
  const wk = weekKey(at)
  const atMs = toDate(at).getTime()
  const doneSet = new Set(done.map((q) => `${q.week}:${q.id}`))
  const out: QuestDef[] = []
  for (const aq of accepted) {
    if (aq.week !== wk) continue
    if (doneSet.has(`${aq.week}:${aq.id}`)) continue
    if (toDate(aq.acceptedAt).getTime() > atMs) continue
    const def = QUEST_MAP[aq.id]
    if (def && isQuestComplete(def, workouts, wk)) out.push(def)
  }
  return out
}

/**
 * The first accepted, current-week, not-yet-done quest that is exactly one step
 * from completion (progress = target − 1, or ≥ target−1 for the points quest) —
 * used for the gentle "Quest fast geschafft" dashboard nudge. Null if none.
 */
export function almostCompleteQuest(
  accepted: AcceptedQuest[],
  done: QuestRef[],
  workouts: Workout[],
  now: string | Date,
): QuestDef | null {
  const wk = weekKey(now)
  const doneSet = new Set(done.map((q) => `${q.week}:${q.id}`))
  for (const aq of accepted) {
    if (aq.week !== wk) continue
    if (doneSet.has(`${aq.week}:${aq.id}`)) continue
    const def = QUEST_MAP[aq.id]
    if (!def) continue
    const p = def.progress(workouts, wk)
    if (p >= def.target) continue
    if (p >= def.target - 1) return def
  }
  return null
}
