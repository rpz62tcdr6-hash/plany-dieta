import { foodMacros, sumMacros } from '../calc'
import { newId } from '../store'
import type { DietPrefs, Food, Macros, Meal, MealItem, MealType, Recipe } from '../types'

export const MEAL_LAYOUTS: Record<number, { name: string; type: MealType; share: number }[]> = {
  3: [
    { name: 'Śniadanie', type: 'sniadanie', share: 0.3 },
    { name: 'Obiad', type: 'obiad', share: 0.4 },
    { name: 'Kolacja', type: 'kolacja', share: 0.3 },
  ],
  4: [
    { name: 'Śniadanie', type: 'sniadanie', share: 0.25 },
    { name: 'Obiad', type: 'obiad', share: 0.35 },
    { name: 'Podwieczorek', type: 'przekaska', share: 0.15 },
    { name: 'Kolacja', type: 'kolacja', share: 0.25 },
  ],
  5: [
    { name: 'Śniadanie', type: 'sniadanie', share: 0.25 },
    { name: 'II śniadanie', type: 'przekaska', share: 0.1 },
    { name: 'Obiad', type: 'obiad', share: 0.35 },
    { name: 'Podwieczorek', type: 'przekaska', share: 0.1 },
    { name: 'Kolacja', type: 'kolacja', share: 0.2 },
  ],
  6: [
    { name: 'Śniadanie', type: 'sniadanie', share: 0.2 },
    { name: 'II śniadanie', type: 'przekaska', share: 0.1 },
    { name: 'Obiad', type: 'obiad', share: 0.3 },
    { name: 'Podwieczorek', type: 'przekaska', share: 0.1 },
    { name: 'Kolacja', type: 'kolacja', share: 0.2 },
    { name: 'Przekąska wieczorna', type: 'przekaska', share: 0.1 },
  ],
}

export const NO_PREFS: DietPrefs = { vegetarian: false, noLactose: false, noGluten: false }

type FoodMap = Map<string, Food>

export function recipeMacros(recipe: Recipe, foods: FoodMap): Macros {
  return sumMacros(recipe.ingredients.map((i) => foodMacros(foods.get(i.foodId), i.grams)))
}

export function recipeTags(recipe: Recipe, foods: FoodMap): { vegetarian: boolean; noLactose: boolean; noGluten: boolean } {
  const flags = new Set(recipe.ingredients.flatMap((i) => foods.get(i.foodId)?.flags ?? []))
  return { vegetarian: !flags.has('mieso'), noLactose: !flags.has('laktoza'), noGluten: !flags.has('gluten') }
}

export function recipeAllowed(recipe: Recipe, foods: FoodMap, prefs: DietPrefs): boolean {
  const t = recipeTags(recipe, foods)
  return (!prefs.vegetarian || t.vegetarian) && (!prefs.noLactose || t.noLactose) && (!prefs.noGluten || t.noGluten)
}

export function scaleMacros(m: Macros, k: number): Macros {
  return { kcal: m.kcal * k, protein: m.protein * k, carbs: m.carbs * k, fat: m.fat * k }
}

/** Jak bardzo proporcje makro przepisu różnią się od celu (0 = idealnie) */
function ratioDistance(m: Macros, target: Macros): number {
  const shares = (x: Macros) => {
    const total = x.protein * 4 + x.carbs * 4 + x.fat * 9 || 1
    return [(x.protein * 4) / total, (x.carbs * 4) / total, (x.fat * 9) / total]
  }
  if (!target.protein && !target.carbs && !target.fat) return 0
  const a = shares(m)
  const b = shares(target)
  return a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0)
}

/** Główne źródło białka przepisu – nabiał traktujemy jako jedną grupę, żeby nie powtarzał się co posiłek */
export function proteinFamily(recipe: Recipe, foods: FoodMap): string {
  let best = ''
  let max = 0
  for (const i of recipe.ingredients) {
    const food = foods.get(i.foodId)
    const p = ((food?.protein ?? 0) * i.grams) / 100
    if (food && p > max) {
      max = p
      best = food.flags?.includes('laktoza') ? 'nabiał' : food.id
    }
  }
  return best
}

