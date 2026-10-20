import { useState } from 'react'
import {
  ACTIVITY_LEVELS,
  GOALS,
  PROTEIN_PER_KG,
  bmr,
  dietNameFor,
  effectiveTarget,
  fmt,
  foodMacros,
  formatDate,
  macroTargets,
  sumMacros,
  targetKcal,
  tdee,
} from '../calc'
import { DietPreview } from '../components/DietPreview'
import { MacroInputs } from '../components/MacroInputs'
import { NumberInput } from '../components/NumberInput'
import { PlanPreview } from '../components/PlanPreview'
import { LineChart } from '../components/client/LineChart'
import { MeasurementsTab, change, seriesOf, sortedMeasurements } from '../components/client/Measurements'
import { fitItems } from '../generators/diet'
import { href, navigate } from '../router'
import { agoLabel, allSessions, daysAgo, nextDay, sessionTonnage, shortDate, sortedSessions, weekStart } from '../sessions'
import { newId, useStore } from '../store'
import type { Client, Diet, Goal, Macros, MealItem, TrainingPlan } from '../types'

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

type Tab = 'overview' | 'training' | 'diet' | 'measurements' | 'data'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Przegląd' },
  { key: 'training', label: 'Trening' },
  { key: 'diet', label: 'Dieta' },
  { key: 'measurements', label: 'Pomiary' },
  { key: 'data', label: 'Dane' },
]

const tabKey = (id: string) => `podopieczny-zakladka:${id}`

function loadTab(id: string): Tab {
  try {
    const t = localStorage.getItem(tabKey(id)) as Tab | null
    return t && TABS.some((x) => x.key === t) ? t : 'overview'
  } catch {
    return 'overview'
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function ClientDetail({ id }: { id: string }) {
  const { data, update } = useStore()
  const [tab, setTabState] = useState<Tab>(() => loadTab(id))
  const [openDay, setOpenDay] = useState<string | undefined>()
  const client = data.clients.find((c) => c.id === id)

  if (!client) {
    return (
      <div className="empty">
        <p>Nie znaleziono podopiecznego.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(tabKey(id), t)
    } catch {
      // brak dostępu do pamięci – zakładka tylko na czas wizyty
    }
    window.scrollTo({ top: 0 })
  }

  const plans = data.plans.filter((p) => p.clientId === id).sort(newestFirst)
  const diets = data.diets.filter((d) => d.clientId === id).sort(newestFirst)
  const current = effectiveTarget(client)
  const missingData = targetKcal(client) === null

  const goTraining = (dayId?: string) => {
    setOpenDay(dayId)
    setTab('training')
  }

  return (
    <div>
      <a className="back" href={href({ name: 'clients' })}>
        ← Podopieczni
      </a>

      <div className="client-hero">
        <div className="hero-main">
          <span className="avatar big">{initials(client.name || '?')}</span>
          <div>
            <p className="eyebrow">{GOALS[client.goal].label}</p>
            <h1>{client.name || 'Bez imienia'}</h1>
            <p className="hero-sub">
              {client.sex === 'K' ? 'Kobieta' : 'Mężczyzna'}
              {client.age ? ` · ${client.age} lat` : ''}
              {client.heightCm ? ` · ${client.heightCm} cm` : ''}
              {client.weightKg ? ` · ${fmt(client.weightKg, 1)} kg` : ''}
            </p>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <span>Kalorie</span>
            <strong>{current ? current.kcal : '—'}</strong>
          </div>
          <div>
            <span>B / W / T</span>
            <strong>{current ? `${current.protein} / ${current.carbs} / ${current.fat}` : '—'}</strong>
          </div>
        </div>
      </div>

      <nav className="tabbar" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'data' && missingData && <span className="dot" title="Uzupełnij dane" />}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <Overview client={client} plans={plans} diets={diets} onTraining={goTraining} onTab={setTab} />
      )}
      {tab === 'training' && <TrainingTab client={client} plans={plans} openDay={openDay} />}
      {tab === 'diet' && <DietTab client={client} diets={diets} />}
      {tab === 'measurements' && <MeasurementsTab client={client} />}
      {tab === 'data' && <DataTab client={client} onRemoved={() => navigate({ name: 'clients' })} update={update} />}
    </div>
  )
}

/* ——— Przegląd ——— */

