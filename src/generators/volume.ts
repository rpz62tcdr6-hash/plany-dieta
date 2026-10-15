import type { Exercise, Level, Pattern, PlanDay, PlanExercise, TrainingGoal } from '../types'

/** Partie, dla których liczymy tygodniową objętość */
export const MAIN_MUSCLES = ['Klatka', 'Plecy', 'Barki', 'Czworogłowe', 'Dwugłowe uda', 'Pośladki'] as const
export const SMALL_MUSCLES = ['Biceps', 'Triceps', 'Łydki', 'Brzuch'] as const
export type VolumeMuscle = (typeof MAIN_MUSCLES)[number] | (typeof SMALL_MUSCLES)[number]
export const ALL_MUSCLES: VolumeMuscle[] = [...MAIN_MUSCLES, ...SMALL_MUSCLES]

/**
 * Ile „serii” dostaje partia z jednej serii ćwiczenia danego wzorca.
 * Mięśnie pomocnicze liczone jako 0,5 serii – częsta praktyka w badaniach nad objętością.
 */
export const PATTERN_MUSCLES: Record<Pattern, Partial<Record<VolumeMuscle, number>>> = {
  squat: { Czworogłowe: 1, Pośladki: 0.5 },
  hinge: { 'Dwugłowe uda': 1, Pośladki: 0.5 },
  lunge: { Czworogłowe: 1, Pośladki: 0.5 },
  'push-h': { Klatka: 1, Triceps: 0.5 },
  'push-v': { Barki: 1, Triceps: 0.5 },
  'pull-h': { Plecy: 1, Biceps: 0.5 },
  'pull-v': { Plecy: 1, Biceps: 0.5 },
  'chest-iso': { Klatka: 1 },
  'side-delt': { Barki: 1 },
  'rear-delt': { Barki: 1 },
  biceps: { Biceps: 1 },
  triceps: { Triceps: 1 },
  glute: { Pośladki: 1 },
  quads: { Czworogłowe: 1 },
  hamstrings: { 'Dwugłowe uda': 1 },
  calves: { Łydki: 1 },
  core: { Brzuch: 1 },
  cardio: {},
}

/**
 * Zalecana liczba serii tygodniowo na partię (serie wykonywane blisko upadku mięśniowego, RIR 0–3).
 * Punkt wyjścia: ≥10 serii/tydz. daje większy przyrost masy niż <5 (Schoenfeld i wsp. 2017),
 * początkujący dobrze reagują na mniejszą objętość (ACSM 2009), a do utrzymania masy
 * wystarcza ok. 1/3 objętości przy zachowanej intensywności (Bickel i wsp. 2011, Spiering i wsp. 2021).
 */
const BASE: Record<Level, { main: [number, number]; small: [number, number] }> = {
  poczatkujacy: { main: [6, 10], small: [3, 8] },
  sredni: { main: [10, 16], small: [6, 12] },
  zaawansowany: { main: [12, 20], small: [8, 16] },
}

const GOAL_FACTOR: Record<TrainingGoal, number> = { masa: 1, redukcja: 0.85, sila: 0.8, kondycja: 0.6 }

export function volumeTarget(muscle: VolumeMuscle, goal: TrainingGoal, level: Level): [number, number] {
  const [lo, hi] = (SMALL_MUSCLES as readonly string[]).includes(muscle) ? BASE[level].small : BASE[level].main
  const f = GOAL_FACTOR[goal]
  return [Math.max(2, Math.round(lo * f)), Math.max(4, Math.round(hi * f))]
}

export function exerciseMuscles(ex: Exercise | undefined): Partial<Record<VolumeMuscle, number>> {
  return ex?.pattern ? PATTERN_MUSCLES[ex.pattern] : {}
}

/** Tygodniowa liczba serii na partię i liczba dni, w których partia pracuje (także jako pomocnicza) */
export function weeklyVolume(days: PlanDay[], exercises: Exercise[]) {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const sets = Object.fromEntries(ALL_MUSCLES.map((m) => [m, 0])) as Record<VolumeMuscle, number>
  const freq = Object.fromEntries(ALL_MUSCLES.map((m) => [m, 0])) as Record<VolumeMuscle, number>
  for (const day of days) {
    const hit = new Set<VolumeMuscle>()
    for (const pe of day.exercises) {
      for (const [m, k] of Object.entries(exerciseMuscles(byId.get(pe.exerciseId))) as [VolumeMuscle, number][]) {
        sets[m] += pe.sets * k
        if (pe.sets > 0) hit.add(m)
      }
    }
    hit.forEach((m) => freq[m]++)
  }
  return { sets, freq }
}

/** Zamienia zapis przerwy („90 s”, „2 min”, „60–90 s”) na sekundy */
export function restSeconds(rest: string): number {
  const nums = (rest.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
  if (nums.length === 0) return 60
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  return /min/i.test(rest) ? avg * 60 : avg
}

/** Szacowany czas treningu w minutach: rozgrzewka + (praca + przerwa) × serie */
export function estimateMinutes(items: PlanExercise[], exercises: Exercise[]): number {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  let seconds = 8 * 60 // rozgrzewka
  for (const pe of items) {
    const ex = byId.get(pe.exerciseId)
    if (ex?.pattern === 'cardio') {
      seconds += (Number(pe.reps.match(/\d+/)?.[0]) || 15) * 60
      continue
    }
    const work = ex?.compound ? 50 : 40
    seconds += pe.sets * work + Math.max(0, pe.sets - 1) * restSeconds(pe.rest) + 60 // +1 min na przejście
  }
  return Math.round(seconds / 60)
}
