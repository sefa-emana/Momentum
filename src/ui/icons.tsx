/**
 * Central icon mapping — the single place that turns domain string ids
 * (WorkoutType / Intensity / achievement ids / tab ids) into Lucide glyphs.
 *
 * Domain META objects keep their emoji fields (domain stays presentation-free);
 * the UI never renders those emoji directly — it goes through here so every
 * icon is a consistent, stroked Lucide component instead of an OS emoji.
 */
import {
  Activity,
  Award,
  CalendarCheck,
  Crosshair,
  Crown,
  Dumbbell,
  Flame,
  Gem,
  Heart,
  HeartPulse,
  Medal,
  Mountain,
  MountainSnow,
  Repeat,
  Rocket,
  RotateCcw,
  Shuffle,
  Sparkles,
  Sprout,
  Star,
  StretchHorizontal,
  Target,
  TrendingUp,
  Trophy,
  Volleyball,
  Wind,
  Zap,
  Home,
  History,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { Intensity, WorkoutType } from '../domain'
import type { Tab } from '../components/BottomNav'

/** Default sizing per the design system: 18–24px, stroke ~1.75. */
export const ICON_STROKE = 1.75

export const WORKOUT_TYPE_ICON: Record<WorkoutType, LucideIcon> = {
  strength: Dumbbell,
  cardio: Activity,
  mobility: StretchHorizontal,
  sport: Volleyball,
  other: Sparkles,
}

/** Intensity carries a colour cue drawn from the status triad tokens. */
export const INTENSITY_ICON: Record<Intensity, { Icon: LucideIcon; color: string }> = {
  light: { Icon: Wind, color: 'var(--state-strong)' },
  moderate: { Icon: Activity, color: 'var(--state-steady)' },
  vigorous: { Icon: Flame, color: 'var(--accent-hot)' },
}

export const TAB_ICON: Record<Tab, LucideIcon> = {
  home: Home,
  history: History,
  achievements: Medal,
  profile: User,
}

const ACHIEVEMENT_ICON: Record<string, LucideIcon> = {
  'first-step': Sprout,
  'workouts-10': Dumbbell,
  'workouts-50': Medal,
  'workouts-100': Trophy,
  'streak-7': Flame,
  'streak-30': Zap,
  'level-5': Star,
  'level-10': Sparkles,
  'momentum-max': Rocket,
  comeback: RotateCcw,
  'all-rounder': Target,
  'goal-getter': Award,
  // --- Wave 3: tiered long-term awards ---
  'workouts-250': Mountain,
  'workouts-500': MountainSnow,
  'streak-60': Flame,
  'streak-100': Zap,
  'level-20': Gem,
  'level-30': Crown,
  'who-week': Heart,
  'who-weeks-10': HeartPulse,
  'progress-weeks-5': TrendingUp,
  'pr-5': Target,
  'pr-20': Crosshair,
  'mastery-5-any': Medal,
  'mastery-5-three': Award,
  'comeback-3': Repeat,
}

export function achievementIcon(id: string): LucideIcon {
  return ACHIEVEMENT_ICON[id] ?? Trophy
}

/** Icon per weekly-quest id (Wave 3). */
const QUEST_ICON: Record<string, LucideIcon> = {
  variety3: Shuffle,
  active4: CalendarCheck,
  who150: Heart,
  mobility2: StretchHorizontal,
  strength2: Dumbbell,
  light1: Wind,
}

export function questIcon(id: string): LucideIcon {
  return QUEST_ICON[id] ?? Target
}
