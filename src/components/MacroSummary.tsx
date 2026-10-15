import { fmt } from '../calc'
import type { Macros } from '../types'

const rows: { key: keyof Macros; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Kalorie', unit: 'kcal' },
  { key: 'protein', label: 'Białko', unit: 'g' },
  { key: 'carbs', label: 'Węglowodany', unit: 'g' },
  { key: 'fat', label: 'Tłuszcze', unit: 'g' },
]

/** Porównanie sumy z dnia z celem – pasek postępu dla każdego makroskładnika */
export function MacroSummary({ total, target }: { total: Macros; target: Macros | null }) {
  return (
    <div className="macro-summary">
      {rows.map(({ key, label, unit }) => {
        const value = total[key]
        const goal = target?.[key] ?? 0
        const pct = goal > 0 ? (value / goal) * 100 : 0
        const status = goal === 0 ? '' : pct > 105 ? 'over' : pct >= 95 ? 'ok' : 'under'
        return (
          <div key={key} className={`macro ${status}`}>
            <span className="muted small">{label}</span>
            <strong>
              {fmt(value)}
              {goal > 0 && <span className="muted"> / {fmt(goal)}</span>} {unit}
            </strong>
            {goal > 0 && (
              <div className="bar">
                <div style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
