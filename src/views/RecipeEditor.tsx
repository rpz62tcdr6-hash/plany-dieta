import { fmt, foodMacros, sumMacros } from '../calc'
import { FoodSelect } from '../components/FoodSelect'
import { NumberInput } from '../components/NumberInput'
import { MEAL_TYPE_LABELS } from '../data/recipes'
import { href, navigate } from '../router'
import { useStore } from '../store'
import type { MealType, Recipe } from '../types'
import { RecipeTags } from './Recipes'

export function RecipeEditor({ id }: { id: string }) {
  const { data, update } = useStore()
  const recipe = data.recipes.find((r) => r.id === id)

  if (!recipe) {
    return (
      <div className="empty">
        <p>Nie znaleziono przepisu.</p>
        <a href={href({ name: 'recipes' })}>← Wróć do przepisów</a>
      </div>
    )
  }

  const foods = new Map(data.foods.map((f) => [f.id, f]))
  const total = sumMacros(recipe.ingredients.map((i) => foodMacros(foods.get(i.foodId), i.grams)))

  function set(fn: (r: Recipe) => Recipe) {
    update((d) => ({ ...d, recipes: d.recipes.map((r) => (r.id === id ? fn(r) : r)) }))
  }

  function toggleType(t: MealType) {
    set((r) => ({
      ...r,
      mealTypes: r.mealTypes.includes(t) ? r.mealTypes.filter((x) => x !== t) : [...r.mealTypes, t],
    }))
  }

  function remove() {
    if (!confirm(`Usunąć przepis „${recipe!.name}”? Diety, które go używają, zachowają swoje produkty.`)) return
    update((d) => ({ ...d, recipes: d.recipes.filter((r) => r.id !== id) }))
    navigate({ name: 'recipes' })
  }

  return (
    <div>
      <a className="back" href={href({ name: 'recipes' })}>
        ← Przepisy
      </a>
      <div className="page-head">
        <input
          className="title-input"
          value={recipe.name}
          onChange={(e) => set((r) => ({ ...r, name: e.target.value }))}
          aria-label="Nazwa przepisu"
        />
        <button className="danger" onClick={remove}>
          Usuń przepis
        </button>
      </div>

      <section className="card">
        <h2>Na jaki posiłek?</h2>
        <div className="chips">
          {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={recipe.mealTypes.includes(t)}
              className={`chip ${recipe.mealTypes.includes(t) ? 'on' : ''}`}
              onClick={() => toggleType(t)}
            >
              <span>
                {recipe.mealTypes.includes(t) ? '✓ ' : ''}
                {MEAL_TYPE_LABELS[t]}
              </span>
            </button>
          ))}
        </div>
        <p className="small">
          <RecipeTags recipe={recipe} />
        </p>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Składniki (porcja bazowa)</h2>
          <span className="recipe-macros">
            <b>{fmt(total.kcal)} kcal</b>
            <span>B {fmt(total.protein)}</span>
            <span>W {fmt(total.carbs)}</span>
            <span>T {fmt(total.fat)}</span>
          </span>
        </div>
        {recipe.ingredients.length > 0 && (
          <div className="table-wrap">
            <table className="edit-table food-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th>Gramy</th>
                  <th className="num">kcal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing, n) => (
                  <tr key={n}>
                    <td className="wide" data-label="Produkt">
                      <FoodSelect
                        foods={data.foods}
                        value={ing.foodId}
                        onChange={(foodId) =>
                          set((r) => ({ ...r, ingredients: r.ingredients.map((x, k) => (k === n ? { ...x, foodId } : x)) }))
                        }
                      />
                    </td>
                    <td data-label="Gramy">
                      <NumberInput
                        className="narrow"
                        step={5}
                        value={ing.grams}
                        onChange={(grams) =>
                          set((r) => ({ ...r, ingredients: r.ingredients.map((x, k) => (k === n ? { ...x, grams } : x)) }))
                        }
                      />
                    </td>
                    <td className="num" data-label="kcal">
                      {fmt(foodMacros(foods.get(ing.foodId), ing.grams).kcal)}
                    </td>
                    <td className="row-actions">
                      <button
                        className="danger"
                        title="Usuń"
                        onClick={() => set((r) => ({ ...r, ingredients: r.ingredients.filter((_, k) => k !== n) }))}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          onClick={() =>
            set((r) => ({ ...r, ingredients: [...r.ingredients, { foodId: data.foods[0]?.id ?? '', grams: 100 }] }))
          }
        >
          + Dodaj składnik
        </button>
      </section>

      <section className="card">
        <label className="block">
          Sposób przygotowania
          <textarea
            rows={5}
            value={recipe.instructions}
            onChange={(e) => set((r) => ({ ...r, instructions: e.target.value }))}
          />
        </label>
      </section>
    </div>
  )
}
