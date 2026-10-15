import { fmt, foodMacros, sumMacros } from '../calc'
import { useStore } from '../store'
import type { Diet } from '../types'
import { MacroSummary } from './MacroSummary'
import { ProteinBadge } from './ProteinBadge'

/** Rozwinięta dieta na karcie podopiecznego */
export function DietPreview({ diet, weightKg }: { diet: Diet; weightKg: number }) {
  const { data } = useStore()
  const foods = new Map(data.foods.map((f) => [f.id, f]))
  const meals = diet.meals.map((m) => ({ meal: m, total: sumMacros(m.items.map((i) => foodMacros(foods.get(i.foodId), i.grams))) }))
  const day = sumMacros(meals.map((x) => x.total))

  return (
    <div className="diet-preview">
      <div className="summary-card mini">
        <MacroSummary total={day} target={diet.target} />
      </div>
      {meals.map(({ meal, total }) => (
        <div key={meal.id} className="preview-meal">
          <div className="preview-meal-head">
            <div>
              <span className="eyebrow">{meal.name}</span>
              <strong>{meal.recipeName ?? 'Posiłek'}</strong>
            </div>
            <span className="actions">
              <ProteinBadge protein={total.protein} weightKg={weightKg} snack={meal.type === 'przekaska'} />
              <span className="badge dark">{fmt(total.kcal)} kcal</span>
            </span>
          </div>
          <p className="preview-items">
            {meal.items.length
              ? meal.items.map((i) => `${foods.get(i.foodId)?.name ?? '—'} ${fmt(i.grams)} g`).join(' · ')
              : 'Brak produktów'}
          </p>
          {meal.instructions && <p className="muted small">{meal.instructions}</p>}
        </div>
      ))}
    </div>
  )
}
