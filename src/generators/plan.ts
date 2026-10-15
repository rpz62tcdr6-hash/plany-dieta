import { newId } from '../store'
import { ALL_MUSCLES, PATTERN_MUSCLES, estimateMinutes, volumeTarget, weeklyVolume, type VolumeMuscle } from './volume'
import type { Equipment, Exercise, Joint, Level, Pattern, PlanDay, PlanExercise, TrainingGoal } from '../types'

export type { Level, TrainingGoal }

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
  const cardio = params.goal === 'redukcja' || params.goal === 'kondycja' ? 1 : 0
  return Math.max(4, base - (params.level === 'poczatkujacy' ? 1 : 0) - cardio)
}

interface Scheme {
  sets: number
  reps: string
  rest: string
  notes: string
}

/**
 * Serie / powtórzenia / przerwy wg celu:
 * - siła: ciężary >80% 1RM, 3–5 powt., przerwy 3 min (ACSM 2009; Schoenfeld i wsp. 2016),
 * - masa i redukcja: 6–10 powt. w wielostawowych, 10–15 w izolowanych – przy pracy blisko upadku
 *   hipertrofia jest podobna w szerokim zakresie ciężarów (Schoenfeld i wsp. 2017),
 *   w redukcji utrzymujemy intensywność, żeby chronić masę mięśniową,
 * - kondycja: 8–15 powt., 2 serie (ACSM 2009, zalecenia zdrowotne).
 * Liczba serii jest potem korygowana przez balanceVolume().
 */
function scheme(params: PlanParams, ex: Exercise): Scheme {
  if (ex.pattern === 'cardio') {
    return params.goal === 'kondycja'
      ? { sets: 1, reps: '15 min', rest: '—', notes: 'Interwały: 30 s mocno / 60–90 s spokojnie' }
      : { sets: 1, reps: '15–20 min', rest: '—', notes: 'Umiarkowane tempo (da się mówić pełnymi zdaniami)' }
  }
  const timed = /plank|hollow|spacer/i.test(ex.name)
  if (ex.pattern === 'core') {
    return { sets: 2, reps: timed ? '30–45 s' : '10–15', rest: '60 s', notes: '' }
  }
  const compound = !!ex.compound
  const table: Record<TrainingGoal, [Scheme, Scheme]> = {
    sila: [
      { sets: 4, reps: '3–5', rest: '3 min', notes: 'RIR 1–3' },
      { sets: 2, reps: '8–12', rest: '90 s', notes: 'RIR 1–2' },
    ],
    masa: [
      { sets: 3, reps: '6–10', rest: '2–3 min', notes: 'RIR 1–3' },
      { sets: 2, reps: '10–15', rest: '60–90 s', notes: 'RIR 0–2' },
    ],
    redukcja: [
      { sets: 3, reps: '6–10', rest: '2 min', notes: 'RIR 1–3' },
      { sets: 2, reps: '10–15', rest: '60–90 s', notes: 'RIR 0–2' },
    ],
    kondycja: [
      { sets: 2, reps: '8–12', rest: '90 s', notes: 'RIR 2–3' },
      { sets: 2, reps: '12–15', rest: '60 s', notes: '' },
    ],
  }
  const s = { ...table[params.goal][compound ? 0 : 1] }
  if (params.level === 'poczatkujacy') {
    s.sets = Math.min(s.sets, 3)
    if (compound) {
      s.reps = params.goal === 'sila' ? '5–8' : '8–12'
      s.notes = 'Technika przede wszystkim – RIR 2–3'
    }
  }
  return s
}

/** Wzorzec, którym najprościej dobić objętość danej partii */
const FILL_PATTERN: Record<VolumeMuscle, Pattern> = {
  Klatka: 'push-h',
  Plecy: 'pull-h',
  Barki: 'side-delt',
  Czworogłowe: 'quads',
  'Dwugłowe uda': 'hamstrings',
  Pośladki: 'glute',
  Biceps: 'biceps',
  Triceps: 'triceps',
  Łydki: 'calves',
  Brzuch: 'core',
}

