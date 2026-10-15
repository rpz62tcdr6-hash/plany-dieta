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

/** Wzorzec ruchowy – na jego podstawie generator dobiera ćwiczenia */
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push-h'
  | 'push-v'
  | 'pull-h'
  | 'pull-v'
  | 'chest-iso'
  | 'side-delt'
  | 'rear-delt'
  | 'biceps'
  | 'triceps'
  | 'glute'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'core'
  | 'cardio'

export type Equipment = 'sztanga' | 'hantle' | 'maszyna' | 'wyciąg' | 'masa ciała' | 'kettlebell' | 'guma'
export type Joint = 'kolano' | 'bark' | 'lędźwie'

export interface Exercise {
  id: string
  name: string
  muscle: string
  pattern?: Pattern
  equipment?: Equipment
  /** Ćwiczenie wielostawowe */
  compound?: boolean
  /** Stawy mocno obciążane – pomijane przy kontuzji */
  stress?: Joint[]
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

/** mieso = mięso lub ryby */
export type FoodFlag = 'mieso' | 'laktoza' | 'gluten'

/** Wartości odżywcze na 100 g produktu */
export interface Food {
  id: string
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  flags?: FoodFlag[]
}

export type MealType = 'sniadanie' | 'obiad' | 'kolacja' | 'przekaska'

export interface Ingredient {
  foodId: string
  grams: number
}

export interface Recipe {
  id: string
  name: string
  mealTypes: MealType[]
  ingredients: Ingredient[]
  instructions: string
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
  type?: MealType
  /** Udział posiłku w dziennej kaloryczności (0–1) */
  share?: number
  recipeId?: string
  recipeName?: string
  instructions?: string
}

export interface DietPrefs {
  vegetarian: boolean
  noLactose: boolean
  noGluten: boolean
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface Diet {
  id: string
  clientId: string
  name: string
  notes: string
  target: Macros
  prefs?: DietPrefs
  meals: Meal[]
  createdAt: string
}

export interface AppData {
  version: 1
  /** Wersja wbudowanych danych startowych – pozwala dogrywać nowe ćwiczenia/produkty/przepisy */
  seedVersion: number
  clients: Client[]
  plans: TrainingPlan[]
  diets: Diet[]
  exercises: Exercise[]
  foods: Food[]
  recipes: Recipe[]
}
