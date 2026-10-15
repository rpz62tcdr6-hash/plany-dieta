import type { Food } from '../types'

interface Props {
  foods: Food[]
  value: string
  onChange: (id: string) => void
}

export function FoodSelect({ foods, value, onChange }: Props) {
  const sorted = [...foods].sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {!foods.some((f) => f.id === value) && <option value={value}>(usunięty produkt)</option>}
      {sorted.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  )
}
