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
  /** Distinct ISO weeks that reached the WHO weekly points target (150). */
  whoWeeksMet: number
  /** Weeks that earned the "beat last week's load" progress bonus. */
  progressWeeksCount: number
  /** Workouts marked as an honest personal record. */
  prCount: number
  /** Workout types that have reached mastery level 5. */
  mastery5Count: number
  /** Comebacks in the history (gaps ≥ COMEBACK_GAP_DAYS). */
  comebackCount: number
}

/** Defaults for the Wave-3 context fields, so callers/tests can opt in. */
export const EMPTY_ACHIEVEMENT_EXTRAS = {
  whoWeeksMet: 0,
  progressWeeksCount: 0,
  prCount: 0,
  mastery5Count: 0,
  comebackCount: 0,
} as const

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

  // --- Wave 3: long-term, tiered "Awards" — visible from the start so the
  // endgame always has a next milestone in sight (Duolingo 2023 split). --------
  {
    id: 'workouts-250',
    title: 'Marathon-Geist',
    description: '250 Einheiten absolviert.',
    icon: '🏔️',
    bonusXp: 800,
    test: (c) => c.totalWorkouts >= 250,
  },
  {
    id: 'workouts-500',
    title: 'Eiserner Wille',
    description: '500 Einheiten absolviert.',
    icon: '⛰️',
    bonusXp: 1500,
    test: (c) => c.totalWorkouts >= 500,
  },
  {
    id: 'streak-60',
    title: 'Zwei Monate Feuer',
    description: '60er-Streak erreicht.',
    icon: '🔥',
    bonusXp: 600,
    test: (c) => c.longestStreak >= 60,
  },
  {
    id: 'streak-100',
    title: 'Dreistellig',
    description: '100er-Streak erreicht.',
    icon: '💯',
    bonusXp: 1200,
    test: (c) => c.longestStreak >= 100,
  },
  {
    id: 'level-20',
    title: 'Elite',
    description: 'Level 20 erreicht.',
    icon: '🌟',
    bonusXp: 500,
    test: (c) => c.level >= 20,
  },
  {
    id: 'level-30',
    title: 'Ikone',
    description: 'Level 30 erreicht.',
    icon: '👑',
    bonusXp: 900,
    test: (c) => c.level >= 30,
  },
  {
    id: 'who-week',
    title: 'WHO-Woche',
    description: 'Erste Woche mit 150 WHO-Aktivitätspunkten.',
    icon: '❤️',
    bonusXp: 120,
    test: (c) => c.whoWeeksMet >= 1,
  },
  {
    id: 'who-weeks-10',
    title: 'Gesundheits-Routine',
    description: '10 Wochen mit dem WHO-Ziel von 150 Punkten.',
    icon: '💗',
    bonusXp: 400,
    test: (c) => c.whoWeeksMet >= 10,
  },
  {
    id: 'progress-weeks-5',
    title: 'Progressiver',
    description: '5 Wochen die eigene Trainingslast gesteigert.',
    icon: '📈',
    bonusXp: 300,
    test: (c) => c.progressWeeksCount >= 5,
  },
  {
    id: 'pr-5',
    title: 'Rekordjäger',
    description: '5 Einheiten mit persönlichem Rekord markiert.',
    icon: '🎯',
    bonusXp: 250,
    test: (c) => c.prCount >= 5,
  },
  {
    id: 'pr-20',
    title: 'PR-Maschine',
    description: '20 Einheiten mit persönlichem Rekord markiert.',
    icon: '🏹',
    bonusXp: 700,
    test: (c) => c.prCount >= 20,
  },
  {
    id: 'mastery-5-any',
    title: 'Spezialist',
    description: 'Meisterschaft Level 5 in einer Trainingsart.',
    icon: '🥇',
    bonusXp: 200,
    test: (c) => c.mastery5Count >= 1,
  },
  {
    id: 'mastery-5-three',
    title: 'Vielseitig stark',
    description: 'Meisterschaft Level 5 in drei Trainingsarten.',
    icon: '🎖️',
    bonusXp: 500,
    test: (c) => c.mastery5Count >= 3,
  },
  {
    id: 'comeback-3',
    title: 'Steh-auf-Mensch',
    description: 'Dreimal nach einer Pause zurück ins Training.',
    icon: '🔄',
    bonusXp: 300,
    test: (c) => c.comebackCount >= 3,
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
