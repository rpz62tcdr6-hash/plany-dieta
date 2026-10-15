import { fmt, foodMacros, macroTargets, sumMacros } from '../calc'
import { FoodSelect } from '../components/FoodSelect'
import { MacroSummary } from '../components/MacroSummary'
import { NumberInput } from '../components/NumberInput'
import { href } from '../router'
import { move, newId, useStore } from '../store'
import type { Diet, Meal, MealItem } from '../types'

export function DietEditor({ id }: { id: string }) {
  const { data, update } = useStore()
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
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const itemMacros = (item: MealItem) => foodMacros(foodById.get(item.foodId), item.grams)
  const mealTotal = (meal: Meal) => sumMacros(meal.items.map(itemMacros))
  const dayTotal = sumMacros(diet.meals.map(mealTotal))
  const target = client && client.weightKg > 0 ? macroTargets(client, diet.targetKcal) : null

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
        <a className="button primary" href={href({ name: 'print-diet', id })}>
          Podgląd / PDF
        </a>
      </div>

      <section className="card sticky-summary">
        <div className="section-head">
          <h2>Podsumowanie dnia</h2>
          <label className="inline">
            Cel kcal:
            <NumberInput
              className="narrow"
              step={10}
              value={diet.targetKcal}
              onChange={(targetKcal) => setDiet((d) => ({ ...d, targetKcal }))}
            />
          </label>
        </div>
        <MacroSummary total={dayTotal} target={target ?? { kcal: diet.targetKcal, protein: 0, carbs: 0, fat: 0 }} />
      </section>

      <section className="card">
        <label className="block">
          Zalecenia (nawodnienie, suplementy, zamienniki…)
          <textarea rows={2} value={diet.notes} onChange={(e) => setDiet((d) => ({ ...d, notes: e.target.value }))} />
        </label>
      </section>

      {diet.meals.map((meal, mi) => {
        const total = mealTotal(meal)
        return (
          <section className="card" key={meal.id}>
            <div className="section-head">
              <input
                className="day-name"
                value={meal.name}
                onChange={(e) => setMeal(meal.id, (m) => ({ ...m, name: e.target.value }))}
                aria-label="Nazwa posiłku"
              />
              <span className="actions">
                <span className="muted small">{fmt(total.kcal)} kcal</span>
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
                  onClick={() => {
                    if (confirm(`Usunąć posiłek „${meal.name}”?`)) setMeals((ms) => ms.filter((m) => m.id !== meal.id))
                  }}
                >
                  Usuń posiłek
                </button>
              </span>
            </div>

            {meal.items.length > 0 && (
              <div className="table-wrap">
                <table className="edit-table">
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
                          <td className="wide">
                            <FoodSelect
                              foods={data.foods}
                              value={item.foodId}
                              onChange={(foodId) => setItem(meal.id, item.id, { foodId })}
                            />
                          </td>
                          <td>
                            <NumberInput
                              className="narrow"
                              step={5}
                              value={item.grams}
                              onChange={(grams) => setItem(meal.id, item.id, { grams })}
                            />
                          </td>
                          <td className="num">{fmt(m.kcal)}</td>
                          <td className="num">{fmt(m.protein, 1)}</td>
                          <td className="num">{fmt(m.carbs, 1)}</td>
                          <td className="num">{fmt(m.fat, 1)}</td>
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
                      <td className="num">{fmt(total.kcal)}</td>
                      <td className="num">{fmt(total.protein, 1)}</td>
                      <td className="num">{fmt(total.carbs, 1)}</td>
                      <td className="num">{fmt(total.fat, 1)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => addItem(meal.id)}>+ Dodaj produkt</button>
          </section>
        )
      })}

      <button
        className="primary"
        onClick={() => setMeals((ms) => [...ms, { id: newId(), name: `Posiłek ${ms.length + 1}`, items: [] }])}
      >
        + Dodaj posiłek
      </button>
      <p className="muted small">
        Brakuje produktu? Dodasz go w zakładce <a href={href({ name: 'library' })}>Biblioteka</a>.
      </p>
    </div>
  )
}
