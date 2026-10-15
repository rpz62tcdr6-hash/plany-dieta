import { useState } from 'react'
import { effectiveTarget } from '../calc'
import { ChoiceChips } from '../components/Chips'
import { MacroInputs } from '../components/MacroInputs'
import { MEAL_LAYOUTS, NO_PREFS, generateMeals } from '../generators/diet'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { Diet, DietPrefs, Macros } from '../types'

/** Ogólne zalecenia dopisywane do nowej diety */
function dietNotes(sex: 'M' | 'K'): string {
  return [
    `Nawodnienie: ok. ${sex === 'K' ? '2,0' : '2,5'} l wody dziennie (z napojów i jedzenia) + uzupełnianie strat potu na treningu (EFSA 2010).`,
    'Białko rozkładaj równomiernie – ok. 0,25–0,4 g/kg masy ciała w każdym głównym posiłku, co 3–4 h (ISSN 2017; Schoenfeld i Aragon 2018).',
    'Warzywa i owoce: min. 400 g dziennie (WHO); błonnik ok. 25 g dziennie (EFSA).',
    'Kontrola: waż się 3–4× w tygodniu rano i patrz na średnią tygodniową – na redukcji celuj w spadek 0,5–1% masy ciała tygodniowo.',
  ].join('\n')
}

export function DietGenerator({ clientId }: { clientId: string }) {
  const { data, update } = useStore()
  const client = data.clients.find((c) => c.id === clientId)
  const [target, setTarget] = useState<Macros>(
    () => (client && effectiveTarget(client)) || { kcal: 2000, protein: 0, carbs: 0, fat: 0 },
  )
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
    update((d) => ({
      ...d,
      diets: [...d.diets, full],
      clients: d.clients.map((c) => (c.id === clientId ? { ...c, target: diet.target } : c)),
    }))
    navigate({ name: 'diet', id: full.id })
  }

  function generate() {
    const { meals, missing } = generateMeals({ target, mealsCount, prefs }, data.recipes, data.foods)
    if (missing.length) {
      alert(`Brak pasujących przepisów dla: ${missing.join(', ')}. Dodaj własne przepisy albo złagodź preferencje.`)
    }
    save({ name: `Dieta ${target.kcal} kcal`, notes: dietNotes(client!.sex), target, prefs, meals })
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
        <p className="muted small">Aktualne makro podopiecznego – możesz je zmienić. Kalorie przeliczą się same.</p>
        <MacroInputs value={target} onChange={setTarget} weightKg={client.weightKg} />
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
