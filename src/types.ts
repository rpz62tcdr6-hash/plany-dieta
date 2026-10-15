export type Sex = 'M' | 'K'
export type Goal = 'redukcja' | 'utrzymanie' | 'masa'

export interface Client {
  id: string
  name: string
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  /** Współczynnik aktywności (PAL), np. 1.55 */
  activity: number
  goal: Goal
  notes: string
  createdAt: string
}

export interface Exercise {
  id: string
  name: string
  muscle: string
}

export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  weight: string
  rest: string
  notes: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface TrainingPlan {
  id: string
  clientId: string
  name: string
  notes: string
  days: PlanDay[]
  createdAt: string
}

/** Wartości odżywcze na 100 g produktu */
export interface Food {
  id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface MealItem {
  id: string
  foodId: string
  grams: number
}

export interface Meal {
  id: string
  name: string
  items: MealItem[]
}

export interface Diet {
  id: string
  clientId: string
  name: string
  notes: string
  targetKcal: number
  meals: Meal[]
  createdAt: string
}

export interface AppData {
  version: 1
  clients: Client[]
  plans: TrainingPlan[]
  diets: Diet[]
  exercises: Exercise[]
  foods: Food[]
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}
