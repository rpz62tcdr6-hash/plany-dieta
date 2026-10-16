import { useState } from 'react'
import { ChoiceChips, MultiChips } from '../components/Chips'
import {
  EQUIPMENT_SET_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  PRIORITY_PATTERNS,
  generatePlan,
  type EquipmentSet,
  type Level,
  type PlanParams,
  type Priority,
  type TrainingGoal,
} from '../generators/plan'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Goal, Joint, TrainingPlan } from '../types'

const fromClientGoal: Record<Goal, TrainingGoal> = { redukcja: 'redukcja', utrzymanie: 'kondycja', masa: 'masa' }

export function PlanGenerator({ clientId }: { clientId: string }) {
  const { data, update } = useStore()
  const client = data.clients.find((c) => c.id === clientId)
  const [params, setParams] = useState<PlanParams>({
    goal: client ? fromClientGoal[client.goal] : 'masa',
    level: 'poczatkujacy',
    daysPerWeek: 3,
    minutes: 60,
    equipment: 'silownia',
    injuries: [],
    priorities: [],
    notes: '',
    freeWeights: true,
  })

  if (!client) {
    return (
      <div className="empty">
        <p>Nie znaleziono podopiecznego.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const set = (patch: Partial<PlanParams>) => setParams((p) => ({ ...p, ...patch }))

  function save(plan: Omit<TrainingPlan, 'id' | 'clientId' | 'createdAt'>) {
    const full: TrainingPlan = { ...plan, id: newId(), clientId, createdAt: new Date().toISOString() }
    update((d) => ({ ...d, plans: [...d.plans, full] }))
    navigate({ name: 'plan', id: full.id })
  }

  return (
    <div>
      <a className="back" href={href({ name: 'client', id: clientId })}>
        ← {client.name}
      </a>
      <div className="page-head">
        <div>
          <p className="eyebrow">Nowy plan treningowy</p>
          <h1>Założenia planu</h1>
        </div>
      </div>

      <section className="card step">
        <h2>
          <span className="step-no">1</span> Cel treningowy
        </h2>
        <ChoiceChips
          options={(Object.keys(GOAL_LABELS) as TrainingGoal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
          value={params.goal}
          onChange={(goal) => set({ goal })}
        />
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">2</span> Poziom zaawansowania
        </h2>
        <ChoiceChips
          options={(Object.keys(LEVEL_LABELS) as Level[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
          value={params.level}
          onChange={(level) => set({ level })}
        />
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">3</span> Ile treningów w tygodniu?
        </h2>
        <ChoiceChips
          options={[
            { value: 2, label: '2×', hint: 'FBW' },
            { value: 3, label: '3×', hint: 'FBW' },
            { value: 4, label: '4×', hint: 'Góra / Dół' },
            { value: 5, label: '5×', hint: 'Góra/Dół + PPL' },
            { value: 6, label: '6×', hint: 'Push/Pull/Nogi' },
          ]}
          value={params.daysPerWeek}
          onChange={(daysPerWeek) => set({ daysPerWeek })}
        />
        <h3>Długość jednego treningu</h3>
        <ChoiceChips
          options={[45, 60, 75, 90].map((m) => ({ value: m, label: `${m} min` }))}
          value={params.minutes}
          onChange={(minutes) => set({ minutes })}
        />
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">4</span> Gdzie trenuje?
        </h2>
        <ChoiceChips
          options={(Object.keys(EQUIPMENT_SET_LABELS) as EquipmentSet[]).map((e) => ({
            value: e,
            label: EQUIPMENT_SET_LABELS[e],
          }))}
          value={params.equipment}
          onChange={(equipment) => set({ equipment })}
        />
        {params.equipment === 'silownia' && (
          <div className="chips" style={{ marginTop: '0.6rem' }}>
            <button
              type="button"
              aria-pressed={!!params.freeWeights}
              className={`chip ${params.freeWeights ? 'on' : ''}`}
              onClick={() => set({ freeWeights: !params.freeWeights })}
            >
              <span>{params.freeWeights ? '✓ ' : ''}Preferuj wolne ciężary</span>
              <small>sztanga i hantle zamiast maszyn</small>
            </button>
          </div>
        )}
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">5</span> Kontuzje i priorytety <span className="muted small">(opcjonalnie)</span>
        </h2>
        <h3>Oszczędzaj</h3>
        <MultiChips<Joint>
          options={[
            { value: 'kolano', label: 'Kolana' },
            { value: 'bark', label: 'Barki' },
            { value: 'lędźwie', label: 'Odcinek lędźwiowy' },
          ]}
          value={params.injuries}
          onChange={(injuries) => set({ injuries })}
        />
        <h3>Partie priorytetowe – dostaną dodatkowe ćwiczenie</h3>
        <MultiChips<Priority>
          options={(Object.keys(PRIORITY_PATTERNS) as Priority[]).map((p) => ({ value: p, label: p }))}
          value={params.priorities}
          onChange={(priorities) => set({ priorities })}
        />
        <h3>Twoje dodatkowe założenia</h3>
        <textarea
          rows={3}
          placeholder="np. przygotowanie do zawodów, unikać skakania, trening rano przed pracą…"
          value={params.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        <p className="muted small">Te uwagi trafią do opisu planu i na wydruk.</p>
      </section>

      <div className="sticky-actions">
        <button
          className="ghost"
          onClick={() =>
            save({
              name: 'Plan treningowy',
              notes: '',
              days: [{ id: newId(), name: 'Dzień A', exercises: [] }],
              goal: params.goal,
              level: params.level,
            })
          }
        >
          Pusty plan
        </button>
        <button className="primary big" onClick={() => save(generatePlan(params, data.exercises))}>
          ⚡ Wygeneruj plan
        </button>
      </div>
    </div>
  )
}
