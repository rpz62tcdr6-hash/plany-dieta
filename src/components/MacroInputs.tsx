import { fmt } from '../calc'
import type { Macros } from '../types'
import { NumberInput } from './NumberInput'

/** Pola kcal + B/W/T, z podpowiedzią ile kcal wynika z wpisanego makro */
export function MacroInputs({ value, onChange }: { value: Macros; onChange: (m: Macros) => void }) {
  const fromMacros = value.protein * 4 + value.carbs * 4 + value.fat * 9
  const diff = value.kcal > 0 && fromMacros > 0 ? Math.abs(fromMacros - value.kcal) / value.kcal : 0
  return (
    <div>
      <div className="macro-inputs">
        <label className="macro-input kcal">
          <span>Kalorie</span>
          <NumberInput step={10} value={value.kcal} onChange={(kcal) => onChange({ ...value, kcal })} />
          <small>kcal</small>
        </label>
        <label className="macro-input">
          <span>Białko</span>
          <NumberInput value={value.protein} onChange={(protein) => onChange({ ...value, protein })} />
          <small>g</small>
        </label>
        <label className="macro-input">
          <span>Węglowodany</span>
          <NumberInput value={value.carbs} onChange={(carbs) => onChange({ ...value, carbs })} />
          <small>g</small>
        </label>
        <label className="macro-input">
          <span>Tłuszcze</span>
          <NumberInput value={value.fat} onChange={(fat) => onChange({ ...value, fat })} />
          <small>g</small>
        </label>
      </div>
      {fromMacros > 0 && (
        <p className={`small ${diff > 0.05 ? 'warn-text' : 'muted'}`}>
          Z makro wychodzi {fmt(fromMacros)} kcal
          {diff > 0.05 && (
            <>
              {' '}
              – to inaczej niż wpisane {fmt(value.kcal)} kcal.{' '}
              <button type="button" className="link" onClick={() => onChange({ ...value, kcal: Math.round(fromMacros) })}>
                Ustaw {fmt(fromMacros)} kcal
              </button>
            </>
          )}
        </p>
      )}
    </div>
  )
}
