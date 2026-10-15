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

type Group = 'protein' | 'carbs' | 'fat' | 'fixed'

/** Do której „grupy” należy produkt – po tym dobieramy, co zwiększyć lub zmniejszyć */
function groupOf(food: Food | undefined): Group {
  if (!food || food.kcal < 50) return 'fixed' // warzywa i dodatki zostają bez zmian
  const p = food.protein * 4
  const c = food.carbs * 4
  const f = food.fat * 9
  const total = p + c + f || 1
  if (p / total >= 0.3) return 'protein'
  if (f / total >= 0.5) return 'fat'
  return 'carbs'
}

function roundGrams(g: number): number {
  return g >= 20 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g))
}

/**
 * Dopasowuje gramatury do celu: osobno skaluje źródła białka, węglowodanów i tłuszczu,
 * aż suma makro będzie jak najbliżej celu. Warzywa zostają bez zmian.
 */
export function fitItems(items: MealItem[], target: Macros, foods: FoodMap): MealItem[] {
  const total = () => sumMacros(items.map((i) => foodMacros(foods.get(i.foodId), i.grams)))
  if (items.length === 0) return items

  // 1) skalowanie całości do kalorii
  const kcal = total().kcal
  if (kcal > 0 && target.kcal > 0) {
    const k = Math.min(3, Math.max(0.35, target.kcal / kcal))
    items = items.map((i) => ({ ...i, grams: i.grams * k }))
  }

  // 2) korekta makro (gdy cel makro jest podany)
  if (target.protein > 0 || target.carbs > 0 || target.fat > 0) {
    const base = items.map((i) => i.grams)
    const groups = items.map((i) => groupOf(foods.get(i.foodId)))
    const factor: Record<Group, number> = { protein: 1, carbs: 1, fat: 1, fixed: 1 }
    const compute = () =>
      sumMacros(items.map((it, n) => foodMacros(foods.get(it.foodId), base[n] * factor[groups[n]])))
    for (let iter = 0; iter < 60; iter++) {
      const t = compute()
      for (const g of ['protein', 'carbs', 'fat'] as const) {
        if (!groups.includes(g) || !(target[g] > 0) || !(t[g] > 0)) continue
        factor[g] = Math.min(2.5, Math.max(0.4, factor[g] * Math.pow(target[g] / t[g], 0.5)))
      }
    }
    items = items.map((it, n) => ({ ...it, grams: base[n] * factor[groups[n]] }))
  }

  return items.map((i) => ({ ...i, grams: roundGrams(i.grams) }))
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

/** Nowy przepis dla jednego posiłku, dopasowany do jego części dziennego celu */
export function rerollMeal(
  meal: Meal,
  dayTarget: Macros,
  share: number,
  recipes: Recipe[],
  foodsList: Food[],
  prefs: DietPrefs,
  recipeId?: string,
): Meal | null {
  const foods: FoodMap = new Map(foodsList.map((f) => [f.id, f]))
  const target = mealTarget(dayTarget, share)
  const recipe = recipeId
    ? recipes.find((r) => r.id === recipeId)
    : pickRecipe(recipes, foods, meal.type, target, prefs, meal.recipeId ? [meal.recipeId] : [])
  if (!recipe) return null
  const next = mealFromRecipe(recipe, { id: meal.id, name: meal.name, type: meal.type, share })
  return { ...next, items: fitItems(next.items, target, foods) }
}
