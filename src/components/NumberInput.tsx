interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  step?: number
  className?: string
}

/** Pole liczbowe: puste pole = 0, przecinek działa jak kropka */
export function NumberInput({ value, onChange, min = 0, step = 1, className }: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      min={min}
      step={step}
      value={value || ''}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value.replace(',', '.')) || 0))}
    />
  )
}
