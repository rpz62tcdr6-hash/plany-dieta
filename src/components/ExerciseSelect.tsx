import { MUSCLE_GROUPS } from '../data/exercises'
import type { Exercise } from '../types'

interface Props {
  exercises: Exercise[]
  value: string
  onChange: (id: string) => void
}

/** Lista ćwiczeń pogrupowana wg partii mięśniowych */
export function ExerciseSelect({ exercises, value, onChange }: Props) {
  const groups = [...new Set([...MUSCLE_GROUPS, ...exercises.map((e) => e.muscle)])]
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {!exercises.some((e) => e.id === value) && <option value={value}>(usunięte ćwiczenie)</option>}
      {groups.map((g) => {
        const items = exercises.filter((e) => e.muscle === g).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
        if (items.length === 0) return null
        return (
          <optgroup key={g} label={g}>
            {items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
