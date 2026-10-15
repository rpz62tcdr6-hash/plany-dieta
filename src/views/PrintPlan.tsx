import { fmt, formatDate } from '../calc'
import { href } from '../router'
import { useStore } from '../store'

export function PrintPlan({ id }: { id: string }) {
  const { data } = useStore()
  const plan = data.plans.find((p) => p.id === id)
  if (!plan) return <p className="empty">Nie znaleziono planu.</p>

  const client = data.clients.find((c) => c.id === plan.clientId)
  const exName = (exId: string) => data.exercises.find((e) => e.id === exId)?.name ?? '—'
  const hasLog = plan.days.some((d) => d.exercises.some((e) => e.log?.length))
  const lastLog = (log: { date: string; weight: number; reps: string }[] | undefined) => {
    const last = [...(log ?? [])].sort((a, b) => a.date.localeCompare(b.date)).pop()
    return last ? `${fmt(last.weight, last.weight % 1 ? 1 : 0)} kg × ${last.reps}` : ''
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
                  {hasLog && <th>Ostatnio</th>}
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
                    {hasLog && <td>{lastLog(ex.log)}</td>}
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
