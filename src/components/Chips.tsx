interface Option<T extends string | number> {
  value: T
  label: string
  hint?: string
}

interface SingleProps<T extends string | number> {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
}

/** Duże przyciski wyboru – czytelniejsze od listy rozwijanej, wygodne na telefonie */
export function ChoiceChips<T extends string | number>({ options, value, onChange }: SingleProps<T>) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          className={`chip ${o.value === value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  )
}

interface MultiProps<T extends string> {
  options: Option<T>[]
  value: T[]
  onChange: (v: T[]) => void
}

export function MultiChips<T extends string>({ options, value, onChange }: MultiProps<T>) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            type="button"
            key={o.value}
            aria-pressed={on}
            className={`chip ${on ? 'on' : ''}`}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
          >
            <span>
              {on ? '✓ ' : ''}
              {o.label}
            </span>
            {o.hint && <small>{o.hint}</small>}
          </button>
        )
      })}
    </div>
  )
}
