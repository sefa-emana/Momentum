import type { ReactNode } from 'react'

/**
 * Consistent empty-state pattern used across every seeded-empty screen:
 * a single Lucide icon, one warm sentence, and (optionally) one action.
 * A new user must never face a blank card — every empty surface invites the
 * next step instead (motivating, never punishing).
 */
export function EmptyState({
  icon,
  children,
  action,
}: {
  icon: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="card empty-state">
      <span className="empty-state-icon" aria-hidden>
        {icon}
      </span>
      <p className="empty-state-text">{children}</p>
      {action}
    </div>
  )
}
