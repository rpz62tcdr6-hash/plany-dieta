import { ACTIVITY_LEVELS, GOALS, bmr, formatDate, macroTargets, targetKcal, tdee } from '../calc'
import { NumberInput } from '../components/NumberInput'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Client, Diet, Goal, TrainingPlan } from '../types'

export function ClientDetail({ id }: { id: string }) {
  const { data, update } = useStore()
  const client = data.clients.find((c) => c.id === id)

  if (!client) {
    return (
      <div className="empty">
        <p>Nie znaleziono podopiecznego.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const plans = data.plans.filter((p) => p.clientId === id)
  const diets = data.diets.filter((d) => d.clientId === id)
  const kcal = targetKcal(client)
  const macros = kcal !== null ? macroTargets(client, kcal) : null

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

  function addPlan() {
    const plan: TrainingPlan = {
      id: newId(),
      clientId: id,
      name: 'Plan treningowy',
      notes: '',
      days: [{ id: newId(), name: 'Dzień A', exercises: [] }],
      createdAt: new Date().toISOString(),
    }
    update((d) => ({ ...d, plans: [...d.plans, plan] }))
    navigate({ name: 'plan', id: plan.id })
  }

  function addDiet() {
    const diet: Diet = {
      id: newId(),
      clientId: id,
      name: 'Dieta',
      notes: '',
      targetKcal: kcal ?? 2000,
      meals: ['Śniadanie', 'II śniadanie', 'Obiad', 'Podwieczorek', 'Kolacja'].map((name) => ({
        id: newId(),
        name,
        items: [],
      })),
      createdAt: new Date().toISOString(),
    }
    update((d) => ({ ...d, diets: [...d.diets, diet] }))
    navigate({ name: 'diet', id: diet.id })
  }

  function duplicatePlan(p: TrainingPlan) {
    const copy: TrainingPlan = {
      ...structuredClone(p),
      id: newId(),
      name: `${p.name} (kopia)`,
      createdAt: new Date().toISOString(),
    }
    update((d) => ({ ...d, plans: [...d.plans, copy] }))
  }

  function duplicateDiet(x: Diet) {
    const copy: Diet = {
      ...structuredClone(x),
      id: newId(),
      name: `${x.name} (kopia)`,
      createdAt: new Date().toISOString(),
    }
    update((d) => ({ ...d, diets: [...d.diets, copy] }))
  }

  function removePlan(p: TrainingPlan) {
    if (confirm(`Usunąć plan „${p.name}”?`)) update((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== p.id) }))
  }

  function removeDiet(x: Diet) {
    if (confirm(`Usunąć dietę „${x.name}”?`)) update((d) => ({ ...d, diets: d.diets.filter((y) => y.id !== x.id) }))
  }

  return (
    <div>
      <a className="back" href={href({ name: 'clients' })}>
        ← Podopieczni
      </a>
      <div className="page-head">
        <h1>{client.name || 'Bez imienia'}</h1>
        <button className="danger" onClick={removeClient}>
          Usuń podopiecznego
        </button>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Dane</h2>
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
                Proponowane makro: <b>B {macros.protein} g</b> · <b>W {macros.carbs} g</b> · <b>T {macros.fat} g</b>
              </p>
              <p className="muted small">
                Wzór Mifflina-St Jeora. To punkt startowy – koryguj na podstawie zmian wagi podopiecznego.
              </p>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <div className="section-head">
          <h2>Plany treningowe</h2>
          <button className="primary" onClick={addPlan}>
            + Nowy plan
          </button>
        </div>
        {plans.length === 0 ? (
          <p className="muted">Brak planów.</p>
        ) : (
          <ul className="list">
            {plans.map((p) => (
              <li key={p.id}>
                <a href={href({ name: 'plan', id: p.id })}>
                  <strong>{p.name}</strong>
                  <span className="muted small">
                    {' '}
                    · {p.days.length} dni · {formatDate(p.createdAt)}
                  </span>
                </a>
                <span className="actions">
                  <a className="button" href={href({ name: 'print-plan', id: p.id })}>
                    PDF
                  </a>
                  <button onClick={() => duplicatePlan(p)}>Duplikuj</button>
                  <button className="danger" onClick={() => removePlan(p)}>
                    Usuń
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Diety</h2>
          <button className="primary" onClick={addDiet}>
            + Nowa dieta
          </button>
        </div>
        {diets.length === 0 ? (
          <p className="muted">Brak diet.</p>
        ) : (
          <ul className="list">
            {diets.map((x) => (
              <li key={x.id}>
                <a href={href({ name: 'diet', id: x.id })}>
                  <strong>{x.name}</strong>
                  <span className="muted small">
                    {' '}
                    · {x.targetKcal} kcal · {formatDate(x.createdAt)}
                  </span>
                </a>
                <span className="actions">
                  <a className="button" href={href({ name: 'print-diet', id: x.id })}>
                    PDF
                  </a>
                  <button onClick={() => duplicateDiet(x)}>Duplikuj</button>
                  <button className="danger" onClick={() => removeDiet(x)}>
                    Usuń
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
