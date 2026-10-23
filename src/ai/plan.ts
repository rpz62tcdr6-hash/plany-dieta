import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import * as z from 'zod'
import { GOALS, effectiveTarget } from '../calc'
import { sortedMeasurements } from '../components/client/Measurements'
import { allSessions, formatSets } from '../sessions'
import { newId } from '../store'
import type { AppData, Client, Exercise, PlanDay, PlanExercise, TrainingPlan } from '../types'
import { AI_MODEL, AiError, makeClient } from './client'

const AiExercise = z.object({
  exerciseId: z.string().describe('Id ćwiczenia z biblioteki albo "NEW", jeśli w bibliotece go nie ma'),
  newExerciseName: z.string().describe('Nazwa nowego ćwiczenia (tylko gdy exerciseId = "NEW"), inaczej pusty tekst'),
  newExerciseMuscle: z.string().describe('Partia nowego ćwiczenia, np. "Plecy" (tylko gdy NEW), inaczej pusty tekst'),
  sets: z.number().int(),
  reps: z.string().describe('np. "8–10" albo "30–45 s" albo "15 min"'),
  tempo: z.string().describe('4 znaki np. 2101, 3101, 21X1; pusty dla cardio'),
  rir: z.string().describe('np. "1–2"; pusty dla cardio'),
  rest: z.string().describe('np. "2 min" albo "90 s"'),
  weight: z.string().describe('Proponowany ciężar startowy, np. "60 kg", albo pusty tekst'),
  notes: z.string().describe('Krótka wskazówka techniczna po polsku'),
})

const AiPlan = z.object({
  name: z.string(),
  notes: z.string().describe('Założenia planu, rozgrzewka, progresja – kilka linii w formacie „Etykieta: treść”'),
  days: z.array(
    z.object({
      name: z.string().describe('np. "Poniedziałek – Góra" albo "FBW A"'),
      exercises: z.array(AiExercise),
    }),
  ),
  summary: z.string().describe('1–3 zdania dla trenera: co i dlaczego tak ułożono / co zmieniono'),
})

export type AiPlanResult = z.infer<typeof AiPlan>

const SYSTEM = `Jesteś doświadczonym trenerem przygotowania motorycznego i układasz plany treningowe dla trenera personalnego. Piszesz po polsku.

Zasady:
- Opieraj się na aktualnych badaniach: każda partia min. 2× w tygodniu, ok. 10–20 serii tygodniowo na dużą partię u średniozaawansowanych (mniej u początkujących), serie blisko upadku (RIR 0–3), dłuższe przerwy w ćwiczeniach wielostawowych, progresja ciężaru lub powtórzeń.
- Plan ma się zmieścić w czasie treningu podanym przez trenera (licz ok. 2–3 min na serię z przerwą).
- Najpierw ćwiczenia wielostawowe, potem izolowane. Uwzględnij kontuzje i ograniczenia podopiecznego.
- Używaj ćwiczeń z biblioteki trenera (podaję je jako „id|nazwa|partia|sprzęt”). Wpisuj dokładnie ich id. Tylko gdy czegoś naprawdę nie ma w bibliotece, ustaw exerciseId "NEW" i podaj nazwę.
- Trener zapisuje tempo czterema znakami (np. 2101, 3101 przy martwych ciągach, 21X1 przy dynamicznej koncentryce) i RIR jako zakres. Wypełniaj te pola.
- W „notes” ćwiczenia podawaj krótką, konkretną wskazówkę techniczną (jak w planach trenera: ustawienie ciała, na co uważać).
- Jeśli znasz ostatnie wyniki podopiecznego w danym ćwiczeniu, zaproponuj ciężar startowy w polu weight.
- Gdy trener prosi o poprawki, zmieniaj tylko to, o co prosi, resztę planu zostaw bez zmian.`

function libraryText(exercises: Exercise[]): string {
  return exercises.map((e) => `${e.id}|${e.name}|${e.muscle}|${e.equipment ?? ''}`).join('\n')
}

function clientText(client: Client, data: AppData): string {
  const t = effectiveTarget(client)
  const m = sortedMeasurements(client).slice(-1)[0]
  const lines = [
    `Podopieczny: ${client.sex === 'K' ? 'kobieta' : 'mężczyzna'}, ${client.age || '?'} lat, ${client.heightCm || '?'} cm, ${client.weightKg || '?'} kg`,
    `Cel w profilu: ${GOALS[client.goal].label}${t ? ` · dieta ${t.kcal} kcal` : ''}`,
  ]
  if (m?.waist) lines.push(`Ostatni obwód talii: ${m.waist} cm`)
  if (client.notes.trim()) lines.push(`Notatki trenera o podopiecznym: ${client.notes.trim()}`)
  // Ostatnie wyniki – żeby AI mogło zaproponować ciężary startowe
  const byId = new Map(data.exercises.map((e) => [e.id, e.name]))
  const seen = new Set<string>()
  const results: string[] = []
  for (const { session } of allSessions(data.plans.filter((p) => p.clientId === client.id))) {
    for (const ex of session.exercises) {
      if (seen.has(ex.exerciseId) || ex.sets.length === 0) continue
      seen.add(ex.exerciseId)
      results.push(`- ${byId.get(ex.exerciseId) ?? ex.exerciseId} (${session.date}): ${formatSets(ex.sets)}`)
    }
  }
  if (results.length) lines.push('Ostatnie wyniki:', ...results.slice(0, 25))
  return lines.join('\n')
}

