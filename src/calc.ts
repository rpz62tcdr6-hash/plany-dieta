import type { Client, Food, Goal, Macros } from './types'

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Siedzący tryb życia, brak treningów' },
  { value: 1.375, label: 'Niska aktywność (1–3 treningi/tydz.)' },
  { value: 1.55, label: 'Umiarkowana (3–5 treningów/tydz.)' },
  { value: 1.725, label: 'Wysoka (6–7 treningów/tydz.)' },
  { value: 1.9, label: 'Bardzo wysoka (praca fizyczna + treningi)' },
]

export const GOALS: Record<Goal, { label: string; factor: number }> = {
  redukcja: { label: 'Redukcja', factor: 0.85 },
  utrzymanie: { label: 'Utrzymanie', factor: 1 },
  masa: { label: 'Budowa masy', factor: 1.1 },
}

function hasBodyData(c: Client): boolean {
  return c.age > 0 && c.heightCm > 0 && c.weightKg > 0
}

/** Podstawowa przemiana materii – wzór Mifflina-St Jeora */
export function bmr(c: Client): number | null {
  if (!hasBodyData(c)) return null
  const base = 10 * c.weightKg + 6.25 * c.heightCm - 5 * c.age
  return Math.round(base + (c.sex === 'M' ? 5 : -161))
}

/** Całkowita przemiana materii */
export function tdee(c: Client): number | null {
  const b = bmr(c)
  return b === null ? null : Math.round(b * c.activity)
}

/** Kaloryczność docelowa wg celu, zaokrąglona do 10 kcal */
export function targetKcal(c: Client): number | null {
  const t = tdee(c)
  return t === null ? null : Math.round((t * GOALS[c.goal].factor) / 10) * 10
}

/** Proponowany rozkład makroskładników dla danej kaloryczności (w gramach) */
export function macroTargets(c: Client, kcal: number): Macros {
  const protein = Math.round(c.weightKg * (c.goal === 'redukcja' ? 2 : 1.8))
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

export function foodMacros(food: Food | undefined, grams: number): Macros {
  if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const f = grams / 100
  return { kcal: food.kcal * f, protein: food.protein * f, carbs: food.carbs * f, fat: food.fat * f }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString('pl-PL', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL')
}
