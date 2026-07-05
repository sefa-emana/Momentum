import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useStore } from '../state/store'
import {
  EXERCISES,
  recentExerciseIds,
  resolveExercise,
  type Equipment,
  type ExerciseDef,
  type ExercisePattern,
} from '../domain'
import { BottomSheet } from '../ui/BottomSheet'
import { ICON_STROKE } from '../ui/icons'
import {
  EQUIPMENT_LABEL,
  PATTERN_LABEL,
  PATTERN_ORDER,
} from '../ui/exerciseMeta'

/** Strip diacritics + lowercase for forgiving ("fuzzy") name matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Every query token must appear somewhere in the name (order-independent). */
function matches(name: string, query: string): boolean {
  const q = normalize(query).trim()
  if (!q) return true
  const hay = normalize(name)
  return q.split(/\s+/).every((tok) => hay.includes(tok))
}

const PATTERNS: ExercisePattern[] = PATTERN_ORDER
const EQUIPMENTS: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
]

export function ExercisePicker({
  onPick,
  onClose,
  excludeIds = [],
}: {
  onPick: (exerciseId: string) => void
  onClose: () => void
  excludeIds?: string[]
}) {
  const workouts = useStore((s) => s.workouts)
  const customExercises = useStore((s) => s.customExercises)
  const addCustomExercise = useStore((s) => s.addCustomExercise)

  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const all = useMemo(
    () => [...EXERCISES, ...customExercises],
    [customExercises],
  )

  const recent = useMemo(() => {
    return recentExerciseIds(workouts, 6)
      .map((id) => resolveExercise(id, customExercises))
      .filter((d): d is ExerciseDef => !!d)
      .filter((d) => !excludeIds.includes(d.id) && matches(d.name, query))
  }, [workouts, customExercises, excludeIds, query])

  const grouped = useMemo(() => {
    const out = new Map<ExercisePattern, ExerciseDef[]>()
    for (const d of all) {
      if (excludeIds.includes(d.id)) continue
      if (!matches(d.name, query)) continue
      const arr = out.get(d.pattern) ?? []
      arr.push(d)
      out.set(d.pattern, arr)
    }
    return out
  }, [all, excludeIds, query])

  const pick = (id: string) => onPick(id)

  return (
    <BottomSheet
      onClose={onClose}
      ariaLabel="Übung wählen"
      data-testid="exercise-picker"
      draggable={false}
      header={<h2 style={{ fontSize: 20 }}>Übung wählen</h2>}
    >
      {creating ? (
        <CustomExerciseForm
          onCancel={() => setCreating(false)}
          onCreate={(def) => {
            addCustomExercise(def)
            const id = def.id.startsWith('custom-') ? def.id : `custom-${def.id}`
            setCreating(false)
            pick(id)
          }}
        />
      ) : (
        <>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              strokeWidth={ICON_STROKE}
              aria-hidden
              style={{ position: 'absolute', left: 13, color: 'var(--text-faint)' }}
            />
            <input
              className="picker-search"
              style={{ paddingLeft: 38 }}
              placeholder="Übung suchen…"
              aria-label="Übung suchen"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="button"
            className="btn btn-block"
            onClick={() => setCreating(true)}
            style={{ marginBottom: 6 }}
          >
            <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden />
            Eigene Übung
          </button>

          {recent.length > 0 && (
            <>
              <div className="picker-group-label">Zuletzt genutzt</div>
              {recent.map((d) => (
                <PickerRow key={`r-${d.id}`} def={d} onPick={pick} />
              ))}
            </>
          )}

          {PATTERNS.map((p) => {
            const items = grouped.get(p)
            if (!items || items.length === 0) return null
            return (
              <div key={p}>
                <div className="picker-group-label">{PATTERN_LABEL[p]}</div>
                {items.map((d) => (
                  <PickerRow key={d.id} def={d} onPick={pick} />
                ))}
              </div>
            )
          })}
        </>
      )}
    </BottomSheet>
  )
}

function PickerRow({
  def,
  onPick,
}: {
  def: ExerciseDef
  onPick: (id: string) => void
}) {
  return (
    <button type="button" className="picker-item" onClick={() => onPick(def.id)}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="picker-item-name">{def.name}</div>
        <div className="picker-item-meta">
          {EQUIPMENT_LABEL[def.equipment]} · {def.defaultRepRange.min}–
          {def.defaultRepRange.max} Wdh.
        </div>
      </div>
      <Plus size={18} strokeWidth={ICON_STROKE} aria-hidden style={{ color: 'var(--text-faint)' }} />
    </button>
  )
}

/** Smallest honest load increment by equipment (mirrors the built-in table). */
function incrementFor(equipment: Equipment): number {
  switch (equipment) {
    case 'barbell':
    case 'machine':
    case 'cable':
      return 2.5
    case 'dumbbell':
      return 2
    case 'kettlebell':
      return 4
    default:
      return 0
  }
}

function CustomExerciseForm({
  onCreate,
  onCancel,
}: {
  onCreate: (def: ExerciseDef) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState<ExercisePattern>('push')
  const [equipment, setEquipment] = useState<Equipment>('barbell')
  const [repMin, setRepMin] = useState(8)
  const [repMax, setRepMax] = useState(12)

  const canSave = name.trim().length > 0 && repMin >= 1 && repMax >= repMin

  const save = () => {
    if (!canSave) return
    const slug = normalize(name.trim())
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const loadType = equipment === 'bodyweight' ? 'bodyweight' : 'external'
    const def: ExerciseDef = {
      id: `custom-${slug || Date.now()}`,
      name: name.trim(),
      category: 'strength',
      pattern,
      primaryMuscles: [],
      secondaryMuscles: [],
      equipment,
      loadType,
      sizeClass: 'medium',
      defaultRepRange: { min: repMin, max: repMax },
      incrementKg: incrementFor(equipment),
    }
    onCreate(def)
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <label className="field-label" htmlFor="ex-name">Name</label>
        <input
          id="ex-name"
          className="input"
          placeholder="z. B. Landmine-Press"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
        />
      </div>

      <div>
        <span className="field-label">Bewegungsmuster</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {PATTERNS.filter((p) => p !== 'cardio').map((p) => (
            <button
              key={p}
              type="button"
              className="chip"
              data-active={pattern === p}
              onClick={() => setPattern(p)}
            >
              {PATTERN_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Gerät</span>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {EQUIPMENTS.map((e) => (
            <button
              key={e}
              type="button"
              className="chip"
              data-active={equipment === e}
              onClick={() => setEquipment(e)}
            >
              {EQUIPMENT_LABEL[e]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="field-label">Wiederholungsbereich</span>
        <div className="row" style={{ gap: 10 }}>
          <input
            className="input"
            type="number"
            min={1}
            max={50}
            value={repMin}
            aria-label="Wdh. Minimum"
            onChange={(e) => setRepMin(Number(e.target.value))}
            style={{ width: 90 }}
          />
          <span className="muted">bis</span>
          <input
            className="input"
            type="number"
            min={1}
            max={50}
            value={repMax}
            aria-label="Wdh. Maximum"
            onChange={(e) => setRepMax(Number(e.target.value))}
            style={{ width: 90 }}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={onCancel}>
          Abbrechen
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={save}
          disabled={!canSave}
        >
          Anlegen
        </button>
      </div>
    </div>
  )
}
