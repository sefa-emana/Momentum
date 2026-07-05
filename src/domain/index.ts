export * from './types'
export * from './constants'
export * from './dates'
export * from './xp'
export * from './momentum'
export * from './streak'
export * from './load'
export * from './goals'
export * from './achievements'
export * from './mastery'
export * from './quests'
export * from './stats'
export * from './exercises'
export * from './progression'
export * from './ghosts'
export * from './plates'

export const WORKOUT_TYPE_META: Record<
  import('./types').WorkoutType,
  { label: string; icon: string }
> = {
  strength: { label: 'Kraft', icon: '🏋️' },
  cardio: { label: 'Cardio', icon: '🏃' },
  mobility: { label: 'Mobility', icon: '🧘' },
  sport: { label: 'Sport', icon: '⚽' },
  other: { label: 'Sonstiges', icon: '✨' },
}

export const INTENSITY_META: Record<
  import('./types').Intensity,
  { label: string; icon: string }
> = {
  light: { label: 'Locker', icon: '🟢' },
  moderate: { label: 'Moderat', icon: '🟡' },
  vigorous: { label: 'Intensiv', icon: '🔴' },
}
