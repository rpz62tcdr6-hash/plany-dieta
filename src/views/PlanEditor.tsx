import { ExerciseSelect } from '../components/ExerciseSelect'
import { GOAL_LABELS, LEVEL_LABELS, swapExercise } from '../generators/plan'
import { estimateMinutes } from '../generators/volume'
import { VolumePanel } from '../components/VolumePanel'
import { NumberInput } from '../components/NumberInput'
import { href } from '../router'
import { move, newId, useStore } from '../store'
import type { Level, PlanDay, PlanExercise, TrainingGoal, TrainingPlan } from '../types'

export function PlanEditor({ id }: { id: string }) {
  const { data, update } = useStore()
  const plan = data.plans.find((p) => p.id === id)

  if (!plan) {
    return (
      <div className="empty">
        <p>Nie znaleziono planu.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const client = data.clients.find((c) => c.id === plan.clientId)

  function setPlan(fn: (p: TrainingPlan) => TrainingPlan) {
    update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === id ? fn(p) : p)) }))
  }

  function setDays(fn: (days: PlanDay[]) => PlanDay[]) {
    setPlan((p) => ({ ...p, days: fn(p.days) }))
  }

  function setDay(dayId: string, fn: (day: PlanDay) => PlanDay) {
    setDays((days) => days.map((day) => (day.id === dayId ? fn(day) : day)))
  }

  function setExercise(dayId: string, exId: string, patch: Partial<PlanExercise>) {
    setDay(dayId, (day) => ({
      ...day,
      exercises: day.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)),
    }))
  }

  function swap(dayId: string, pe: PlanExercise) {
    const day = plan!.days.find((d) => d.id === dayId)
    const current = data.exercises.find((e) => e.id === pe.exerciseId)
    const next = swapExercise(current, data.exercises, day?.exercises.map((e) => e.exerciseId) ?? [])
    if (!next) return alert('Brak innego ćwiczenia tego typu w bibliotece.')
    setExercise(dayId, pe.id, { exerciseId: next.id })
  }

  function addDay() {
    const letter = String.fromCharCode(65 + (plan!.days.length % 26))
    setDays((days) => [...days, { id: newId(), name: `Dzień ${letter}`, exercises: [] }])
  }

  function addExercise(dayId: string) {
    const ex: PlanExercise = {
      id: newId(),
      exerciseId: data.exercises[0]?.id ?? '',
      sets: 3,
      reps: '8-12',
      weight: '',
      rest: '90 s',
      tempo: '2101',
      rir: '1–2',
      notes: '',
    }
    setDay(dayId, (day) => ({ ...day, exercises: [...day.exercises, ex] }))
  }

  return (
    <div>
      <a className="back" href={href(client ? { name: 'client', id: client.id } : { name: 'clients' })}>
        ← {client?.name ?? 'Podopieczni'}
      </a>
      <div className="page-head">
        <input
          className="title-input"
          value={plan.name}
          onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
          aria-label="Nazwa planu"
        />
        <a className="button primary" href={href({ name: 'print-plan', id })}>
          Podgląd / PDF
        </a>
      </div>

      <section className="card">
        <label className="block">
          Uwagi ogólne do planu (rozgrzewka, progresja, częstotliwość…)
          <textarea rows={2} value={plan.notes} onChange={(e) => setPlan((p) => ({ ...p, notes: e.target.value }))} />
        </label>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Objętość tygodniowa</h2>
          <span className="actions">
            <select
              value={plan.goal ?? 'masa'}
              onChange={(e) => setPlan((p) => ({ ...p, goal: e.target.value as TrainingGoal }))}
              aria-label="Cel planu"
            >
              {(Object.keys(GOAL_LABELS) as TrainingGoal[]).map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </select>
            <select
              value={plan.level ?? 'sredni'}
              onChange={(e) => setPlan((p) => ({ ...p, level: e.target.value as Level }))}
              aria-label="Poziom"
            >
              {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </span>
        </div>
        <VolumePanel days={plan.days} exercises={data.exercises} goal={plan.goal ?? 'masa'} level={plan.level ?? 'sredni'} />
      </section>

      {plan.days.map((day, di) => (
        <section className="card" key={day.id}>
          <div className="section-head">
            <input
              className="day-name"
              value={day.name}
              onChange={(e) => setDay(day.id, (d) => ({ ...d, name: e.target.value }))}
              aria-label="Nazwa dnia"
            />
            <span className="badge" title="Szacowany czas: rozgrzewka + serie + przerwy">
              ⏱ ok. {estimateMinutes(day.exercises, data.exercises)} min · {day.exercises.reduce((a, e) => a + e.sets, 0)} serii
            </span>
            <span className="actions">
              <button title="Przesuń w górę" onClick={() => setDays((days) => move(days, di, -1))} disabled={di === 0}>
                ↑
              </button>
              <button
                title="Przesuń w dół"
                onClick={() => setDays((days) => move(days, di, 1))}
                disabled={di === plan.days.length - 1}
              >
                ↓
              </button>
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Usunąć „${day.name}”?`)) setDays((days) => days.filter((d) => d.id !== day.id))
                }}
              >
                Usuń dzień
              </button>
            </span>
          </div>

          {day.exercises.length > 0 && (
            <div className="table-wrap">
              <table className="edit-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ćwiczenie</th>
                    <th>Serie</th>
                    <th>Powt.</th>
                    <th>Ciężar</th>
                    <th>Tempo</th>
                    <th>RIR</th>
                    <th>Przerwa</th>
                    <th>Uwagi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {day.exercises.map((ex, ei) => (
                    <tr key={ex.id}>
                      <td className="muted idx">{ei + 1}</td>
                      <td className="wide" data-label="Ćwiczenie">
                        <div className="ex-cell">
                        <ExerciseSelect
                          exercises={data.exercises}
                          value={ex.exerciseId}
                          onChange={(exerciseId) => setExercise(day.id, ex.id, { exerciseId })}
                        />
                        <button className="swap" title="Zamień na podobne ćwiczenie" onClick={() => swap(day.id, ex)}>
                          ⇄
                        </button>
                        </div>
                      </td>
                      <td data-label="Serie">
                        <NumberInput
                          className="narrow"
                          value={ex.sets}
                          onChange={(sets) => setExercise(day.id, ex.id, { sets })}
                        />
                      </td>
                      <td data-label="Powt.">
                        <input
                          className="narrow"
                          value={ex.reps}
                          onChange={(e) => setExercise(day.id, ex.id, { reps: e.target.value })}
                        />
                      </td>
                      <td data-label="Ciężar">
                        <input
                          className="narrow"
                          placeholder="cel, np. 60 kg"
                          value={ex.weight}
                          onChange={(e) => setExercise(day.id, ex.id, { weight: e.target.value })}
                        />
                      </td>
                      <td data-label="Tempo">
                        <input
                          className="narrow"
                          placeholder="2101"
                          value={ex.tempo ?? ''}
                          onChange={(e) => setExercise(day.id, ex.id, { tempo: e.target.value.toUpperCase() })}
                        />
                      </td>
                      <td data-label="RIR">
                        <input
                          className="narrow"
                          placeholder="1–2"
                          value={ex.rir ?? ''}
                          onChange={(e) => setExercise(day.id, ex.id, { rir: e.target.value })}
                        />
                      </td>
                      <td data-label="Przerwa">
                        <input
                          className="narrow"
                          value={ex.rest}
                          onChange={(e) => setExercise(day.id, ex.id, { rest: e.target.value })}
                        />
                      </td>
                      <td data-label="Uwagi">
                        <input
                          placeholder="technika, wskazówki…"
                          value={ex.notes}
                          onChange={(e) => setExercise(day.id, ex.id, { notes: e.target.value })}
                        />
                      </td>
                      <td className="row-actions">
                        <button
                          title="W górę"
                          disabled={ei === 0}
                          onClick={() => setDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, -1) }))}
                        >
                          ↑
                        </button>
                        <button
                          title="W dół"
                          disabled={ei === day.exercises.length - 1}
                          onClick={() => setDay(day.id, (d) => ({ ...d, exercises: move(d.exercises, ei, 1) }))}
                        >
                          ↓
                        </button>
                        <button
                          title="Usuń"
                          className="danger"
                          onClick={() =>
                            setDay(day.id, (d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== ex.id) }))
                          }
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => addExercise(day.id)}>+ Dodaj ćwiczenie</button>
        </section>
      ))}

      <button className="primary" onClick={addDay}>
        + Dodaj dzień treningowy
      </button>
      <p className="muted small">
        Brakuje ćwiczenia? Dodasz je w zakładce <a href={href({ name: 'library' })}>Biblioteka</a>.
      </p>
    </div>
  )
}
