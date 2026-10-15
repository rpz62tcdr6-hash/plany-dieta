import { formatDate } from '../calc'
import { href } from '../router'
import { useStore } from '../store'

export function PrintPlan({ id }: { id: string }) {
  const { data } = useStore()
  const plan = data.plans.find((p) => p.id === id)
  if (!plan) return <p className="empty">Nie znaleziono planu.</p>

  const client = data.clients.find((c) => c.id === plan.clientId)
  const exName = (exId: string) => data.exercises.find((e) => e.id === exId)?.name ?? '—'

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
      {plan.notes && <p className="print-notes">{plan.notes}</p>}

      {plan.days.map((day) => (
        <section key={day.id} className="print-section">
          <h2>{day.name}</h2>
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
                  <th>Ciężar</th>
                  <th>Przerwa</th>
                  <th>Uwagi</th>
                </tr>
              </thead>
              <tbody>
                {day.exercises.map((ex, i) => (
                  <tr key={ex.id}>
                    <td>{i + 1}</td>
                    <td>{exName(ex.exerciseId)}</td>
                    <td>{ex.sets}</td>
                    <td>{ex.reps}</td>
                    <td>{ex.weight}</td>
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
