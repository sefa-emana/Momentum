export type Tab = 'home' | 'history' | 'achievements' | 'profile'

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'history', label: 'Verlauf', icon: '📈' },
  { id: 'achievements', label: 'Erfolge', icon: '🏅' },
  { id: 'profile', label: 'Profil', icon: '👤' },
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
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className="nav-item"
          data-active={tab === item.id}
          aria-current={tab === item.id ? 'page' : undefined}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-icon" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
