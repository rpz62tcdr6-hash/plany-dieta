import { fmt } from '../calc'
import type { Macros } from '../types'

const rows: { key: keyof Macros; label: string; unit: string }[] = [
  { key: 'kcal', label: 'Kalorie', unit: 'kcal' },
  { key: 'protein', label: 'Białko', unit: 'g' },
  { key: 'carbs', label: 'Węglowodany', unit: 'g' },
  { key: 'fat', label: 'Tłuszcze', unit: 'g' },
]

/** Porównanie sumy z dnia z celem – pasek postępu i różnica dla każdego makroskładnika */
export function MacroSummary({ total, target }: { total: Macros; target: Macros }) {
  return (
    <div className="macro-summary">
      {rows.map(({ key, label, unit }) => {
        const value = total[key]
        const goal = target[key]
        const pct = goal > 0 ? (value / goal) * 100 : 0
        const status = goal === 0 ? '' : pct > 105 ? 'over' : pct >= 95 ? 'ok' : 'under'
        const diff = value - goal
        return (
          <div key={key} className={`macro ${status}`}>
            <span className="macro-label">{label}</span>
            <strong>
              {fmt(value)}
              {goal > 0 && <span className="muted"> / {fmt(goal)}</span>} <small>{unit}</small>
            </strong>
            {goal > 0 && (
              <>
                <div className="bar">
                  <div style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <span className="macro-status">
                  {status === 'ok' ? '✓ w celu' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} ${unit}`}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
