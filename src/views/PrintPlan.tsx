import { formatDate } from '../calc'
import { PrintNotes } from '../components/PrintNotes'
import { estimateMinutes } from '../generators/volume'
import { formatSets, previousFor } from '../sessions'
import type { PlanExercise } from '../types'
import { href } from '../router'
import { useStore } from '../store'

export function PrintPlan({ id }: { id: string }) {
  const { data } = useStore()
  const plan = data.plans.find((p) => p.id === id)
  if (!plan) return <p className="empty">Nie znaleziono planu.</p>

  const client = data.clients.find((c) => c.id === plan.clientId)
  const exName = (exId: string) => data.exercises.find((e) => e.id === exId)?.name ?? '—'
  const hasLog = (plan.sessions ?? []).length > 0
  const lastLog = (pe: PlanExercise) => {
    const prev = previousFor(plan, pe)
    return prev ? formatSets(prev.sets) : ''
  }

  return (
    <div className="print-page">
      <div className="no-print print-toolbar">
        <a href={href({ name: 'plan', id })}>← Wróć do edycji</a>
        <button className="primary" onClick={() => window.print()}>
          Drukuj / Zapisz jako PDF
        </button>
      </div>

      <header className="print-header">
        <h1>{plan.name}</h1>
        <p>
          {client && <strong>{client.name}</strong>} · {formatDate(new Date().toISOString())}
        </p>
      </header>
      {plan.notes && <PrintNotes text={plan.notes} title="Założenia i zasady" />}

      {plan.days.map((day) => (
        <section key={day.id} className="print-section">
          <h2>
            {day.name}
            <span className="print-kcal">
              {day.exercises.length} ćw. · ok. {estimateMinutes(day.exercises, data.exercises)} min
            </span>
          </h2>
          {day.exercises.length === 0 ? (
            <p className="muted">Brak ćwiczeń.</p>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ćwiczenie</th>
                  <th>Serie</th>
                  <th>Powtórzenia</th>
                  <th>Tempo</th>
                  <th>RIR</th>
                  <th>Ciężar</th>
                  {hasLog && <th>Ostatnio</th>}
                  <th>Przerwa</th>
                  <th>Uwagi</th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, i) => (
                  <tr key={ex.id}>
                    <td>
                      <span className="num-badge">{i + 1}</span>
                    </td>
                    <td className="ex-name">{exName(ex.exerciseId)}</td>
                    <td className="strong">{ex.sets}</td>
                    <td className="strong">{ex.reps}</td>
                    <td>{ex.tempo}</td>
                    <td className="strong">{ex.rir}</td>
                    <td>{ex.weight}</td>
                    {hasLog && <td>{lastLog(ex)}</td>}
                    <td>{ex.rest}</td>
                    <td>{ex.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  )
}
