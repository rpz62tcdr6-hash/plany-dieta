import { useState } from 'react'
import { fmt } from '../calc'
import { MEAL_TYPE_LABELS } from '../data/recipes'
import { recipeMacros, recipeTags } from '../generators/diet'
import { href, navigate } from '../router'
import { newId, useStore } from '../store'
import type { MealType, Recipe } from '../types'

export function RecipeTags({ recipe }: { recipe: Recipe }) {
  const { data } = useStore()
  const t = recipeTags(recipe, new Map(data.foods.map((f) => [f.id, f])))
  return (
    <span className="tags">
      {recipe.mealTypes.map((m) => (
        <span key={m} className="tag">
          {MEAL_TYPE_LABELS[m]}
        </span>
      ))}
      {t.vegetarian && <span className="tag green">wege</span>}
      {t.noLactose && <span className="tag outline">bez laktozy</span>}
      {t.noGluten && <span className="tag outline">bez glutenu</span>}
    </span>
  )
}

export function Recipes() {
  const { data, update } = useStore()
  const [type, setType] = useState<MealType | ''>('')
  const [query, setQuery] = useState('')
  const foods = new Map(data.foods.map((f) => [f.id, f]))

  const list = data.recipes
    .filter((r) => (!type || r.mealTypes.includes(type)) && r.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  function add() {
    const recipe: Recipe = { id: newId(), name: 'Nowy przepis', mealTypes: ['obiad'], ingredients: [], instructions: '' }
    update((d) => ({ ...d, recipes: [...d.recipes, recipe] }))
    navigate({ name: 'recipe', id: recipe.id })
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Baza dań</p>
          <h1>Przepisy</h1>
        </div>
        <button className="primary" onClick={add}>
          + Nowy przepis
        </button>
      </div>
      <p className="muted">
        Z tych przepisów generator układa diety. Wartości podane dla bazowej porcji – w diecie gramatury są
        automatycznie przeliczane pod cel podopiecznego.
      </p>

      <div className="filters">
        <input className="search" placeholder="Szukaj przepisu…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips compact">
          <button className={`chip ${type === '' ? 'on' : ''}`} onClick={() => setType('')}>
            Wszystkie ({data.recipes.length})
          </button>
          {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((m) => (
            <button key={m} className={`chip ${type === m ? 'on' : ''}`} onClick={() => setType(m)}>
              {MEAL_TYPE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {list.map((r) => {
          const m = recipeMacros(r, foods)
          return (
            <a key={r.id} className="card recipe-card" href={href({ name: 'recipe', id: r.id })}>
              <strong className="recipe-title">{r.name}</strong>
              <RecipeTags recipe={r} />
              <span className="recipe-macros">
                <b>{fmt(m.kcal)} kcal</b>
                <span>B {fmt(m.protein)}</span>
                <span>W {fmt(m.carbs)}</span>
                <span>T {fmt(m.fat)}</span>
              </span>
            </a>
          )
        })}
      </div>
      {list.length === 0 && <p className="empty">Brak przepisów spełniających kryteria.</p>}
    </div>
  )
}
