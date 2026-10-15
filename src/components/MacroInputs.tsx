import { fmt, kcalFromMacros, macroWarnings } from '../calc'
import type { Macros } from '../types'
import { NumberInput } from './NumberInput'

/** Pola kcal + B/W/T, z podpowiedzią ile kcal wynika z wpisanego makro */
export function MacroInputs({
  value,
  onChange,
  weightKg = 0,
}: {
  value: Macros
  onChange: (m: Macros) => void
  weightKg?: number
}) {
  const warnings = macroWarnings(value, weightKg)
  const hasMacros = value.protein > 0 || value.carbs > 0 || value.fat > 0
  // Zmiana makro → kalorie przeliczają się same
  const setMacro = (patch: Partial<Macros>) => {
    const next = { ...value, ...patch }
    onChange({ ...next, kcal: kcalFromMacros(next) })
  }
  // Zmiana kalorii → białko i tłuszcze zostają, dopasowują się węglowodany
  const setKcal = (kcal: number) => {
    if (!hasMacros) return onChange({ ...value, kcal })
    const carbs = Math.max(0, Math.round((kcal - value.protein * 4 - value.fat * 9) / 4))
    onChange({ ...value, kcal, carbs })
  }
  return (
    <div>
      <div className="macro-inputs">
        <label className="macro-input kcal">
          <span>Kalorie</span>
          <NumberInput step={10} value={value.kcal} onChange={setKcal} />
          <small>kcal</small>
        </label>
        <label className="macro-input">
          <span>Białko</span>
          <NumberInput value={value.protein} onChange={(protein) => setMacro({ protein })} />
          <small>g</small>
        </label>
        <label className="macro-input">
          <span>Węglowodany</span>
          <NumberInput value={value.carbs} onChange={(carbs) => setMacro({ carbs })} />
          <small>g</small>
        </label>
        <label className="macro-input">
          <span>Tłuszcze</span>
          <NumberInput value={value.fat} onChange={(fat) => setMacro({ fat })} />
          <small>g</small>
        </label>
      </div>
      {hasMacros && (
        <p className="muted small">
          Kalorie liczą się z makro (B i W × 4 kcal, T × 9 kcal). Zmiana kalorii dopasowuje węglowodany.
        </p>
      )}
      {weightKg > 0 && value.protein > 0 && (
        <p className="muted small">
          Białko: {fmt(value.protein / weightKg, 1)} g/kg masy ciała · Tłuszcze:{' '}
          {value.kcal > 0 ? Math.round(((value.fat * 9) / value.kcal) * 100) : 0}% energii
        </p>
      )}
      {warnings.map((w) => (
        <p key={w} className="small warn-text">
          ⚠ {w}
        </p>
      ))}
    </div>
  )
}
