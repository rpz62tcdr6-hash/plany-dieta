import { fmt, foodMacros, formatDate, sumMacros } from '../calc'
import { href } from '../router'
import { useStore } from '../store'
import type { MealItem } from '../types'

export function PrintDiet({ id }: { id: string }) {
  const { data } = useStore()
  const diet = data.diets.find((d) => d.id === id)
  if (!diet) return <p className="empty">Nie znaleziono diety.</p>

  const client = data.clients.find((c) => c.id === diet.clientId)
  const foodById = new Map(data.foods.map((f) => [f.id, f]))
  const itemMacros = (i: MealItem) => foodMacros(foodById.get(i.foodId), i.grams)
  const mealTotals = diet.meals.map((m) => sumMacros(m.items.map(itemMacros)))
  const day = sumMacros(mealTotals)
  const target = diet.target

  return (
    <div className="print-page">
      <div className="no-print print-toolbar">
        <a href={href({ name: 'diet', id })}>← Wróć do edycji</a>
        <button className="primary" onClick={() => window.print()}>
          Drukuj / Zapisz jako PDF
        </button>
      </div>

      <header className="print-header">
        <h1>{diet.name}</h1>
        <p>
          {client && <strong>{client.name}</strong>} · {formatDate(new Date().toISOString())}
        </p>
        <p>
          Dziennie: <strong>{fmt(day.kcal)} kcal</strong> · białko {fmt(day.protein)} g · węglowodany{' '}
          {fmt(day.carbs)} g · tłuszcze {fmt(day.fat)} g
          {target.kcal > 0 && (
            <span className="muted">
              {' '}
              (cel: {fmt(target.kcal)} kcal, B {target.protein} g, W {target.carbs} g, T {target.fat} g)
            </span>
          )}
        </p>
      </header>
      {diet.notes && <p className="print-notes">{diet.notes}</p>}

      {diet.meals.map((meal, mi) => (
        <section key={meal.id} className="print-section">
          <h2>
            {meal.name}
            {meal.recipeName && <span className="print-recipe"> · {meal.recipeName}</span>}
            <span className="print-kcal">{fmt(mealTotals[mi].kcal)} kcal</span>
          </h2>
          {meal.items.length === 0 ? (
            <p className="muted">Brak produktów.</p>
          ) : (
            <table className="print-table">
              <thead>
                <tr>
                  <th>Produkt</th>
                  <th className="num">Ilość</th>
                  <th className="num">kcal</th>
                  <th className="num">B</th>
                  <th className="num">W</th>
                  <th className="num">T</th>
                </tr>
              </thead>
              <tbody>
                {meal.items.map((item) => {
                  const m = itemMacros(item)
                  return (
                    <tr key={item.id}>
                      <td>{foodById.get(item.foodId)?.name ?? '—'}</td>
                      <td className="num">{fmt(item.grams)} g</td>
                      <td className="num">{fmt(m.kcal)}</td>
                      <td className="num">{fmt(m.protein, 1)}</td>
                      <td className="num">{fmt(m.carbs, 1)}</td>
                      <td className="num">{fmt(m.fat, 1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {meal.instructions && (
            <p className="print-instructions">
              <strong>Przygotowanie:</strong> {meal.instructions}
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
