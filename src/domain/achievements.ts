/**
 * Achievements — tied to genuine milestones (competence signal), never
 * inflationary, and delivered as a pleasant surprise to limit the
 * overjustification effect (Deci & Lepper).
 */
import { COMEBACK_GAP_DAYS } from './constants'
import { daysBetween } from './dates'
import type { AchievementDef, Workout } from './types'

export interface AchievementContext {
  totalWorkouts: number
  currentStreak: number
  longestStreak: number
  level: number
  momentum: number
  weeklyGoalsMet: number
  distinctTypesThisWeek: number
  workouts: Workout[]
}

interface Rule extends AchievementDef {
  test: (ctx: AchievementContext) => boolean
}

/** True if any workout was logged after a lapse of >= COMEBACK_GAP_DAYS. */
function hasComeback(workouts: Workout[]): boolean {
  const sorted = [...workouts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i - 1].date, sorted[i].date) >= COMEBACK_GAP_DAYS) {
      return true
    }
  }
  return false
}

export const ACHIEVEMENTS: Rule[] = [
  {
    id: 'first-step',
    title: 'Erster Schritt',
    description: 'Deine allererste Einheit ist geloggt.',
    icon: '🌱',
    bonusXp: 25,
    test: (c) => c.totalWorkouts >= 1,
  },
  {
    id: 'workouts-10',
    title: 'Aufgewärmt',
    description: '10 Einheiten absolviert.',
    icon: '🔟',
    bonusXp: 50,
    test: (c) => c.totalWorkouts >= 10,
  },
  {
    id: 'workouts-50',
    title: 'Committed',
    description: '50 Einheiten absolviert.',
    icon: '💪',
    bonusXp: 150,
    test: (c) => c.totalWorkouts >= 50,
  },
  {
    id: 'workouts-100',
    title: 'Centurion',
    description: '100 Einheiten absolviert.',
    icon: '🏆',
    bonusXp: 400,
    test: (c) => c.totalWorkouts >= 100,
  },
  {
    id: 'streak-7',
    title: 'Woche der Konsistenz',
    description: '7er-Streak erreicht.',
    icon: '🔥',
    bonusXp: 75,
    test: (c) => c.longestStreak >= 7,
  },
  {
    id: 'streak-30',
    title: 'Unaufhaltsam',
    description: '30er-Streak erreicht.',
    icon: '⚡',
    bonusXp: 300,
    test: (c) => c.longestStreak >= 30,
  },
  {
    id: 'level-5',
    title: 'Aufsteiger',
    description: 'Level 5 erreicht.',
    icon: '⭐',
    bonusXp: 100,
    test: (c) => c.level >= 5,
  },
  {
    id: 'level-10',
    title: 'Veteran',
    description: 'Level 10 erreicht.',
    icon: '🌟',
    bonusXp: 250,
    test: (c) => c.level >= 10,
  },
  {
    id: 'momentum-max',
    title: 'In der Zone',
    description: 'Momentum auf 100 gebracht.',
    icon: '🚀',
    bonusXp: 120,
    test: (c) => c.momentum >= 100,
  },
  {
    id: 'comeback',
    title: 'Comeback',
    description: 'Nach einer Pause zurück ins Training.',
    icon: '🔄',
    bonusXp: 80,
    test: (c) => hasComeback(c.workouts),
  },
  {
    id: 'all-rounder',
    title: 'Allrounder',
    description: '3 verschiedene Trainingsarten in einer Woche.',
    icon: '🎯',
    bonusXp: 90,
    test: (c) => c.distinctTypesThisWeek >= 3,
  },
  {
    id: 'goal-getter',
    title: 'Zielstrebig',
    description: 'Wochenziel 4 Mal erreicht.',
    icon: '🎖️',
    bonusXp: 200,
    test: (c) => c.weeklyGoalsMet >= 4,
  },
]

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)

/** IDs of all achievements currently satisfied by the context. */
export function satisfiedAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(ctx)).map((a) => a.id)
}

/**
 * Given the already-unlocked IDs and a fresh context, return the newly
 * satisfied achievement definitions (with bonus XP) to award.
 */
export function newlyUnlocked(
  unlockedIds: string[],
  ctx: AchievementContext,
): AchievementDef[] {
  const have = new Set(unlockedIds)
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(ctx))
}
