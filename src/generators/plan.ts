import { newId } from '../store'
import type { Equipment, Exercise, Joint, Pattern, PlanDay, PlanExercise } from '../types'

export type TrainingGoal = 'sila' | 'masa' | 'redukcja' | 'kondycja'
export type Level = 'poczatkujacy' | 'sredni' | 'zaawansowany'
export type EquipmentSet = 'silownia' | 'dom' | 'masa'
export type Priority = 'Pośladki' | 'Nogi' | 'Plecy' | 'Klatka' | 'Barki' | 'Ręce' | 'Brzuch'

export interface PlanParams {
  goal: TrainingGoal
  level: Level
  daysPerWeek: number
  minutes: number
  equipment: EquipmentSet
  injuries: Joint[]
  priorities: Priority[]
  notes: string
}

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  sila: 'Siła',
  masa: 'Budowa masy mięśniowej',
  redukcja: 'Redukcja tkanki tłuszczowej',
  kondycja: 'Kondycja i ogólna sprawność',
}

const GOAL_SHORT: Record<TrainingGoal, string> = { sila: 'siła', masa: 'masa', redukcja: 'redukcja', kondycja: 'kondycja' }

export const LEVEL_LABELS: Record<Level, string> = {
  poczatkujacy: 'Początkujący (do 6 mies.)',
  sredni: 'Średniozaawansowany',
  zaawansowany: 'Zaawansowany (2+ lata)',
}

export const EQUIPMENT_SET_LABELS: Record<EquipmentSet, string> = {
  silownia: 'Pełna siłownia',
  dom: 'Dom: hantle, kettlebell, gumy',
  masa: 'Tylko masa ciała + gumy',
}

const ALLOWED: Record<EquipmentSet, Equipment[]> = {
  silownia: ['sztanga', 'hantle', 'maszyna', 'wyciąg', 'masa ciała', 'kettlebell', 'guma'],
  dom: ['hantle', 'masa ciała', 'kettlebell', 'guma'],
  masa: ['masa ciała', 'guma'],
}

export const PRIORITY_PATTERNS: Record<Priority, Pattern[]> = {
  Pośladki: ['glute', 'hinge', 'lunge'],
  Nogi: ['squat', 'quads', 'hamstrings', 'lunge'],
  Plecy: ['pull-v', 'pull-h', 'rear-delt'],
  Klatka: ['push-h', 'chest-iso'],
  Barki: ['side-delt', 'push-v', 'rear-delt'],
  Ręce: ['biceps', 'triceps'],
  Brzuch: ['core'],
}

// Kolejność slotów = priorytet. Przy krótszym treningu odcinane są ostatnie.
const DAY_TEMPLATES: Record<string, { name: string; slots: Pattern[] }> = {
  fbwA: { name: 'FBW A', slots: ['squat', 'push-h', 'pull-v', 'hinge', 'push-v', 'core', 'biceps', 'triceps'] },
  fbwB: { name: 'FBW B', slots: ['hinge', 'push-v', 'pull-h', 'lunge', 'push-h', 'core', 'side-delt', 'calves'] },
  fbwC: { name: 'FBW C', slots: ['lunge', 'push-h', 'pull-h', 'squat', 'pull-v', 'core', 'rear-delt', 'triceps'] },
  upperA: {
    name: 'Góra A',
    slots: ['push-h', 'pull-h', 'push-v', 'pull-v', 'side-delt', 'biceps', 'triceps', 'rear-delt'],
  },
  upperB: {
    name: 'Góra B',
    slots: ['pull-v', 'push-h', 'pull-h', 'push-v', 'chest-iso', 'rear-delt', 'biceps', 'triceps'],
  },
  lowerA: { name: 'Dół A', slots: ['squat', 'hinge', 'lunge', 'hamstrings', 'calves', 'core', 'glute', 'quads'] },
  lowerB: { name: 'Dół B', slots: ['hinge', 'squat', 'glute', 'quads', 'hamstrings', 'core', 'calves', 'lunge'] },
  push: {
    name: 'Push (klatka, barki, triceps)',
    slots: ['push-h', 'push-v', 'push-h', 'chest-iso', 'side-delt', 'triceps', 'triceps', 'core'],
  },
  pull: {
    name: 'Pull (plecy, biceps)',
    slots: ['pull-v', 'pull-h', 'pull-h', 'rear-delt', 'biceps', 'biceps', 'core', 'pull-v'],
  },
  legs: { name: 'Nogi', slots: ['squat', 'hinge', 'lunge', 'quads', 'hamstrings', 'glute', 'calves', 'core'] },
}

