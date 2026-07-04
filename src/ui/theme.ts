/**
 * Theme preference — persisted independently of the Zustand app store so the
 * design layer owns its own concern (localStorage key `momentum-theme`).
 *
 * 'auto' follows the OS `prefers-color-scheme`; 'dark' / 'light' pin it.
 * The resolved theme is written to `data-theme` on <html> and drives the
 * token overrides in theme.css.
 */

export type ThemePref = 'auto' | 'dark' | 'light'

const STORAGE_KEY = 'momentum-theme'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light' || v === 'auto') return v
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return 'auto'
}

/** Resolve a preference to the concrete theme actually rendered. */
export function resolveTheme(pref: ThemePref = getTheme()): 'dark' | 'light' {
  if (pref === 'dark' || pref === 'light') return pref
  return darkQuery().matches ? 'dark' : 'light'
}

/** Write the resolved theme onto <html> so CSS token overrides take effect. */
export function applyTheme(pref: ThemePref = getTheme()): void {
  const resolved = resolveTheme(pref)
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
}

/** Persist a new preference and apply it immediately. */
export function setTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    /* ignore write failures (private mode etc.) */
  }
  applyTheme(pref)
}

/**
 * Wire up OS scheme-change listening so 'auto' stays live. Call once on boot.
 * Returns a cleanup function.
 */
export function initTheme(): () => void {
  applyTheme()
  const mq = darkQuery()
  const onChange = () => {
    if (getTheme() === 'auto') applyTheme('auto')
  }
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}
