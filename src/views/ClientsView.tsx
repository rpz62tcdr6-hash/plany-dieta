import { useState } from 'react'
import { GOALS, effectiveTarget, fmt } from '../calc'
import { change, seriesOf } from '../components/client/Measurements'
import { href, navigate } from '../router'
import { agoLabel, allSessions, weekStart } from '../sessions'
import { newId, useStore } from '../store'
import type { Client } from '../types'
import { initials } from './ClientDetail'

type Sort = 'name' | 'activity' | 'newest'

function rememberSort(): Sort {
  try {
    const s = localStorage.getItem('podopieczni-sortowanie') as Sort | null
    return s === 'activity' || s === 'newest' ? s : 'name'
  } catch {
    return 'name'
  }
}

export function ClientsView() {
  const { data, update } = useStore()
  const [query, setQuery] = useState('')
  const [sort, setSortState] = useState<Sort>(rememberSort)

  const setSort = (s: Sort) => {
    setSortState(s)
    try {
      localStorage.setItem('podopieczni-sortowanie', s)
    } catch {
      // bez zapamiętywania
    }
  }

  const info = new Map(
    data.clients.map((c) => {
      const sessions = allSessions(data.plans.filter((p) => p.clientId === c.id))
      return [
        c.id,
        {
          last: sessions[0]?.session.date ?? '',
          week: sessions.filter((s) => s.session.date >= weekStart()).length,
          hasPlan: data.plans.some((p) => p.clientId === c.id),
          hasDiet: data.diets.some((d) => d.clientId === c.id),
        },
      ]
    }),
  )
  const totalWeek = [...info.values()].reduce((a, i) => a + i.week, 0)

  const q = query.trim().toLowerCase()
  const clients = data.clients
    .filter((c) => c.name.toLowerCase().includes(q))
    .sort((a, b) => {
      if (sort === 'activity') return (info.get(b.id)!.last || '').localeCompare(info.get(a.id)!.last || '')
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      return a.name.localeCompare(b.name, 'pl')
    })

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
    try {
      // nowy podopieczny – od razu zakładka z danymi do uzupełnienia
      localStorage.setItem(`podopieczny-zakladka:${client.id}`, 'data')
    } catch {
      // trudno
    }
    navigate({ name: 'client', id: client.id })
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Panel trenera</p>
          <h1>Podopieczni</h1>
        </div>
        <button className="primary" onClick={addClient}>
          + Dodaj podopiecznego
        </button>
      </div>

      {data.clients.length > 0 && (
        <div className="kpis">
          <div className="kpi">
            <span>Podopieczni</span>
            <strong>{data.clients.length}</strong>
          </div>
          <div className="kpi">
            <span>Treningi w tym tygodniu</span>
            <strong>{totalWeek}</strong>
          </div>
          <div className="kpi">
            <span>Bez planu</span>
            <strong>{[...info.values()].filter((i) => !i.hasPlan).length}</strong>
          </div>
          <div className="kpi">
            <span>Bez diety</span>
            <strong>{[...info.values()].filter((i) => !i.hasDiet).length}</strong>
          </div>
        </div>
      )}

      {data.clients.length > 0 && (
        <div className="filters">
          <input className="search" placeholder="Szukaj po imieniu…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips compact">
            {(
              [
                ['name', 'A–Z'],
                ['activity', 'Ostatnio aktywni'],
                ['newest', 'Najnowsi'],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={`chip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {data.clients.length === 0 ? (
        <div className="empty">
          <p>Nie masz jeszcze żadnych podopiecznych.</p>
          <p>Kliknij „Dodaj podopiecznego”, aby zacząć.</p>
        </div>
      ) : (
        <div className="grid">
          {clients.map((c) => {
            const i = info.get(c.id)!
            const kcal = effectiveTarget(c)?.kcal
            const w = change(seriesOf(c, 'weight'), 'kg')
            return (
              <a key={c.id} className="card client-card" href={href({ name: 'client', id: c.id })}>
                <div className="client-card-top">
                  <span className="avatar">{initials(c.name || '?')}</span>
                  <div>
                    <strong>{c.name || 'Bez imienia'}</strong>
                    <span className="muted small">
                      {GOALS[c.goal].label}
                      {c.weightKg > 0 && ` · ${fmt(c.weightKg, 1)} kg`}
                      {kcal ? ` · ${kcal} kcal` : ''}
                    </span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <span>
                    <b>{i.week}</b> tren. w tyg.
                  </span>
                  <span>{i.last ? `ostatnio ${agoLabel(i.last)}` : 'brak treningów'}</span>
                  {w && <span>waga {w}</span>}
                </div>
                <div className="client-card-tags">
                  <span className={`tag ${i.hasPlan ? '' : 'outline'}`}>{i.hasPlan ? 'plan ✓' : 'brak planu'}</span>
                  <span className={`tag ${i.hasDiet ? '' : 'outline'}`}>{i.hasDiet ? 'dieta ✓' : 'brak diety'}</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
      {data.clients.length > 0 && clients.length === 0 && <p className="empty">Nikogo nie znaleziono.</p>}
    </div>
  )
}