const SPLITS: Record<number, { name: string; days: string[] }> = {
  2: { name: 'FBW', days: ['fbwA', 'fbwB'] },
  3: { name: 'FBW', days: ['fbwA', 'fbwB', 'fbwC'] },
  4: { name: 'Góra/Dół', days: ['upperA', 'lowerA', 'upperB', 'lowerB'] },
  5: { name: 'Góra/Dół + PPL', days: ['upperA', 'lowerA', 'push', 'pull', 'legs'] },
  6: { name: 'Push/Pull/Nogi', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
}

function exerciseCount(params: PlanParams): number {
  const base = params.minutes <= 45 ? 5 : params.minutes <= 60 ? 6 : params.minutes <= 75 ? 7 : 8
  return Math.max(4, base - (params.level === 'poczatkujacy' ? 1 : 0))
}

interface Scheme {
  sets: number
  reps: string
  rest: string
  notes: string
}

function scheme(params: PlanParams, ex: Exercise): Scheme {
  if (ex.pattern === 'cardio') {
    return params.goal === 'kondycja'
      ? { sets: 1, reps: '15 min', rest: '—', notes: 'Interwały: 30 s mocno / 60 s spokojnie' }
      : { sets: 1, reps: '20 min', rest: '—', notes: 'Tempo umiarkowane, tętno ok. 60–70% HRmax' }
  }
  const timed = /plank/i.test(ex.name)
  if (ex.pattern === 'core') {
    return { sets: 3, reps: timed ? '30–45 s' : '12–15', rest: '45 s', notes: '' }
  }
  const compound = !!ex.compound
  const table: Record<TrainingGoal, [Scheme, Scheme]> = {
    sila: [
      { sets: 4, reps: '3–5', rest: '3 min', notes: 'RIR 2' },
      { sets: 3, reps: '8–10', rest: '90 s', notes: '' },
    ],
    masa: [
      { sets: 4, reps: '6–10', rest: '2 min', notes: 'RIR 1–2' },
      { sets: 3, reps: '10–15', rest: '60–90 s', notes: '' },
    ],
    redukcja: [
      { sets: 3, reps: '8–12', rest: '90 s', notes: 'RIR 2' },
      { sets: 3, reps: '12–15', rest: '60 s', notes: '' },
    ],
    kondycja: [
      { sets: 3, reps: '10–15', rest: '60 s', notes: '' },
      { sets: 2, reps: '15–20', rest: '45 s', notes: '' },
    ],
  }
  const s = { ...table[params.goal][compound ? 0 : 1] }
  if (params.level === 'poczatkujacy') {
    s.sets = Math.max(2, s.sets - 1)
    if (compound) s.notes = 'Najpierw technika – RIR 3'
  }
  if (params.level === 'zaawansowany' && compound) s.sets += 1
  return s
}

function shuffleScore(ex: Exercise, params: PlanParams, usedInPlan: Set<string>): number {
  let score = Math.random()
  if (usedInPlan.has(ex.id)) score -= 1
  if (params.level === 'poczatkujacy' && ex.equipment === 'sztanga') score -= 0.3
  if (params.level === 'poczatkujacy' && (ex.equipment === 'maszyna' || ex.equipment === 'wyciąg')) score += 0.2
  if (params.goal === 'sila' && ex.equipment === 'sztanga') score += 0.6
  // Na siłowni wolimy sprzęt siłowniany od gum i masy ciała, w domu – hantle od gum
  if (params.equipment === 'silownia' && ex.equipment === 'guma') score -= 0.8
  if (params.equipment === 'silownia' && ex.equipment === 'masa ciała' && ex.pattern !== 'pull-v' && ex.pattern !== 'core') score -= 0.4
  if (params.equipment === 'dom' && ex.equipment === 'guma') score -= 0.3
  return score
}

export function candidatesFor(pattern: Pattern, exercises: Exercise[], params: Pick<PlanParams, 'equipment' | 'injuries'>) {
  const allowed = ALLOWED[params.equipment]
  return exercises.filter(
    (e) =>
      e.pattern === pattern &&
      (!e.equipment || allowed.includes(e.equipment)) &&
      !(e.stress ?? []).some((j) => params.injuries.includes(j)),
  )
}

function slotsForDay(templateKey: string, params: PlanParams): Pattern[] {
  const template = DAY_TEMPLATES[templateKey].slots
  const slots = template.slice(0, exerciseCount(params))
  // Partie priorytetowe: dodatkowe ćwiczenie w dniach, które tę partię trenują
  for (const p of params.priorities) {
    const patterns = PRIORITY_PATTERNS[p]
    if (!template.some((s) => patterns.includes(s))) continue
    const extra = patterns.find((x) => !slots.includes(x)) ?? patterns[0]
    slots.splice(Math.min(2, slots.length), 0, extra)
  }
  if (params.goal === 'redukcja' || params.goal === 'kondycja') slots.push('cardio')
  return slots
}

export function generatePlan(params: PlanParams, exercises: Exercise[]): { name: string; notes: string; days: PlanDay[] } {
  const split = SPLITS[params.daysPerWeek] ?? SPLITS[3]
  const usedInPlan = new Set<string>()
  const counts: Record<string, number> = {}

  const days: PlanDay[] = split.days.map((key) => {
    counts[key] = (counts[key] ?? 0) + 1
    const usedInDay = new Set<string>()
    const items: PlanExercise[] = []
    for (const pattern of slotsForDay(key, params)) {
      const pool = candidatesFor(pattern, exercises, params).filter((e) => !usedInDay.has(e.id))
      if (pool.length === 0) continue
      const ex = pool
        .map((e) => ({ e, s: shuffleScore(e, params, usedInPlan) }))
        .sort((a, b) => b.s - a.s)[0].e
      usedInDay.add(ex.id)
      usedInPlan.add(ex.id)
      items.push({ id: newId(), exerciseId: ex.id, weight: '', ...scheme(params, ex) })
    }
    // Ćwiczenia wielostawowe na początek, cardio na koniec
    const rank = (pe: PlanExercise) => {
      const ex = exercises.find((e) => e.id === pe.exerciseId)
      return ex?.pattern === 'cardio' ? 2 : ex?.compound ? 0 : 1
    }
    items.sort((a, b) => rank(a) - rank(b))
    const name = DAY_TEMPLATES[key].name + (counts[key] > 1 ? ' (2)' : '')
    return { id: newId(), name, exercises: items }
  })

  const lines = [
    `Cel: ${GOAL_LABELS[params.goal]} · Poziom: ${LEVEL_LABELS[params.level]}`,
    `${params.daysPerWeek} treningi/tydz. (${split.name}) · ok. ${params.minutes} min · ${EQUIPMENT_SET_LABELS[params.equipment]}`,
  ]
  if (params.injuries.length) lines.push(`Ograniczenia: ${params.injuries.join(', ')} – pominięto ćwiczenia mocno obciążające`)
  if (params.priorities.length) lines.push(`Priorytet: ${params.priorities.join(', ')}`)
  lines.push(
    'Rozgrzewka: 5–10 min lekkiego cardio + 1–2 serie rozgrzewkowe przed pierwszym ćwiczeniem.',
    'Progresja: gdy we wszystkich seriach zrobisz górny zakres powtórzeń, zwiększ ciężar o 2,5–5%.',
  )
  if (params.notes.trim()) lines.push('', params.notes.trim())

  return {
    name: `${split.name} ${params.daysPerWeek}× – ${GOAL_SHORT[params.goal]}`,
    notes: lines.join('\n'),
    days,
  }
}

/** Losuje inne ćwiczenie o tym samym wzorcu ruchowym */
export function swapExercise(current: Exercise | undefined, exercises: Exercise[], exclude: string[]): Exercise | null {
  if (!current?.pattern) return null
  const pool = exercises.filter((e) => e.pattern === current.pattern && e.id !== current.id && !exclude.includes(e.id))
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
