import { TAB_ICON, ICON_STROKE } from '../ui/icons'

export type Tab = 'home' | 'history' | 'achievements' | 'profile'

const ITEMS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'history', label: 'Verlauf' },
  { id: 'achievements', label: 'Erfolge' },
  { id: 'profile', label: 'Profil' },
]

export function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {ITEMS.map((item) => {
        const Icon = TAB_ICON[item.id]
        return (
          <button
            key={item.id}
            className="nav-item"
            data-active={tab === item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            <span className="nav-icon" aria-hidden>
              <Icon size={22} strokeWidth={ICON_STROKE} />
            </span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
