import type { Client, Food, Goal, Macros } from './types'

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Siedzący tryb życia, brak treningów' },
  { value: 1.375, label: 'Niska aktywność (1–3 treningi/tydz.)' },
  { value: 1.55, label: 'Umiarkowana (3–5 treningów/tydz.)' },
  { value: 1.725, label: 'Wysoka (6–7 treningów/tydz.)' },
  { value: 1.9, label: 'Bardzo wysoka (praca fizyczna + treningi)' },
]

export const GOALS: Record<Goal, { label: string; factor: number }> = {
  // Redukcja ok. −15–20% (tempo 0,5–1% masy ciała/tydz. – Helms i wsp. 2014),
  // masa ok. +10% (przyrost 0,25–0,5% masy ciała/tydz. – Iraki i wsp. 2019)
  redukcja: { label: 'Redukcja', factor: 0.82 },
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

/**
 * Białko w g/kg masy ciała wg celu:
 * - ISSN (Jäger i wsp. 2017): 1,4–2,0 g/kg dla osób aktywnych,
 * - Morton i wsp. 2018 (metaanaliza): korzyść dla masy mięśniowej rośnie do ok. 1,6 g/kg (górna granica ufności 2,2),
 * - na redukcji wyższe spożycie chroni masę mięśniową (Helms i wsp. 2014: 2,3–3,1 g/kg beztłuszczowej masy ciała).
 */
export const PROTEIN_PER_KG: Record<Goal, number> = { redukcja: 2.2, utrzymanie: 1.6, masa: 1.8 }

/** Tłuszcze: 25% energii, nie mniej niż 20% (zakres referencyjny EFSA 20–35%) */
export const FAT_SHARE = 0.25

/** Proponowany rozkład makroskładników dla danej kaloryczności (w gramach) */
export function macroTargets(c: Client, kcal: number): Macros {
  const protein = Math.round(c.weightKg * PROTEIN_PER_KG[c.goal])
  const fat = Math.round((kcal * FAT_SHARE) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { kcal, protein, carbs, fat }
}

/** Aktualny cel podopiecznego: makro ustawione przez trenera albo wyliczone ze wzoru */
export function effectiveTarget(c: Client): Macros | null {
  if (c.target && c.target.kcal > 0) return c.target
  const kcal = targetKcal(c)
  return kcal === null ? null : macroTargets(c, kcal)
}

/** Kalorie wynikające z makro: 4 kcal/g białka i węglowodanów, 9 kcal/g tłuszczu */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9)
}

/** Automatyczna nazwa „Dieta 1800 kcal” podąża za zmianą kalorii; własnych nazw nie ruszamy */
export function dietNameFor(name: string, kcal: number): string {
  return /^Dieta \d+ kcal$/.test(name) ? `Dieta ${Math.round(kcal)} kcal` : name
}

/** Uwagi, gdy makro wychodzi poza zalecenia */
export function macroWarnings(m: Macros, weightKg: number): string[] {
  const out: string[] = []
  if (weightKg > 0 && m.protein > 0) {
    const perKg = m.protein / weightKg
    if (perKg < 1.4) out.push(`Białko ${fmt(perKg, 1)} g/kg – poniżej zaleceń dla osób aktywnych (1,4–2,2 g/kg).`)
    if (perKg > 3) out.push(`Białko ${fmt(perKg, 1)} g/kg – bardzo wysoko; zwykle nie ma korzyści powyżej ok. 2,2–3 g/kg.`)
  }
  if (m.kcal > 0 && m.fat > 0 && (m.fat * 9) / m.kcal < 0.2)
    out.push(`Tłuszcze ${Math.round(((m.fat * 9) / m.kcal) * 100)}% energii – poniżej zalecanych 20% (EFSA).`)
  if (weightKg > 0 && m.fat > 0 && m.fat / weightKg < 0.5)
    out.push('Tłuszcze poniżej 0,5 g/kg – ryzyko niedoborów i zaburzeń hormonalnych.')
  return out
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