function planText(plan: TrainingPlan, exercises: Exercise[]): string {
  const byId = new Map(exercises.map((e) => [e.id, e.name]))
  return JSON.stringify({
    name: plan.name,
    notes: plan.notes,
    days: plan.days.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: byId.get(e.exerciseId) ?? '',
        sets: e.sets,
        reps: e.reps,
        tempo: e.tempo ?? '',
        rir: e.rir ?? '',
        rest: e.rest,
        weight: e.weight,
        notes: e.notes,
      })),
    })),
  })
}

async function ask(userContent: string, signal?: AbortSignal): Promise<AiPlanResult> {
  const client = makeClient()
  const response = await client.beta.messages.parse(
    {
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      // Gdyby model główny odmówił, serwer sam ponowi zapytanie na rekomendowanym modelu zapasowym
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(AiPlan) },
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    },
    { signal },
  )
  if (response.stop_reason === 'refusal') throw new AiError('AI odmówiło ułożenia tego planu. Spróbuj opisać prośbę inaczej.')
  if (response.stop_reason === 'max_tokens') throw new AiError('Plan wyszedł za długi – poproś o mniej dni lub ćwiczeń.')
  if (!response.parsed_output) throw new AiError('AI zwróciło niepoprawną odpowiedź – spróbuj ponownie.')
  return response.parsed_output
}

export function generatePlanWithAi(prompt: string, client: Client, data: AppData, signal?: AbortSignal) {
  return ask(
    `${clientText(client, data)}\n\nProśba trenera:\n${prompt.trim()}\n\nBiblioteka ćwiczeń (id|nazwa|partia|sprzęt):\n${libraryText(data.exercises)}`,
    signal,
  )
}

export function refinePlanWithAi(instruction: string, plan: TrainingPlan, client: Client | undefined, data: AppData, signal?: AbortSignal) {
  return ask(
    `${client ? clientText(client, data) + '\n\n' : ''}Obecny plan (JSON):\n${planText(plan, data.exercises)}\n\nPopraw plan zgodnie z prośbą trenera:\n${instruction.trim()}\n\nBiblioteka ćwiczeń (id|nazwa|partia|sprzęt):\n${libraryText(data.exercises)}`,
    signal,
  )
}

/**
 * Zamienia odpowiedź AI na dni planu. Nieznane ćwiczenia dopisuje do biblioteki.
 * Przy poprawkach zachowuje id pozycji, które się nie zmieniły – historia treningów zostaje podpięta.
 */
export function applyAiPlan(
  result: AiPlanResult,
  exercises: Exercise[],
  previous?: PlanDay[],
): { days: PlanDay[]; newExercises: Exercise[] } {
  const known = new Map(exercises.map((e) => [e.id, e]))
  const byName = new Map(exercises.map((e) => [e.name.toLowerCase(), e]))
  const added: Exercise[] = []

  const resolve = (x: AiPlanResult['days'][number]['exercises'][number]): string => {
    if (known.has(x.exerciseId)) return x.exerciseId
    const name = (x.newExerciseName || '').trim()
    if (!name) return exercises[0]?.id ?? ''
    const existing = byName.get(name.toLowerCase())
    if (existing) return existing.id
    const ex: Exercise = { id: newId(), name, muscle: x.newExerciseMuscle || 'Inne' }
    added.push(ex)
    byName.set(name.toLowerCase(), ex)
    known.set(ex.id, ex)
    return ex.id
  }

  const days: PlanDay[] = result.days.map((d, di) => {
    const prevDay = previous?.find((p) => p.name === d.name) ?? previous?.[di]
    const used = new Set<string>()
    return {
      id: prevDay?.id ?? newId(),
      name: d.name,
      exercises: d.exercises.map((x): PlanExercise => {
        const exerciseId = resolve(x)
        const prev = prevDay?.exercises.find((p) => p.exerciseId === exerciseId && !used.has(p.id))
        if (prev) used.add(prev.id)
        return {
          id: prev?.id ?? newId(),
          exerciseId,
          sets: Math.max(1, Math.min(10, x.sets)),
          reps: x.reps,
          tempo: x.tempo.toUpperCase(),
          rir: x.rir,
          rest: x.rest,
          weight: x.weight,
          notes: x.notes,
        }
      }),
    }
  })
  return { days, newExercises: added }
}
