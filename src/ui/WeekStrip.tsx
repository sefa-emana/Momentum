import type { WeekDay } from '../state/selectors'

/**
 * Seven cells for the current ISO week (Mo–So). A trained day is filled with
 * the "strong" state colour, today is outlined, and rest/future days stay a
 * calm neutral — rest is a deliberate state, never a "missed" day.
 */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="week-strip" role="list" aria-label="Diese Woche">
      {days.map((d) => (
        <div key={d.key} className="week-strip-day" role="listitem">
          <span
            className="week-strip-dot"
            data-trained={d.trained}
            data-today={d.isToday}
            data-future={d.isFuture}
            aria-label={`${d.label}${d.trained ? ' — trainiert' : ''}${d.isToday ? ' (heute)' : ''}`}
          />
          <span className="week-strip-label" aria-hidden>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}
