import { useState } from 'react'
import { fmt, formatDate } from '../calc'
import { estimateMinutes } from '../generators/volume'
import { newId, useStore } from '../store'
import type { LogEntry, PlanExercise, TrainingPlan } from '../types'

const today = () => new Date().toISOString().slice(0, 10)
const shortDate = (d: string) => d.slice(8, 10) + '.' + d.slice(5, 7)

/** Rozwinięty plan na karcie podopiecznego – z zapisem ciężarów przy każdym ćwiczeniu */
export function PlanPreview({ plan }: { plan: TrainingPlan }) {
  const { data, update } = useStore()
  const byId = new Map(data.exercises.map((e) => [e.id, e]))

  function setLog(dayId: string, exId: string, fn: (log: LogEntry[]) => LogEntry[]) {
    update((d) => ({
      ...d,
      plans: d.plans.map((p) =>
        p.id !== plan.id
          ? p
          : {
              ...p,
              days: p.days.map((day) =>
                day.id !== dayId
                  ? day
                  : { ...day, exercises: day.exercises.map((e) => (e.id === exId ? { ...e, log: fn(e.log ?? []) } : e)) },
              ),
            },
      ),
    }))
  }

  return (
    <div className="plan-preview">
      {plan.days.map((day) => (
        <div key={day.id} className="preview-day">
          <div className="preview-day-head">
            <h3>{day.name}</h3>
            <span className="badge">⏱ ok. {estimateMinutes(day.exercises, data.exercises)} min</span>
          </div>
          {day.exercises.length === 0 && <p className="muted small">Brak ćwiczeń.</p>}
          {day.exercises.map((pe, i) => (
            <ExerciseRow
              key={pe.id}
              index={i + 1}
              pe={pe}
              name={byId.get(pe.exerciseId)?.name ?? '—'}
              cardio={byId.get(pe.exerciseId)?.pattern === 'cardio'}
              onAdd={(entry) => setLog(day.id, pe.id, (log) => [...log, entry])}
              onRemove={(entryId) => setLog(day.id, pe.id, (log) => log.filter((x) => x.id !== entryId))}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function ExerciseRow({
  index,
  pe,
  name,
  cardio,
  onAdd,
  onRemove,
}: {
  index: number
  pe: PlanExercise
  name: string
  cardio: boolean
  onAdd: (e: LogEntry) => void
  onRemove: (id: string) => void
}) {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [showAll, setShowAll] = useState(false)
  const log = [...(pe.log ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const last = log[log.length - 1]
  const prev = log[log.length - 2]
  const trend = last && prev ? last.weight - prev.weight : 0
  const best = log.reduce((m, e) => Math.max(m, e.weight), 0)

  function save() {
    const w = Number(weight.replace(',', '.'))
    if (!(w >= 0) || weight.trim() === '') return
    onAdd({ id: newId(), date: today(), weight: w, reps: reps.trim() || pe.reps })
    setWeight('')
    setReps('')
  }

  return (
    <div className="ex-row">
      <div className="ex-info">
        <span className="ex-index">{index}</span>
        <div>
          <strong>{name}</strong>
          <div className="muted small">
            {cardio ? pe.reps : `${pe.sets} × ${pe.reps}`}
            {pe.rest && pe.rest !== '—' && ` · przerwa ${pe.rest}`}
            {pe.notes && ` · ${pe.notes}`}
            {pe.weight && (
              <>
                {' '}
                · cel: <b>{pe.weight}</b>
              </>
            )}
          </div>
        </div>
      </div>

      {!cardio && (
        <div className="ex-log">
          <div className="ex-last">
            {last ? (
              <>
                <span className="muted small">Ostatnio {shortDate(last.date)}</span>
                <strong>
                  {fmt(last.weight, last.weight % 1 ? 1 : 0)} kg × {last.reps}
                  {trend !== 0 && <span className={trend > 0 ? 'up' : 'down'}>{trend > 0 ? ` ▲ +${fmt(trend, 1)}` : ` ▼ ${fmt(trend, 1)}`}</span>}
                </strong>
                {log.length > 1 && (
                  <button className="link small" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? 'ukryj' : `historia (${log.length}) · rekord ${fmt(best, best % 1 ? 1 : 0)} kg`}
                  </button>
                )}
              </>
            ) : (
              <span className="muted small">Brak wpisów</span>
            )}
          </div>
          <form
            className="log-form"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <input
              inputMode="decimal"
              placeholder="kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              aria-label={`Ciężar – ${name}`}
            />
            <input placeholder={pe.reps || 'powt.'} value={reps} onChange={(e) => setReps(e.target.value)} aria-label="Powtórzenia" />
            <button className="primary" type="submit">
              Zapisz
            </button>
          </form>
        </div>
      )}

      {showAll && (
        <ul className="log-history">
          {[...log].reverse().map((e) => (
            <li key={e.id}>
              <span>{formatDate(e.date)}</span>
              <strong>
                {fmt(e.weight, e.weight % 1 ? 1 : 0)} kg × {e.reps}
              </strong>
              <button className="link danger" onClick={() => confirm('Usunąć ten wpis?') && onRemove(e.id)}>
                usuń
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
