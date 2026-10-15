import { useState } from 'react'
import { GOALS, effectiveTarget } from '../calc'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Client } from '../types'

export function ClientsView() {
  const { data, update } = useStore()
  const [query, setQuery] = useState('')

  const clients = data.clients
    .filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  function addClient() {
    const client: Client = {
      id: newId(),
      name: 'Nowy podopieczny',
      sex: 'M',
      age: 0,
      heightCm: 0,
      weightKg: 0,
      activity: 1.55,
      goal: 'redukcja',
      notes: '',
      createdAt: new Date().toISOString(),
    }
    update((d) => ({ ...d, clients: [...d.clients, client] }))
    navigate({ name: 'client', id: client.id })
  }

  return (
    <div>
      <div className="page-head">
        <h1>Podopieczni</h1>
        <button className="primary" onClick={addClient}>
          + Dodaj podopiecznego
        </button>
      </div>

      {data.clients.length > 0 && (
        <input
          className="search"
          placeholder="Szukaj po imieniu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {data.clients.length === 0 ? (
        <div className="empty">
          <p>Nie masz jeszcze żadnych podopiecznych.</p>
          <p>Kliknij „Dodaj podopiecznego”, aby zacząć.</p>
        </div>
      ) : (
        <div className="grid">
          {clients.map((c) => {
            const plans = data.plans.filter((p) => p.clientId === c.id).length
            const diets = data.diets.filter((p) => p.clientId === c.id).length
            const kcal = effectiveTarget(c)?.kcal ?? null
            return (
              <a key={c.id} className="card client-card" href={href({ name: 'client', id: c.id })}>
                <strong>{c.name || 'Bez imienia'}</strong>
                <span className="muted">
                  {GOALS[c.goal].label}
                  {c.weightKg > 0 && ` · ${c.weightKg} kg`}
                  {kcal !== null && ` · ${kcal} kcal`}
                </span>
                <span className="muted small">
                  Plany: {plans} · Diety: {diets}
                </span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