export function pickRecipe(
  recipes: Recipe[],
  foods: FoodMap,
  type: MealType | undefined,
  target: Macros,
  prefs: DietPrefs,
  avoid: string[] = [],
  avoidFamilies: string[] = [],
): Recipe | null {
  const pool = recipes.filter((r) => (!type || r.mealTypes.includes(type)) && recipeAllowed(r, foods, prefs))
  if (pool.length === 0) return null
  return pool
    .map((r) => ({
      r,
      score:
        ratioDistance(recipeMacros(r, foods), target) +
        Math.random() * 0.35 +
        (avoid.includes(r.id) ? 2 : 0) +
        avoidFamilies.filter((f) => f === proteinFamily(r, foods)).length * 0.45,
    }))
    .sort((a, b) => a.score - b.score)[0].r
}

type Kind = 'fixed' | 'fat' | 'main'

/** Warzywa i dodatki zmieniamy niewiele, tłuszcze (oliwa, masło) mogą zejść prawie do zera */
function kindOf(food: Food | undefined): Kind {
  if (!food || food.kcal < 50) return 'fixed'
  const total = food.protein * 4 + food.carbs * 4 + food.fat * 9 || 1
  return (food.fat * 9) / total >= 0.6 && food.protein * 4 < total * 0.2 ? 'fat' : 'main'
}

const BOUNDS: Record<Kind, [number, number]> = { fixed: [0.6, 1.5], fat: [0, 2.5], main: [0.3, 2.5] }

function roundGrams(g: number): number {
  if (g < 2) return 0
  return g >= 20 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g))
}

/**
 * Dopasowuje gramatury do celu. Dla każdego produktu szukamy mnożnika (w granicach rozsądku),
 * który minimalizuje odchylenie kcal i makro od celu, z lekką karą za odejście od proporcji przepisu
 * (metoda spadku po współrzędnych dla zadania najmniejszych kwadratów z ograniczeniami).
 */
export function fitItems(items: MealItem[], target: Macros, foods: FoodMap): MealItem[] {
  if (items.length === 0) return items
  const total = () => sumMacros(items.map((i) => foodMacros(foods.get(i.foodId), i.grams)))

  // 1) skalowanie całości do kalorii
  const kcal = total().kcal
  if (kcal > 0 && target.kcal > 0) {
    const k = Math.min(3, Math.max(0.35, target.kcal / kcal))
    items = items.map((i) => ({ ...i, grams: i.grams * k }))
  }

  // 2) dopasowanie makro produkt po produkcie
  const keys = (['kcal', 'protein', 'carbs', 'fat'] as const).filter((k) => target[k] > 0)
  if (keys.some((k) => k !== 'kcal')) {
    const weight: Record<keyof Macros, number> = { kcal: 1, protein: 1.5, carbs: 1, fat: 1 }
    const base = items.map((i) => foodMacros(foods.get(i.foodId), i.grams))
    const bounds = items.map((i) => BOUNDS[kindOf(foods.get(i.foodId))])
    const x = items.map(() => 1)
    const lambda = 0.01
    const sumOf = (k: keyof Macros) => base.reduce((acc, m, i) => acc + m[k] * x[i], 0)
    for (let sweep = 0; sweep < 150; sweep++) {
      for (let i = 0; i < items.length; i++) {
        let num = lambda
        let den = lambda
        for (const k of keys) {
          const a = base[i][k] / target[k]
          const rest = (sumOf(k) - base[i][k] * x[i]) / target[k] - 1
          num -= weight[k] * a * rest
          den += weight[k] * a * a
        }
        x[i] = Math.min(bounds[i][1], Math.max(bounds[i][0], num / den))
      }
    }
    items = items.map((it, i) => ({ ...it, grams: it.grams * x[i] }))
  }

  return items.map((i) => ({ ...i, grams: roundGrams(i.grams) })).filter((i) => i.grams > 0)
}

export function mealTarget(dayTarget: Macros, share: number): Macros {
  return scaleMacros(dayTarget, share)
}

export function mealFromRecipe(recipe: Recipe, base: Omit<Meal, 'items'>): Meal {
  return {
    ...base,
    recipeId: recipe.id,
    recipeName: recipe.name,
    instructions: recipe.instructions,
    items: recipe.ingredients.map((i) => ({ id: newId(), foodId: i.foodId, grams: i.grams })),
  }
}

export interface DietParams {
  target: Macros
  mealsCount: number
  prefs: DietPrefs
}

