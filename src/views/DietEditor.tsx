import { useState } from 'react'
import { fmt, foodMacros, sumMacros } from '../calc'
import { FoodSelect } from '../components/FoodSelect'
import { MacroInputs } from '../components/MacroInputs'
import { MacroSummary } from '../components/MacroSummary'
import { NumberInput } from '../components/NumberInput'
import { ProteinBadge } from '../components/ProteinBadge'
import { MEAL_TYPE_LABELS } from '../data/recipes'
import { NO_PREFS, fitItems, generateMeals, recipeAllowed, recipeMacros, rerollMeal } from '../generators/diet'
import { href } from '../router'
import { move, newId, useStore } from '../store'
import type { Diet, Meal, MealItem } from '../types'

export function DietEditor({ id }: { id: string }) {
  const { data, update } = useStore()
  const [editTarget, setEditTarget] = useState(false)
  const diet = data.diets.find((d) => d.id === id)

  if (!diet) {
    return (
      <div className="empty">
        <p>Nie znaleziono diety.</p>
        <a href={href({ name: 'clients' })}>← Wróć do listy</a>
      </div>
    )
  }

  const client = data.clients.find((c) => c.id === diet.clientId)
  const prefs = diet.prefs ?? NO_PREFS
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const itemMacros = (item: MealItem) => foodMacros(foodById.get(item.foodId), item.grams)
  const mealTotal = (meal: Meal) => sumMacros(meal.items.map(itemMacros))
  const dayTotal = sumMacros(diet.meals.map(mealTotal))
  const shareOf = (meal: Meal) => meal.share ?? 1 / diet.meals.length

  function setDiet(fn: (d: Diet) => Diet) {
    update((d) => ({ ...d, diets: d.diets.map((x) => (x.id === id ? fn(x) : x)) }))
  }

  function setMeals(fn: (meals: Meal[]) => Meal[]) {
    setDiet((d) => ({ ...d, meals: fn(d.meals) }))
  }

  function setMeal(mealId: string, fn: (meal: Meal) => Meal) {
    setMeals((meals) => meals.map((m) => (m.id === mealId ? fn(m) : m)))
  }

  function setItem(mealId: string, itemId: string, patch: Partial<MealItem>) {
    setMeal(mealId, (m) => ({ ...m, items: m.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }))
  }

  function addItem(mealId: string) {
    const item: MealItem = { id: newId(), foodId: data.foods[0]?.id ?? '', grams: 100 }
    setMeal(mealId, (m) => ({ ...m, items: [...m.items, item] }))
  }

  function reroll(meal: Meal, recipeId?: string) {
    const next = rerollMeal(meal, diet!.target, shareOf(meal), data.recipes, data.foods, prefs, recipeId)
    if (!next) return alert('Brak innych pasujących przepisów dla tego posiłku. Dodaj własne w zakładce Przepisy.')
    setMeal(meal.id, () => next)
  }

  function fitDay() {
    const fitted = fitItems(diet!.meals.flatMap((m) => m.items), diet!.target, foodById)
    const byId = new Map(fitted.map((i) => [i.id, i]))
    setMeals((ms) => ms.map((m) => ({ ...m, items: m.items.map((i) => byId.get(i.id) ?? i) })))
  }

  function regenerateAll() {
    if (!confirm('Wylosować przepisy do wszystkich posiłków od nowa? Obecne posiłki zostaną zastąpione.')) return
    const count = Math.min(6, Math.max(3, diet!.meals.length))
    const { meals } = generateMeals({ target: diet!.target, mealsCount: count, prefs }, data.recipes, data.foods)
    setDiet((d) => ({ ...d, meals }))
  }

  return (
    <div>
      <a className="back" href={href(client ? { name: 'client', id: client.id } : { name: 'clients' })}>
        ← {client?.name ?? 'Podopieczni'}
      </a>
      <div className="page-head">
        <input
          className="title-input"
          value={diet.name}
          onChange={(e) => setDiet((d) => ({ ...d, name: e.target.value }))}
          aria-label="Nazwa diety"
        />
        <span className="actions">
          <button onClick={fitDay} title="Przelicz gramatury wszystkich produktów, żeby trafić w cel">
            ⚖ Dopasuj gramatury
          </button>
          <button onClick={regenerateAll}>🔄 Losuj całą dietę</button>
          <a className="button primary" href={href({ name: 'print-diet', id })}>
            Podgląd / PDF
          </a>
        </span>
      </div>

      <section className="card summary-card sticky-summary">
        <div className="section-head">
          <h2>Podsumowanie dnia</h2>
          <button className="small-btn" onClick={() => setEditTarget((v) => !v)}>
            {editTarget ? 'Gotowe' : '✎ Zmień cel'}
          </button>
        </div>
        {editTarget && (
          <div className="target-edit">
            <MacroInputs
              value={diet.target}
              onChange={(target) => setDiet((d) => ({ ...d, target }))}
              weightKg={client?.weightKg ?? 0}
            />
            <p className="muted small">
              Po zmianie celu kliknij „Dopasuj gramatury” – ilości produktów przeliczą się pod nowy cel.
            </p>
          </div>
        )}
        <MacroSummary total={dayTotal} target={diet.target} />
      </section>

      <section className="card">
        <label className="block">
          Zalecenia (nawodnienie, suplementy, zamienniki…)
          <textarea rows={2} value={diet.notes} onChange={(e) => setDiet((d) => ({ ...d, notes: e.target.value }))} />
        </label>
      </section>

      {diet.meals.map((meal, mi) => {
        const total = mealTotal(meal)
        const goalKcal = diet.target.kcal * shareOf(meal)
        const options = data.recipes
          .filter((r) => (!meal.type || r.mealTypes.includes(meal.type)) && recipeAllowed(r, foodById, prefs))
          .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
        return (
          <section className="card meal-card" key={meal.id}>
            <div className="meal-head">
              <div className="meal-title">
                <input
                  className="day-name"
                  value={meal.name}
                  onChange={(e) => setMeal(meal.id, (m) => ({ ...m, name: e.target.value }))}
                  aria-label="Nazwa posiłku"
                />
                <span className="meal-kcal">
                  <strong>{fmt(total.kcal)}</strong> / {fmt(goalKcal)} kcal
                </span>
                <ProteinBadge protein={total.protein} weightKg={client?.weightKg ?? 0} snack={meal.type === 'przekaska'} />
              </div>
              <span className="actions">
                <button disabled={mi === 0} onClick={() => setMeals((ms) => move(ms, mi, -1))} title="W górę">
                  ↑
                </button>
                <button
                  disabled={mi === diet.meals.length - 1}
                  onClick={() => setMeals((ms) => move(ms, mi, 1))}
                  title="W dół"
                >
                  ↓
                </button>
                <button
                  className="danger"
                  title="Usuń posiłek"
                  onClick={() => {
                    if (confirm(`Usunąć posiłek „${meal.name}”?`)) setMeals((ms) => ms.filter((m) => m.id !== meal.id))
                  }}
                >
                  ✕
                </button>
              </span>
            </div>

            <div className="recipe-bar">
              <div className="recipe-name">
                {meal.recipeName ? (
                  <>
                    <span className="eyebrow">Przepis</span>
                    <strong>{meal.recipeName}</strong>
                  </>
                ) : (
                  <span className="muted">Bez przepisu – dobierz lub dodaj produkty ręcznie</span>
                )}
              </div>
              <div className="actions">
                <button className="dark" onClick={() => reroll(meal)}>
                  🔄 Inny przepis
                </button>
                <select
                  className="recipe-select"
                  value=""
                  onChange={(e) => e.target.value && reroll(meal, e.target.value)}
                  aria-label="Wybierz przepis"
                >
                  <option value="">Wybierz przepis…</option>
                  {options.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({fmt(recipeMacros(r, foodById).kcal)} kcal)
                    </option>
                  ))}
                </select>
                <select
                  className="type-select"
                  value={meal.type ?? ''}
                  onChange={(e) =>
                    setMeal(meal.id, (m) => ({ ...m, type: (e.target.value || undefined) as Meal['type'] }))
                  }
                  aria-label="Rodzaj posiłku"
                  title="Z jakiej kategorii dobierać przepisy"
                >
                  <option value="">Wszystkie przepisy</option>
                  {Object.entries(MEAL_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {meal.items.length > 0 && (
              <div className="table-wrap">
                <table className="edit-table food-table">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th>Gramy</th>
                      <th className="num">kcal</th>
                      <th className="num">B</th>
                      <th className="num">W</th>
                      <th className="num">T</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {meal.items.map((item) => {
                      const m = itemMacros(item)
                      return (
                        <tr key={item.id}>
                          <td className="wide" data-label="Produkt">
                            <FoodSelect
                              foods={data.foods}
                              value={item.foodId}
                              onChange={(foodId) => setItem(meal.id, item.id, { foodId })}
                            />
                          </td>
                          <td data-label="Gramy">
                            <NumberInput
                              className="narrow"
                              step={5}
                              value={item.grams}
                              onChange={(grams) => setItem(meal.id, item.id, { grams })}
                            />
                          </td>
                          <td className="num" data-label="kcal">
                            {fmt(m.kcal)}
                          </td>
                          <td className="num" data-label="B">
                            {fmt(m.protein, 1)}
                          </td>
                          <td className="num" data-label="W">
                            {fmt(m.carbs, 1)}
                          </td>
                          <td className="num" data-label="T">
                            {fmt(m.fat, 1)}
                          </td>
                          <td className="row-actions">
                            <button
                              className="danger"
                              title="Usuń"
                              onClick={() =>
                                setMeal(meal.id, (x) => ({ ...x, items: x.items.filter((i) => i.id !== item.id) }))
                              }
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="total-row">
                      <td>Razem</td>
                      <td></td>
                      <td className="num" data-label="kcal">
                        {fmt(total.kcal)}
                      </td>
                      <td className="num" data-label="B">
                        {fmt(total.protein, 1)}
                      </td>
                      <td className="num" data-label="W">
                        {fmt(total.carbs, 1)}
                      </td>
                      <td className="num" data-label="T">
                        {fmt(total.fat, 1)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {meal.recipeName && (
              <details className="instructions">
                <summary>Sposób przygotowania</summary>
                <textarea
                  rows={3}
                  value={meal.instructions ?? ''}
                  onChange={(e) => setMeal(meal.id, (m) => ({ ...m, instructions: e.target.value }))}
                />
              </details>
            )}
            <button onClick={() => addItem(meal.id)}>+ Dodaj produkt</button>
          </section>
        )
      })}

      <button
        className="primary"
        onClick={() =>
          setMeals((ms) => [...ms, { id: newId(), name: `Posiłek ${ms.length + 1}`, type: 'przekaska', share: 0.1, items: [] }])
        }
      >
        + Dodaj posiłek
      </button>
      <p className="muted small">
        Brakuje przepisu albo produktu? Dodasz je w zakładkach <a href={href({ name: 'recipes' })}>Przepisy</a> i{' '}
        <a href={href({ name: 'library' })}>Biblioteka</a>.
      </p>
    </div>
  )
}
