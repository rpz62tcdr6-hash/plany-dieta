import { useState } from 'react'
import { ACTIVITY_LEVELS, GOALS, PROTEIN_PER_KG, bmr, dietNameFor, effectiveTarget, formatDate, macroTargets, targetKcal, tdee } from '../calc'
import { MacroInputs } from '../components/MacroInputs'
import { fitItems } from '../generators/diet'
import { DietPreview } from '../components/DietPreview'
import { NumberInput } from '../components/NumberInput'
import { PlanPreview } from '../components/PlanPreview'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Client, Diet, Goal, Macros, MealItem, TrainingPlan } from '../types'

const newestFirst = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

export function ClientDetail({ id }: { id: string }) {
  const { data, update } = useStore()
  const [macroInfo, setMacroInfo] = useState('')
  const client = data.clients.find((c) => c.id === id)

  if (!client) {
    return (
      <div className="empty">
        <p>Nie znaleziono podopiecznego.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const plans = data.plans.filter((p) => p.clientId === id).sort(newestFirst)
  const diets = data.diets.filter((d) => d.clientId === id).sort(newestFirst)
  const kcal = targetKcal(client)
  const macros = kcal !== null ? macroTargets(client, kcal) : null
  const missingData = kcal === null
  const current = effectiveTarget(client)

  function set(patch: Partial<Client>) {
    update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
  }

  function removeClient() {
    if (!confirm(`Usunąć podopiecznego „${client!.name}” razem z jego planami i dietami?`)) return
    update((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== id),
      plans: d.plans.filter((p) => p.clientId !== id),
      diets: d.diets.filter((x) => x.clientId !== id),
    }))
    navigate({ name: 'clients' })
  }

  function duplicatePlan(p: TrainingPlan) {
    const copy: TrainingPlan = {
      ...structuredClone(p),
      id: newId(),
      name: `${p.name} (kopia)`,
      createdAt: new Date().toISOString(),
    }
    copy.sessions = []
    update((d) => ({ ...d, plans: [...d.plans, copy] }))
  }

  function duplicateDiet(x: Diet) {
    const copy: Diet = { ...structuredClone(x), id: newId(), name: `${x.name} (kopia)`, createdAt: new Date().toISOString() }
    update((d) => ({ ...d, diets: [...d.diets, copy] }))
  }

  function removePlan(p: TrainingPlan) {
    if (confirm(`Usunąć plan „${p.name}” razem z historią treningów?`))
      update((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }))
  }

  function removeDiet(x: Diet) {
    if (confirm(`Usunąć dietę „${x.name}”?`)) update((d) => ({ ...d, diets: d.diets.filter((y) => y.id !== x.id) }))
  }

  return (
    <div>
      <a className="back" href={href({ name: 'clients' })}>
        ← Podopieczni
      </a>
      <div className="client-hero">
        <div>
          <p className="eyebrow">{GOALS[client.goal].label}</p>
          <h1>{client.name || 'Bez imienia'}</h1>
        </div>
        <div className="hero-stats">
          <div>
            <span>Waga</span>
            <strong>{client.weightKg ? `${client.weightKg} kg` : '—'}</strong>
          </div>
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

      {/* ——— Plany ——— */}
      <div className="section-title">
        <h2>Plan treningowy</h2>
        <button className="primary" onClick={() => navigate({ name: 'plan-new', id })}>
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
              <strong>{p.name}</strong>
              <span className="muted small">
                {p.days.length} dni · {formatDate(p.createdAt)}
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
          <PlanPreview plan={p} />
        </details>
      ))}

      {/* ——— Diety ——— */}
      <div className="section-title">
        <h2>Dieta</h2>
        <button className="primary" onClick={() => navigate({ name: 'diet-new', id })}>
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
              <strong>{x.name}</strong>
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

      {/* ——— Dane ——— */}
      <div className="section-title">
        <h2>Dane i zapotrzebowanie</h2>
      </div>
      <details className="card fold" open={missingData}>
        <summary>
          <div className="fold-title">
            <strong>
              {client.sex === 'K' ? 'Kobieta' : 'Mężczyzna'}
              {client.age ? `, ${client.age} lat` : ''}
              {client.heightCm ? `, ${client.heightCm} cm` : ''}
            </strong>
            <span className="muted small">{missingData ? 'Uzupełnij dane, żeby policzyć kalorie' : 'Kliknij, żeby edytować'}</span>
          </div>
        </summary>
        <div className="two-col">
          <div className="form">
            <label>
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
            <label className="full">
              Notatki (kontuzje, preferencje, alergie…)
              <textarea rows={3} value={client.notes} onChange={(e) => set({ notes: e.target.value })} />
            </label>
          </div>

          <div>
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
                  {String(PROTEIN_PER_KG[client.goal]).replace('.', ',')} g/kg (ISSN 2017; Morton i wsp. 2018), tłuszcze 25%
                  energii (EFSA). To punkt startowy – koryguj co 2–3 tygodnie na podstawie średniej wagi.
                </p>
              </>
            )}
          </div>
        </div>
        <ClientMacros
          key={current ? `${current.kcal}-${current.protein}-${current.carbs}-${current.fat}` : 'brak'}
          client={client}
          formula={macros}
          info={macroInfo}
          setInfo={setMacroInfo}
        />
        <div className="danger-zone">
          <button className="danger" onClick={removeClient}>
            Usuń podopiecznego
          </button>
        </div>
      </details>
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
  const diet = data.diets.filter((d) => d.clientId === client.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
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
    <div className="client-macros">
      <h3>Makro podopiecznego</h3>
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
        {client.target && formula && (
          <button onClick={() => apply(undefined, formula)}>↺ Przywróć wyliczone ze wzoru</button>
        )}
      </div>
      {info && <p className="small ok-text">✓ {info}</p>}
    </div>
  )
}