export function generateMeals(params: DietParams, recipes: Recipe[], foodsList: Food[]): { meals: Meal[]; missing: string[] } {
  const foods: FoodMap = new Map(foodsList.map((f) => [f.id, f]))
  const layout = MEAL_LAYOUTS[params.mealsCount] ?? MEAL_LAYOUTS[5]
  const used: string[] = []
  const families: string[] = []
  const missing: string[] = []

  let meals: Meal[] = layout.map((slot) => {
    const target = mealTarget(params.target, slot.share)
    const base = { id: newId(), name: slot.name, type: slot.type, share: slot.share }
    const recipe = pickRecipe(recipes, foods, slot.type, target, params.prefs, used, families)
    if (!recipe) {
      missing.push(slot.name)
      return { ...base, items: [] }
    }
    used.push(recipe.id)
    families.push(proteinFamily(recipe, foods))
    const meal = mealFromRecipe(recipe, base)
    return { ...meal, items: fitItems(meal.items, { ...target, protein: 0, carbs: 0, fat: 0 }, foods) }
  })

  // Korekta całego dnia, żeby suma makro trafiła w cel
  const all = meals.flatMap((m) => m.items)
  const fitted = fitItems(all, params.target, foods)
  const byId = new Map(fitted.map((i) => [i.id, i]))
  meals = meals.map((m) => ({ ...m, items: m.items.map((i) => byId.get(i.id) ?? i) }))

  return { meals, missing }
}

/**
 * Cel dla jednego posiłku tak, żeby suma dnia trafiła w cel: od celu dnia odejmujemy pozostałe posiłki.
 * Wynik ograniczamy do 0,5–1,6× „normalnej” porcji posiłku, żeby nie wyszły absurdalne ilości.
 */
export function remainingTarget(dayTarget: Macros, meals: Meal[], mealId: string, share: number, foods: FoodMap): Macros {
  const others = sumMacros(
    meals.filter((m) => m.id !== mealId).flatMap((m) => m.items.map((i) => foodMacros(foods.get(i.foodId), i.grams))),
  )
  const base = mealTarget(dayTarget, share)
  const pick = (key: keyof Macros) => {
    const rest = dayTarget[key] - others[key]
    if (!(base[key] > 0)) return Math.max(0, rest)
    return Math.min(base[key] * 1.6, Math.max(base[key] * 0.5, rest))
  }
  return { kcal: pick('kcal'), protein: pick('protein'), carbs: pick('carbs'), fat: pick('fat') }
}

/**
 * Dopasowuje gramatury zmienionego posiłku. Jeśli sam posiłek nie wystarczy (np. brak w nim źródła węglowodanów),
 * a dzień odbiega od celu o więcej niż 5%, delikatnie korygujemy też pozostałe posiłki.
 */
export function fitMealInDay(
  meals: Meal[],
  mealId: string,
  dayTarget: Macros,
  shareOf: (m: Meal) => number,
  foods: FoodMap,
): { meals: Meal[]; adjustedOthers: boolean } {
  let next = meals.map((m) =>
    m.id === mealId ? { ...m, items: fitItems(m.items, remainingTarget(dayTarget, meals, m.id, shareOf(m), foods), foods) } : m,
  )
  const day = sumMacros(next.flatMap((m) => m.items.map((i) => foodMacros(foods.get(i.foodId), i.grams))))
  const off = (['kcal', 'protein', 'carbs', 'fat'] as const).some(
    (k) => dayTarget[k] > 0 && Math.abs(day[k] - dayTarget[k]) / dayTarget[k] > 0.05,
  )
  if (!off) return { meals: next, adjustedOthers: false }
  const fitted = fitItems(next.flatMap((m) => m.items), dayTarget, foods)
  const byId = new Map(fitted.map((i) => [i.id, i]))
  next = next.map((m) => ({ ...m, items: m.items.map((i) => byId.get(i.id)).filter((i): i is MealItem => !!i) }))
  return { meals: next, adjustedOthers: true }
}

/** Nowy przepis dla jednego posiłku, z gramaturą dopasowaną do podanego celu posiłku */
export function rerollMeal(
  meal: Meal,
  target: Macros,
  share: number,
  recipes: Recipe[],
  foodsList: Food[],
  prefs: DietPrefs,
  recipeId?: string,
): Meal | null {
  const foods: FoodMap = new Map(foodsList.map((f) => [f.id, f]))
  const recipe = recipeId
    ? recipes.find((r) => r.id === recipeId)
    : pickRecipe(recipes, foods, meal.type, target, prefs, meal.recipeId ? [meal.recipeId] : [])
  if (!recipe) return null
  const next = mealFromRecipe(recipe, { id: meal.id, name: meal.name, type: meal.type, share })
  return { ...next, items: fitItems(next.items, target, foods) }
}
