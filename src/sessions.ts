import { fmt } from './calc'
import type { PlanExercise, SetEntry, TrainingPlan, WorkoutSession } from './types'

export const today = () => new Date().toISOString().slice(0, 10)
export const shortDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`

export function daysAgo(date: string): number {
  const ms = new Date(today()).getTime() - new Date(date).getTime()
  return Math.round(ms / 86_400_000)
}

export function agoLabel(date: string): string {
  const d = daysAgo(date)
  if (d <= 0) return 'dziś'
  if (d === 1) return 'wczoraj'
  if (d >= 6 && d <= 8) return 'tydzień temu'
  if (d >= 13 && d <= 15) return '2 tyg. temu'
  return `${d} dni temu`
}

const filled = (s: SetEntry) => s.weight !== null || s.reps !== null

export function sortedSessions(plan: TrainingPlan): WorkoutSession[] {
  return [...(plan.sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date))
}

/** Ostatni zapisany wynik ćwiczenia (najpierw ta sama pozycja planu, a jeśli ją podmieniono – to samo ćwiczenie) */
export function previousFor(
  plan: TrainingPlan,
  pe: PlanExercise,
  before?: string,
): { date: string; sets: SetEntry[] } | null {
  for (const s of sortedSessions(plan)) {
    if (before && s.date >= before) continue
    const ex =
      s.exercises.find((x) => x.planExerciseId === pe.id && x.exerciseId === pe.exerciseId) ??
      s.exercises.find((x) => x.exerciseId === pe.exerciseId)
    if (ex && ex.sets.some(filled)) return { date: s.date, sets: ex.sets.filter(filled) }
  }
  return null
}

export function formatSet(s: SetEntry, cardio = false): string {
  if (cardio) return s.reps !== null ? `${s.reps} min` : '—'
  const w = s.weight !== null ? `${fmt(s.weight, s.weight % 1 ? 1 : 0)} kg` : 'm.c.'
  return s.reps !== null ? `${w} × ${s.reps}` : w
}

export function formatSets(sets: SetEntry[], cardio = false): string {
  return sets.map((s) => formatSet(s, cardio)).join(' · ')
}

/** Najcięższa seria – do porównania postępu */
export function topSet(sets: SetEntry[]): SetEntry | null {
  return sets.reduce<SetEntry | null>((best, s) => {
    if (!best) return s
    const bw = best.weight ?? 0
    const sw = s.weight ?? 0
    return sw > bw || (sw === bw && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best
  }, null)
}

/** Objętość treningu: suma ciężar × powtórzenia */
export function sessionTonnage(s: WorkoutSession): number {
  return s.exercises.reduce((sum, e) => sum + e.sets.reduce((a, x) => a + (x.weight ?? 0) * (x.reps ?? 0), 0), 0)
}

/** Poniedziałek bieżącego tygodnia (RRRR-MM-DD) */
export function weekStart(): string {
  const d = new Date(today())
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

/** Wszystkie zapisane treningi z planów, od najnowszego */
export function allSessions(plans: TrainingPlan[]) {
  return plans
    .flatMap((p) => (p.sessions ?? []).map((s) => ({ plan: p, session: s, day: p.days.find((d) => d.id === s.dayId) })))
    .sort((a, b) => b.session.date.localeCompare(a.session.date))
}

/** Trening, który najdawniej (albo jeszcze nigdy) nie był robiony – propozycja „na dziś” */
export function nextDay(plan: TrainingPlan) {
  const last = (dayId: string) => sortedSessions(plan).find((s) => s.dayId === dayId)?.date ?? ''
  return [...plan.days].filter((d) => d.exercises.length > 0).sort((a, b) => last(a.id).localeCompare(last(b.id)))[0]
}
