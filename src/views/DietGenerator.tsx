import { useState } from 'react'
import { macroTargets, targetKcal } from '../calc'
import { ChoiceChips } from '../components/Chips'
import { MacroInputs } from '../components/MacroInputs'
import { MEAL_LAYOUTS, NO_PREFS, generateMeals } from '../generators/diet'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Diet, DietPrefs, Macros } from '../types'

export function DietGenerator({ clientId }: { clientId: string }) {
  const { data, update } = useStore()
  const client = data.clients.find((c) => c.id === clientId)
  const [target, setTarget] = useState<Macros>(() => {
    const kcal = client ? targetKcal(client) : null
    return client && kcal !== null ? macroTargets(client, kcal) : { kcal: 2000, protein: 0, carbs: 0, fat: 0 }
  })
  const [mealsCount, setMealsCount] = useState(5)
  const [prefs, setPrefs] = useState<DietPrefs>(NO_PREFS)

  if (!client) {
    return (
      <div className="empty">
        <p>Nie znaleziono podopiecznego.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  function save(diet: Omit<Diet, 'id' | 'clientId' | 'createdAt'>) {
    const full: Diet = { ...diet, id: newId(), clientId, createdAt: new Date().toISOString() }
    update((d) => ({ ...d, diets: [...d.diets, full] }))
    navigate({ name: 'diet', id: full.id })
  }

  function generate() {
    const { meals, missing } = generateMeals({ target, mealsCount, prefs }, data.recipes, data.foods)
    if (missing.length) {
      alert(`Brak pasujących przepisów dla: ${missing.join(', ')}. Dodaj własne przepisy albo złagodź preferencje.`)
    }
    save({ name: `Dieta ${target.kcal} kcal`, notes: '', target, prefs, meals })
  }

  function empty() {
    const meals = MEAL_LAYOUTS[mealsCount].map((m) => ({ id: newId(), name: m.name, type: m.type, share: m.share, items: [] }))
    save({ name: 'Dieta', notes: '', target, prefs, meals })
  }

  const toggle = (key: keyof DietPrefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  return (
    <div>
      <a className="back" href={href({ name: 'client', id: clientId })}>
        ← {client.name}
      </a>
      <div className="page-head">
        <div>
          <p className="eyebrow">Nowa dieta</p>
          <h1>Założenia diety</h1>
        </div>
      </div>

      <section className="card step">
        <h2>
          <span className="step-no">1</span> Kalorie i makroskładniki
        </h2>
        <p className="muted small">Wstępnie wyliczone z danych podopiecznego – możesz wpisać własne.</p>
        <MacroInputs value={target} onChange={setTarget} />
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">2</span> Liczba posiłków
        </h2>
        <ChoiceChips
          options={[3, 4, 5, 6].map((n) => ({
            value: n,
            label: `${n}`,
            hint: MEAL_LAYOUTS[n].map((m) => m.name.split(' ')[0]).join(' · '),
          }))}
          value={mealsCount}
          onChange={setMealsCount}
        />
      </section>

      <section className="card step">
        <h2>
          <span className="step-no">3</span> Preferencje <span className="muted small">(opcjonalnie)</span>
        </h2>
        <div className="chips">
          {(
            [
              ['vegetarian', 'Wegetariańska'],
              ['noLactose', 'Bez laktozy'],
              ['noGluten', 'Bez glutenu'],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={prefs[key]}
              className={`chip ${prefs[key] ? 'on' : ''}`}
              onClick={() => toggle(key)}
            >
              <span>
                {prefs[key] ? '✓ ' : ''}
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="sticky-actions">
        <button className="ghost" onClick={empty}>
          Pusta dieta
        </button>
        <button className="primary big" onClick={generate}>
          ⚡ Dobierz przepisy
        </button>
      </div>
    </div>
  )
}