function Overview({
  client,
  plans,
  diets,
  onTraining,
  onTab,
}: {
  client: Client
  plans: TrainingPlan[]
  diets: Diet[]
  onTraining: (dayId?: string) => void
  onTab: (t: Tab) => void
}) {
  const { data, update } = useStore()
  const plan = plans[0]
  const diet = diets[0]
  const sessions = allSessions(plans)
  const thisWeek = sessions.filter((s) => s.session.date >= weekStart()).length
  const last30 = sessions.filter((s) => daysAgo(s.session.date) < 30).length
  const lastSession = sessions[0]
  const weight = seriesOf(client, 'weight')
  const waist = seriesOf(client, 'waist')
  const next = plan ? nextDay(plan) : undefined
  const nextLast = plan && next ? sortedSessions(plan).find((s) => s.dayId === next.id) : undefined
  const foods = new Map(data.foods.map((f) => [f.id, f]))
  const dietTotal = diet ? sumMacros(diet.meals.flatMap((m) => m.items.map((i) => foodMacros(foods.get(i.foodId), i.grams)))) : null

  return (
    <div className="overview">
      <div className="kpis">
        <div className="kpi">
          <span>Treningi w tym tygodniu</span>
          <strong>
            {thisWeek}
            {plan && <small> / {plan.days.length}</small>}
          </strong>
          <em>{last30} w ostatnich 30 dniach</em>
        </div>
        <div className="kpi">
          <span>Ostatni trening</span>
          <strong>{lastSession ? agoLabel(lastSession.session.date) : '—'}</strong>
          <em>{lastSession ? `${lastSession.day?.name ?? ''} · ${shortDate(lastSession.session.date)}` : 'brak zapisów'}</em>
        </div>
        <div className="kpi">
          <span>Waga</span>
          <strong>
            {client.weightKg ? fmt(client.weightKg, 1) : '—'}
            <small> kg</small>
          </strong>
          <em>{change(weight, 'kg') ? `${change(weight, 'kg')} od początku` : 'dodaj pomiary'}</em>
        </div>
        <div className="kpi">
          <span>Talia</span>
          <strong>
            {waist.length ? fmt(waist[waist.length - 1].value, 1) : '—'}
            <small> cm</small>
          </strong>
          <em>{change(waist, 'cm') ? `${change(waist, 'cm')} od początku` : 'dodaj pomiary'}</em>
        </div>
      </div>

      <div className="quick-actions">
        {plan && next ? (
          <button className="primary big" onClick={() => onTraining(next.id)}>
            ▶ Zapisz trening: {next.name}
          </button>
        ) : (
          <button className="primary big" onClick={() => navigate({ name: 'plan-new', id: client.id })}>
            ⚡ Ułóż plan treningowy
          </button>
        )}
        <button onClick={() => onTab('measurements')}>📏 Dodaj pomiar</button>
        {diet ? (
          <a className="button" href={href({ name: 'print-diet', id: diet.id })}>
            📄 PDF diety
          </a>
        ) : (
          <button onClick={() => navigate({ name: 'diet-new', id: client.id })}>⚡ Ułóż dietę</button>
        )}
        {plan && (
          <a className="button" href={href({ name: 'print-plan', id: plan.id })}>
            📄 PDF planu
          </a>
        )}
      </div>

      <div className="two-col">
        <section className="card">
          <div className="section-head">
            <h2>Aktualny plan</h2>
            {plan && (
              <button className="small-btn" onClick={() => onTab('training')}>
                Wszystkie →
              </button>
            )}
          </div>
          {plan ? (
            <>
              <p className="overview-title">{plan.name}</p>
              {next && (
                <p className="muted small">
                  Następny: <b>{next.name}</b>
                  {nextLast ? ` (ostatnio ${agoLabel(nextLast.date)})` : ' (jeszcze nie robiony)'}
                </p>
              )}
              <ul className="day-list">
                {plan.days.map((d) => {
                  const s = sortedSessions(plan).find((x) => x.dayId === d.id)
                  return (
                    <li key={d.id}>
                      <button className="day-link" onClick={() => onTraining(d.id)}>
                        <strong>{d.name}</strong>
                        <span className="muted small">
                          {d.exercises.length} ćw. · {s ? `ostatnio ${agoLabel(s.date)}` : 'nie robiony'}
                        </span>
                        <span className="arrow">›</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="muted">Brak planu treningowego.</p>
          )}
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Dieta</h2>
            {diet && (
              <button className="small-btn" onClick={() => onTab('diet')}>
                Szczegóły →
              </button>
            )}
          </div>
          {diet && dietTotal ? (
            <>
              <p className="overview-title">{diet.name}</p>
              <div className="mini-macros">
                <div>
                  <span>kcal</span>
                  <strong>{fmt(dietTotal.kcal)}</strong>
                </div>
                <div>
                  <span>B</span>
                  <strong>{fmt(dietTotal.protein)}</strong>
                </div>
                <div>
                  <span>W</span>
                  <strong>{fmt(dietTotal.carbs)}</strong>
                </div>
                <div>
                  <span>T</span>
                  <strong>{fmt(dietTotal.fat)}</strong>
                </div>
              </div>
              <ul className="meal-list">
                {diet.meals.map((m) => (
                  <li key={m.id}>
                    <span className="muted small">{m.name}</span>
                    <span>{m.recipeName ?? `${m.items.length} produktów`}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Brak diety.</p>
          )}
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="section-head">
            <h2>Ostatnie treningi</h2>
          </div>
          {sessions.length === 0 ? (
            <p className="muted">Brak zapisanych treningów. Kliknij „Zapisz trening”, żeby wpisać pierwszy.</p>
          ) : (
            <ul className="recent">
              {sessions.slice(0, 5).map(({ session, day, plan: p }) => (
                <li key={session.id}>
                  <span className="recent-date">
                    <strong>{shortDate(session.date)}</strong>
                    <small>{agoLabel(session.date)}</small>
                  </span>
                  <span className="recent-main">
                    <strong>{day?.name ?? 'Trening'}</strong>
                    <span className="muted small">
                      {p.name} · {session.exercises.length} ćw. · {fmt(sessionTonnage(session))} kg
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="section-head">
            <h2>Waga</h2>
            <button className="small-btn" onClick={() => onTab('measurements')}>
              Pomiary →
            </button>
          </div>
          {weight.length >= 2 ? (
            <LineChart points={weight} unit="kg" height={170} />
          ) : (
            <p className="muted">Zapisz min. 2 pomiary wagi, żeby zobaczyć wykres.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Notatki o podopiecznym</h2>
        <textarea
          rows={3}
          placeholder="Kontuzje, preferencje, alergie, cele na najbliższy miesiąc…"
          value={client.notes}
          onChange={(e) =>
            update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === client.id ? { ...c, notes: e.target.value } : c)) }))
          }
        />
        <p className="muted small">
          Ostatni pomiar:{' '}
          {sortedMeasurements(client).length ? formatDate(sortedMeasurements(client).slice(-1)[0].date) : 'brak'} · w profilu od{' '}
          {formatDate(client.createdAt)}
        </p>
      </section>
    </div>
  )
}

/* ——— Trening ——— */

function TrainingTab({ client, plans, openDay }: { client: Client; plans: TrainingPlan[]; openDay?: string }) {
  const { update } = useStore()

  function duplicatePlan(p: TrainingPlan) {
    const copy: TrainingPlan = { ...structuredClone(p), id: newId(), name: `${p.name} (kopia)`, createdAt: new Date().toISOString() }
    copy.sessions = []
    update((d) => ({ ...d, plans: [...d.plans, copy] }))
  }

  function removePlan(p: TrainingPlan) {
    if (confirm(`Usunąć plan „${p.name}” razem z historią treningów?`))
      update((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }))
  }

  return (
    <div>
      <div className="section-title">
        <h2>Plany treningowe</h2>
        <button className="primary" onClick={() => navigate({ name: 'plan-new', id: client.id })}>
          ⚡ Nowy plan
        </button>
      </div>
      {plans.length === 0 && (
        <div className="card empty-card">
          <p>Brak planu. Kliknij „Nowy plan”, wpisz założenia, a aplikacja ułoży plan.</p>
        </div>
      )}
      {plans.map((p, n) => (
        <details key={p.id} className="card fold" open={n === 0}>
          <summary>
            <div className="fold-title">
              <strong>
                {p.name} {n === 0 && <span className="tag">aktualny</span>}
              </strong>
              <span className="muted small">
                {p.days.length} treningi · {(p.sessions ?? []).length} zapisanych · od {formatDate(p.createdAt)}
              </span>
            </div>
            <span className="actions" onClick={(e) => e.stopPropagation()}>
              <a className="button" href={href({ name: 'plan', id: p.id })}>
                ✎ Edytuj
              </a>
              <a className="button" href={href({ name: 'print-plan', id: p.id })}>
                PDF
              </a>
              <button onClick={() => duplicatePlan(p)}>Duplikuj</button>
              <button className="danger" onClick={() => removePlan(p)}>
                Usuń
              </button>
            </span>
          </summary>
          <PlanPreview plan={p} initialOpen={n === 0 ? openDay : undefined} />
        </details>
      ))}
    </div>
  )
}

/* ——— Dieta ——— */

function DietTab({ client, diets }: { client: Client; diets: Diet[] }) {
  const { update } = useStore()

  function duplicateDiet(x: Diet) {
    const copy: Diet = { ...structuredClone(x), id: newId(), name: `${x.name} (kopia)`, createdAt: new Date().toISOString() }
    update((d) => ({ ...d, diets: [...d.diets, copy] }))
  }

  function removeDiet(x: Diet) {
    if (confirm(`Usunąć dietę „${x.name}”?`)) update((d) => ({ ...d, diets: d.diets.filter((y) => y.id !== x.id) }))
  }

  return (
    <div>
      <div className="section-title">
        <h2>Diety</h2>
        <button className="primary" onClick={() => navigate({ name: 'diet-new', id: client.id })}>
          ⚡ Nowa dieta
        </button>
      </div>
      {diets.length === 0 && (
        <div className="card empty-card">
          <p>Brak diety. Kliknij „Nowa dieta”, wpisz kcal i makro, a aplikacja dobierze przepisy.</p>
        </div>
      )}
      {diets.map((x, n) => (
        <details key={x.id} className="card fold" open={n === 0}>
          <summary>
            <div className="fold-title">
              <strong>
                {x.name} {n === 0 && <span className="tag">aktualna</span>}
              </strong>
              <span className="muted small">
                {x.target.kcal} kcal · {x.meals.length} posiłków · {formatDate(x.createdAt)}
              </span>
            </div>
            <span className="actions" onClick={(e) => e.stopPropagation()}>
              <a className="button" href={href({ name: 'diet', id: x.id })}>
                ✎ Edytuj
              </a>
              <a className="button" href={href({ name: 'print-diet', id: x.id })}>
                PDF
              </a>
              <button onClick={() => duplicateDiet(x)}>Duplikuj</button>
              <button className="danger" onClick={() => removeDiet(x)}>
                Usuń
              </button>
            </span>
          </summary>
          <DietPreview diet={x} weightKg={client.weightKg} />
        </details>
      ))}
    </div>
  )
}

/* ——— Dane ——— */

function DataTab({
  client,
  onRemoved,
  update,
}: {
  client: Client
  onRemoved: () => void
  update: ReturnType<typeof useStore>['update']
}) {
  const [macroInfo, setMacroInfo] = useState('')
  const kcal = targetKcal(client)
  const macros = kcal !== null ? macroTargets(client, kcal) : null
  const current = effectiveTarget(client)

  function set(patch: Partial<Client>) {
    update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === client.id ? { ...c, ...patch } : c)) }))
  }

  function removeClient() {
    if (!confirm(`Usunąć podopiecznego „${client.name}” razem z jego planami, dietami i pomiarami?`)) return
    update((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== client.id),
      plans: d.plans.filter((p) => p.clientId !== client.id),
      diets: d.diets.filter((x) => x.clientId !== client.id),
    }))
    onRemoved()
  }

  return (
    <div>
      <div className="two-col">
        <section className="card">
          <h2>Dane podopiecznego</h2>
          <div className="form">
            <label className="full">
              Imię i nazwisko
              <input value={client.name} onChange={(e) => set({ name: e.target.value })} />
            </label>
            <label>
              Płeć
              <select value={client.sex} onChange={(e) => set({ sex: e.target.value as Client['sex'] })}>
                <option value="M">Mężczyzna</option>
                <option value="K">Kobieta</option>
              </select>
            </label>
            <label>
              Wiek (lata)
              <NumberInput value={client.age} onChange={(age) => set({ age })} />
            </label>
            <label>
              Wzrost (cm)
              <NumberInput value={client.heightCm} onChange={(heightCm) => set({ heightCm })} />
            </label>
            <label>
              Waga (kg)
              <NumberInput value={client.weightKg} step={0.1} onChange={(weightKg) => set({ weightKg })} />
            </label>
            <label>
              Cel
              <select value={client.goal} onChange={(e) => set({ goal: e.target.value as Goal })}>
                {(Object.keys(GOALS) as Goal[]).map((g) => (
                  <option key={g} value={g}>
                    {GOALS[g].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Aktywność
              <select value={client.activity} onChange={(e) => set({ activity: Number(e.target.value) })}>
                {ACTIVITY_LEVELS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="card">
          <h2>Zapotrzebowanie</h2>
          {kcal === null || !macros ? (
            <p className="muted">Uzupełnij wiek, wzrost i wagę, żeby policzyć zapotrzebowanie kaloryczne.</p>
          ) : (
            <>
              <div className="stats">
                <div>
                  <span className="muted small">Podstawowa przemiana (BMR)</span>
                  <strong>{bmr(client)} kcal</strong>
                </div>
                <div>
                  <span className="muted small">Całkowita przemiana (TDEE)</span>
                  <strong>{tdee(client)} kcal</strong>
                </div>
                <div className="highlight">
                  <span className="muted small">Cel: {GOALS[client.goal].label.toLowerCase()}</span>
                  <strong>{kcal} kcal</strong>
                </div>
              </div>
              <p className="small">
                Wyliczone ze wzoru: <b>B {macros.protein} g</b> · <b>W {macros.carbs} g</b> · <b>T {macros.fat} g</b>
              </p>
              <p className="muted small">
                BMR: wzór Mifflina-St Jeora (najdokładniejszy wg przeglądu Frankenfield i wsp. 2005). Białko{' '}
                {String(PROTEIN_PER_KG[client.goal]).replace('.', ',')} g/kg (ISSN 2017; Morton i wsp. 2018), tłuszcze 25% energii
                (EFSA). To punkt startowy – koryguj co 2–3 tygodnie na podstawie średniej wagi.
              </p>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <ClientMacros
          key={current ? `${current.kcal}-${current.protein}-${current.carbs}-${current.fat}` : 'brak'}
          client={client}
          formula={macros}
          info={macroInfo}
          setInfo={setMacroInfo}
        />
      </section>

      <div className="danger-zone">
        <button className="danger" onClick={removeClient}>
          Usuń podopiecznego
        </button>
      </div>
    </div>
  )
}

/** Makro podopiecznego – zapis aktualizuje też cel najnowszej diety i przelicza jej gramatury */
function ClientMacros({
  client,
  formula,
  info,
  setInfo,
}: {
  client: Client
  formula: Macros | null
  info: string
  setInfo: (s: string) => void
}) {
  const { data, update } = useStore()
  const saved = effectiveTarget(client)
  const [draft, setDraft] = useState<Macros>(saved ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  const diet = data.diets.filter((d) => d.clientId === client.id).sort(newestFirst)[0]
  const changed = !saved || (['kcal', 'protein', 'carbs', 'fat'] as const).some((k) => saved[k] !== draft[k])

  function apply(target: Macros | undefined, effective: Macros) {
    const foods = new Map(data.foods.map((f) => [f.id, f]))
    update((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.id === client.id ? { ...c, target } : c)),
      diets: d.diets.map((x) => {
        if (!diet || x.id !== diet.id) return x
        const fitted = fitItems(x.meals.flatMap((m) => m.items), effective, foods)
        const byId = new Map(fitted.map((i) => [i.id, i]))
        return {
          ...x,
          name: dietNameFor(x.name, effective.kcal),
          target: effective,
          meals: x.meals.map((m) => ({ ...m, items: m.items.map((i) => byId.get(i.id)).filter((i): i is MealItem => !!i) })),
        }
      }),
    }))
    setDraft(effective)
    setInfo(diet ? `Zapisano. Dieta „${dietNameFor(diet.name, effective.kcal)}” została przeliczona pod nowe makro.` : 'Zapisano.')
  }

  return (
    <div>
      <h2>Makro podopiecznego</h2>
      <MacroInputs
        value={draft}
        onChange={(m) => {
          setDraft(m)
          setInfo('')
        }}
        weightKg={client.weightKg}
      />
      <div className="actions">
        <button className="primary" disabled={!changed || draft.kcal <= 0} onClick={() => apply(draft, draft)}>
          {diet ? 'Zapisz i przelicz dietę' : 'Zapisz makro'}
        </button>
        {client.target && formula && <button onClick={() => apply(undefined, formula)}>↺ Przywróć wyliczone ze wzoru</button>}
      </div>
      {info && <p className="small ok-text">✓ {info}</p>}
    </div>
  )
}
