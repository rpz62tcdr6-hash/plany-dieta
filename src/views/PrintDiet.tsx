import { fmt, foodMacros, formatDate, sumMacros } from '../calc'
import { PrintNotes } from '../components/PrintNotes'
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
      </header>
      <div className="print-macros">
        {(
          [
            ['Kalorie', day.kcal, target.kcal, 'kcal'],
            ['Białko', day.protein, target.protein, 'g'],
            ['Węglowodany', day.carbs, target.carbs, 'g'],
            ['Tłuszcze', day.fat, target.fat, 'g'],
          ] as const
        ).map(([label, value, goal, unit]) => (
          <div key={label} className="print-macro">
            <span>{label}</span>
            <strong>
              {fmt(value)} <small>{unit}</small>
            </strong>
            {goal > 0 && (
              <em>
                cel {fmt(goal)} {unit}
              </em>
            )}
          </div>
        ))}
      </div>
      {diet.notes && <PrintNotes text={diet.notes} title="Zalecenia" />}

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
