import { useMemo } from 'react'
import { addDays, format } from 'date-fns'
import { de } from 'date-fns/locale'
import { dayKey, sessionLoad, weekInterval, type Workout } from '../domain'

const WEEKS = 17
const ROW_LABELS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']

interface HeatmapProps {
  workouts: Workout[]
  now: string | Date
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

/**
 * GitHub-style consistency heatmap. Columns are ISO weeks (Monday-based), rows
 * are Mo–So, and each cell is that day's summed session load. The 5-step colour
 * scale is RELATIVE to the user's own rolling max over the window (via the
 * `--heat-0..4` tokens), so beginners and veterans both get a readable ramp.
 */
export function Heatmap({ workouts, now, selectedDay, onSelectDay }: HeatmapProps) {
  const { cells, months, rollingMax } = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const w of workouts) {
      const k = dayKey(w.date)
      byDay.set(k, (byDay.get(k) ?? 0) + sessionLoad(w))
    }

    // Monday of the oldest shown week.
    const currentMonday = weekInterval(now).start
    const firstMonday = addDays(currentMonday, -7 * (WEEKS - 1))
    const todayKey = dayKey(now)

    let max = 0
    const grid: {
      key: string
      load: number
      future: boolean
      isToday: boolean
    }[][] = []
    const monthCols: { col: number; label: string }[] = []
    let lastMonth = -1

    for (let col = 0; col < WEEKS; col++) {
      const monday = addDays(firstMonday, col * 7)
      const m = monday.getMonth()
      if (m !== lastMonth) {
        monthCols.push({ col, label: format(monday, 'MMM', { locale: de }) })
        lastMonth = m
      }
      const week: (typeof grid)[number] = []
      for (let row = 0; row < 7; row++) {
        const day = addDays(monday, row)
        const key = dayKey(day)
        const load = byDay.get(key) ?? 0
        if (load > max) max = load
        week.push({
          key,
          load,
          future: key > todayKey,
          isToday: key === todayKey,
        })
      }
      grid.push(week)
    }

    return { cells: grid, months: monthCols, rollingMax: Math.max(1, max) }
  }, [workouts, now])

  const step = (load: number): number => {
    if (load <= 0) return 0
    return Math.min(4, Math.ceil((load / rollingMax) * 4))
  }

  return (
    <div className="heatmap-wrap" data-testid="heatmap">
      <div className="heatmap-scroll">
        <div className="heatmap-months" aria-hidden>
          {months.map((m) => (
            <span
              key={`${m.col}-${m.label}`}
              className="heatmap-month"
              style={{ gridColumn: m.col + 2 }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div className="heatmap-body">
          <div className="heatmap-rowlabels" aria-hidden>
            {ROW_LABELS.map((l, i) => (
              <span key={i} className="heatmap-rowlabel">
                {l}
              </span>
            ))}
          </div>
          <div className="heatmap-grid" role="grid" aria-label="Konsistenz-Heatmap">
            {cells.map((week, col) => (
              <div key={col} className="heatmap-col" role="row">
                {week.map((cell) => {
                  if (cell.future) {
                    return <span key={cell.key} className="heatmap-cell" data-empty />
                  }
                  const selected = cell.key === selectedDay
                  const dateLabel = format(new Date(`${cell.key}T12:00:00`), 'EEEE, d. MMM', {
                    locale: de,
                  })
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      role="gridcell"
                      className="heatmap-cell"
                      data-step={step(cell.load)}
                      data-today={cell.isToday || undefined}
                      data-selected={selected || undefined}
                      aria-label={`${dateLabel}${cell.load > 0 ? ' — trainiert' : ' — Ruhetag'}`}
                      aria-pressed={selected}
                      onClick={() => onSelectDay(selected ? null : cell.key)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend" aria-hidden>
        <span className="faint" style={{ fontSize: 11 }}>
          weniger
        </span>
        {[0, 1, 2, 3, 4].map((s) => (
          <span key={s} className="heatmap-cell heatmap-legend-cell" data-step={s} />
        ))}
        <span className="faint" style={{ fontSize: 11 }}>
          mehr
        </span>
      </div>
    </div>
  )
}
