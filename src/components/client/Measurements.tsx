import { useState } from 'react'
import { fmt, formatDate } from '../../calc'
import { today } from '../../sessions'
import { newId, useStore } from '../../store'
import type { Client, Measurement } from '../../types'
import { LineChart } from './LineChart'

type Metric = Exclude<keyof Measurement, 'id' | 'date' | 'note'>

export const METRICS: { key: Metric; label: string; unit: string }[] = [
  { key: 'weight', label: 'Waga', unit: 'kg' },
  { key: 'bodyFat', label: '% tłuszczu', unit: '%' },
  { key: 'waist', label: 'Talia', unit: 'cm' },
  { key: 'hips', label: 'Biodra', unit: 'cm' },
  { key: 'chest', label: 'Klatka', unit: 'cm' },
  { key: 'arm', label: 'Ramię', unit: 'cm' },
  { key: 'thigh', label: 'Udo', unit: 'cm' },
]

export const sortedMeasurements = (c: Client) => [...(c.measurements ?? [])].sort((a, b) => a.date.localeCompare(b.date))

export function seriesOf(c: Client, key: Metric) {
  return sortedMeasurements(c)
    .filter((m) => typeof m[key] === 'number')
    .map((m) => ({ date: m.date, value: m[key] as number }))
}

/** Zmiana od pierwszego do ostatniego pomiaru, np. „−3,2 kg” */
export function change(points: { value: number }[], unit: string): string | null {
  if (points.length < 2) return null
  const d = points[points.length - 1].value - points[0].value
  if (Math.abs(d) < 0.05) return `bez zmian`
  return `${d > 0 ? '+' : '−'}${fmt(Math.abs(d), 1)} ${unit}`
}

const toNum = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

export function MeasurementsTab({ client }: { client: Client }) {
  const { update } = useStore()
  const [date, setDate] = useState(today())
  const [form, setForm] = useState<Record<Metric, string>>(
    () => Object.fromEntries(METRICS.map((m) => [m.key, ''])) as Record<Metric, string>,
  )
  const [note, setNote] = useState('')
  const all = sortedMeasurements(client)
  const available = METRICS.filter((m) => seriesOf(client, m.key).length > 0)
  const [metric, setMetric] = useState<Metric>(available[0]?.key ?? 'weight')
  const current = METRICS.find((m) => m.key === metric)!
  const points = seriesOf(client, metric)

  function save() {
    const entry: Measurement = { id: newId(), date, note: note.trim() || undefined }
    let any = false
    for (const m of METRICS) {
      const v = toNum(form[m.key])
      if (v !== undefined && v > 0) {
        entry[m.key] = v
        any = true
      }
    }
    if (!any) return alert('Wpisz przynajmniej jeden pomiar.')
    const latest = all[all.length - 1]
    // Waga z najnowszego pomiaru staje się aktualną wagą podopiecznego (liczy się z niej zapotrzebowanie)
    const updateWeight = entry.weight !== undefined && (!latest || date >= latest.date)
    update((d) => ({
      ...d,
      clients: d.clients.map((c) =>
        c.id === client.id
          ? { ...c, measurements: [...(c.measurements ?? []), entry], ...(updateWeight ? { weightKg: entry.weight! } : {}) }
          : c,
      ),
    }))
    setForm(Object.fromEntries(METRICS.map((m) => [m.key, ''])) as Record<Metric, string>)
    setNote('')
    if (entry.weight !== undefined) setMetric('weight')
  }

  function remove(id: string) {
    if (!confirm('Usunąć ten pomiar?')) return
    update((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.id === client.id ? { ...c, measurements: (c.measurements ?? []).filter((m) => m.id !== id) } : c)),
    }))
  }

  const last = all[all.length - 1]

  return (
    <div>
      <section className="card">
        <div className="section-head">
          <h2>Nowy pomiar</h2>
          <label className="inline">
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="measure-grid">
          {METRICS.map((m) => (
            <label key={m.key} className="measure-field">
              <span>{m.label}</span>
              <input
                inputMode="decimal"
                placeholder={last?.[m.key] !== undefined ? String(last[m.key]).replace('.', ',') : '—'}
                value={form[m.key]}
                onChange={(e) => setForm((f) => ({ ...f, [m.key]: e.target.value }))}
              />
              <small>{m.unit}</small>
            </label>
          ))}
        </div>
        <label className="block">
          Notatka (opcjonalnie)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. rano na czczo, po wypoczynku" />
        </label>
        <div className="actions" style={{ marginTop: '0.75rem' }}>
          <button className="primary" onClick={save}>
            + Zapisz pomiar
          </button>
          <span className="muted small">Szare wartości = ostatni pomiar. Wpisana waga aktualizuje wagę w profilu.</span>
        </div>
      </section>

      {all.length === 0 ? (
        <div className="card empty-card">
          <p>Brak pomiarów. Zapisuj wagę i obwody co 1–2 tygodnie, najlepiej rano na czczo – zobaczysz tu wykres postępów.</p>
        </div>
      ) : (
        <>
          <section className="card">
            <div className="section-head">
              <h2>
                {current.label} <span className="muted small">({current.unit})</span>
              </h2>
              {change(points, current.unit) && <span className="badge dark">{change(points, current.unit)} od początku</span>}
            </div>
            <div className="chips compact" style={{ marginBottom: '0.75rem' }}>
              {available.map((m) => (
                <button key={m.key} className={`chip ${metric === m.key ? 'on' : ''}`} onClick={() => setMetric(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
            {points.length >= 2 ? (
              <LineChart points={points} unit={current.unit} />
            ) : (
              <p className="muted small">Wykres pojawi się po drugim pomiarze.</p>
            )}
          </section>

          <section className="card">
            <h2>Historia pomiarów</h2>
            <div className="table-wrap">
              <table className="measure-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="num">
                        {m.label}
                      </th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...all].reverse().map((m, i, arr) => {
                    const prev = arr[i + 1]
                    return (
                      <tr key={m.id}>
                        <td>
                          <strong>{formatDate(m.date)}</strong>
                          {m.note && <div className="muted small">{m.note}</div>}
                        </td>
                        {METRICS.map((x) => {
                          const v = m[x.key]
                          const p = prev?.[x.key]
                          const d = v !== undefined && p !== undefined ? v - p : 0
                          return (
                            <td key={x.key} className="num">
                              {v !== undefined ? fmt(v, 1) : '—'}
                              {d !== 0 && (
                                <span className={`delta ${d > 0 ? 'up' : 'down'}`}>
                                  {d > 0 ? '+' : '−'}
                                  {fmt(Math.abs(d), 1)}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className="row-actions">
                          <button className="danger" title="Usuń pomiar" onClick={() => remove(m.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
