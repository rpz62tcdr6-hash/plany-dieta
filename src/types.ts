export type Sex = 'M' | 'K'
export type Goal = 'redukcja' | 'utrzymanie' | 'masa'

/** Pomiar ciała z danego dnia – wszystkie pola poza datą są opcjonalne */
export interface Measurement {
  id: string
  /** Data w formacie RRRR-MM-DD */
  date: string
  weight?: number
  bodyFat?: number
  waist?: number
  hips?: number
  chest?: number
  arm?: number
  thigh?: number
  note?: string
}

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
  /** Makro ustawione przez trenera (zastępuje wyliczone ze wzoru) */
  target?: Macros
  measurements?: Measurement[]
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

/** Pojedyncza seria zapisana na treningu (puste = nie wpisano) */
export interface SetEntry {
  weight: number | null
  reps: number | null
}

export interface SessionExercise {
  planExerciseId: string
  exerciseId: string
  sets: SetEntry[]
}

/** Zapisany trening – jeden dzień planu wykonany konkretnego dnia */
export interface WorkoutSession {
  id: string
  dayId: string
  /** Data w formacie RRRR-MM-DD */
  date: string
  exercises: SessionExercise[]
  note: string
}

/** Stary format zapisu (przed zapisem całych treningów) – zamieniany na WorkoutSession przy wczytaniu */
export interface LogEntry {
  id: string
  /** Data w formacie RRRR-MM-DD */
  date: string
  weight: number
  reps: string
}

export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  reps: string
  /** Docelowy ciężar wpisany przez trenera */
  weight: string
  rest: string
  /** Tempo, np. 2101 lub 21X1 (ekscentryka–pauza–koncentryka–pauza) */
  tempo?: string
  /** Powtórzenia w zapasie, np. „1–2” */
  rir?: string
  notes: string
  log?: LogEntry[]
}

export type TrainingGoal = 'sila' | 'masa' | 'redukcja' | 'kondycja'
export type Level = 'poczatkujacy' | 'sredni' | 'zaawansowany'

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
  /** Cel i poziom – punkt odniesienia dla zaleceń objętości */
  goal?: TrainingGoal
  level?: Level
  sessions?: WorkoutSession[]
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
  /** Link do filmu z przepisem (TikTok, Instagram, YouTube…) */
  link?: string
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