const primaryMuscles = (ex: Exercise | undefined): VolumeMuscle[] =>
  ex?.pattern
    ? (Object.entries(PATTERN_MUSCLES[ex.pattern]) as [VolumeMuscle, number][]).filter(([, k]) => k >= 1).map(([m]) => m)
    : []

/**
 * Dokłada lub odejmuje serie, żeby tygodniowa objętość każdej partii trafiła w zalecany zakres,
 * nie przekraczając czasu treningu. Zwraca partie, których nie dało się dociągnąć do minimum.
 */
function balanceVolume(days: PlanDay[], params: PlanParams, exercises: Exercise[]): VolumeMuscle[] {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const maxSets = params.level === 'poczatkujacy' ? 4 : 5
  const limit = params.minutes + 5
  const range = (m: VolumeMuscle) => volumeTarget(m, params.goal, params.level)
  const blocked = new Set<VolumeMuscle>()

  for (let iter = 0; iter < 400; iter++) {
    const { sets } = weeklyVolume(days, exercises)
    let worst: VolumeMuscle | null = null
    let gap = 0
    for (const m of ALL_MUSCLES) {
      const [lo] = range(m)
      const g = (lo - sets[m]) / lo
      if (!blocked.has(m) && g > gap) {
        gap = g
        worst = m
      }
    }
    if (!worst) break
    const candidates = days.flatMap((day) =>
      day.exercises
        .filter((pe) => pe.sets < maxSets && primaryMuscles(byId.get(pe.exerciseId)).includes(worst!))
        .map((pe) => ({ day, pe })),
    )
    candidates.sort((a, b) => a.pe.sets - b.pe.sets)
    const pick = candidates.find(({ day, pe }) => {
      pe.sets++
      const ok = estimateMinutes(day.exercises, exercises) <= limit
      pe.sets--
      return ok
    })
    if (pick) {
      pick.pe.sets++
      continue
    }
    // Brak ćwiczenia na tę partię albo wszystkie mają już max serii – dokładamy nowe ćwiczenie
    // do najkrótszego dnia, jeśli zmieści się w czasie
    const pattern = FILL_PATTERN[worst]
    const ordered = [...days].sort(
      (a, b) => estimateMinutes(a.exercises, exercises) - estimateMinutes(b.exercises, exercises),
    )
    let added = false
    for (const day of ordered) {
      const used = new Set(day.exercises.map((e) => e.exerciseId))
      const pool = candidatesFor(pattern, exercises, params).filter((e) => !used.has(e.id))
      if (pool.length === 0) continue
      const ex = pool.map((e) => ({ e, s: shuffleScore(e, params, new Set()) })).sort((a, b) => b.s - a.s)[0].e
      const item: PlanExercise = { id: newId(), exerciseId: ex.id, weight: '', ...scheme(params, ex) }
      // przed cardio, które zostaje na końcu
      const cardioAt = day.exercises.findIndex((e) => byId.get(e.exerciseId)?.pattern === 'cardio')
      const at = cardioAt === -1 ? day.exercises.length : cardioAt
      day.exercises.splice(at, 0, item)
      if (estimateMinutes(day.exercises, exercises) <= limit) {
        added = true
        break
      }
      day.exercises.splice(at, 1)
    }
    if (!added) blocked.add(worst)
  }

  for (let iter = 0; iter < 400; iter++) {
    const { sets } = weeklyVolume(days, exercises)
    const over = ALL_MUSCLES.find((m) => sets[m] > range(m)[1])
    if (!over) break
    const candidates = days
      .flatMap((day) => day.exercises)
      .filter((pe) => pe.sets > 2 && primaryMuscles(byId.get(pe.exerciseId)).includes(over))
      .sort((a, b) => b.sets - a.sets)
    if (candidates.length > 0) {
      candidates[0].sets--
      continue
    }
    // Nie da się zmniejszyć serii – usuwamy ćwiczenie izolowane, jeśli partia zostanie w zakresie
    const [lo] = range(over)
    let removed = false
    for (const day of days) {
      const idx = day.exercises.findIndex((pe) => {
        const ex = byId.get(pe.exerciseId)
        return !ex?.compound && primaryMuscles(ex).includes(over) && sets[over] - pe.sets >= lo
      })
      if (idx !== -1) {
        day.exercises.splice(idx, 1)
        removed = true
        break
      }
    }
    if (!removed) break
  }

  const { sets } = weeklyVolume(days, exercises)
  return ALL_MUSCLES.filter((m) => sets[m] < range(m)[0])
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

export function generatePlan(
  params: PlanParams,
  exercises: Exercise[],
): { name: string; notes: string; days: PlanDay[]; goal: TrainingGoal; level: Level } {
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

  const short = balanceVolume(days, params, exercises)
  const [mainLo, mainHi] = volumeTarget('Klatka', params.goal, params.level)

  const lines = [
    `Cel: ${GOAL_LABELS[params.goal]} · Poziom: ${LEVEL_LABELS[params.level]}`,
    `${params.daysPerWeek} treningi/tydz. (${split.name}) · ok. ${params.minutes} min · ${EQUIPMENT_SET_LABELS[params.equipment]}`,
  ]
  if (params.injuries.length) lines.push(`Ograniczenia: ${params.injuries.join(', ')} – pominięto ćwiczenia mocno obciążające`)
  if (params.priorities.length) lines.push(`Priorytet: ${params.priorities.join(', ')}`)
  lines.push(
    '',
    'Rozgrzewka: 5–10 min lekkiego cardio + 1–2 serie rozgrzewkowe przed pierwszym ćwiczeniem.',
    'Progresja: gdy we wszystkich seriach zrobisz górny zakres powtórzeń przy zadanym RIR, zwiększ ciężar o 2–10% (ACSM 2009).',
    'RIR = ile powtórzeń „zostaje w zapasie” do upadku mięśniowego.',
    '',
    'Zasady (na podstawie badań):',
    '• Każda partia trenowana min. 2× w tygodniu (Schoenfeld i wsp., Sports Med 2016).',
    `• Objętość: ${mainLo}–${mainHi} serii tygodniowo na dużą partię mięśniową (Schoenfeld i wsp., J Sports Sci 2017).`,
    '• Serie kończone blisko upadku (RIR 0–3) – kluczowe dla przyrostu masy (Refalo i wsp., Sports Med 2023).',
    '• Dłuższe przerwy (2–3 min) w ćwiczeniach wielostawowych sprzyjają sile i hipertrofii (Schoenfeld i wsp., JSCR 2016).',
  )
  if (params.goal === 'redukcja' || params.goal === 'kondycja')
    lines.push('• Aktywność tlenowa: łącznie 150–300 min tygodniowo umiarkowanego wysiłku, wliczając spacery (WHO 2020).')
  if (short.length)
    lines.push(
      '',
      `Uwaga: przy ${params.daysPerWeek} treningach po ${params.minutes} min nie da się osiągnąć zalecanej objętości dla: ${short.join(', ')}. Rozważ dłuższe lub częstsze treningi.`,
    )
  if (params.notes.trim()) lines.push('', params.notes.trim())

  return {
    name: `${split.name} ${params.daysPerWeek}× – ${GOAL_SHORT[params.goal]}`,
    notes: lines.join('\n'),
    days,
    goal: params.goal,
    level: params.level,
  }
}

/** Losuje inne ćwiczenie o tym samym wzorcu ruchowym */
export function swapExercise(current: Exercise | undefined, exercises: Exercise[], exclude: string[]): Exercise | null {
  if (!current?.pattern) return null
  const pool = exercises.filter((e) => e.pattern === current.pattern && e.id !== current.id && !exclude.includes(e.id))
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
