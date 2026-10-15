import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { macroTargets } from './calc'
import { defaultExercises } from './data/exercises'
import { defaultFoods } from './data/foods'
import { defaultRecipes } from './data/recipes'
import type { AppData, Diet } from './types'

const STORAGE_KEY = 'apka-plany-dieta:v1'
/** Podbij, gdy dochodzą nowe wbudowane ćwiczenia/produkty/przepisy */
const SEED_VERSION = 3

export function emptyData(): AppData {
  return {
    version: 1,
    seedVersion: SEED_VERSION,
    clients: [],
    plans: [],
    diets: [],
    exercises: defaultExercises,
    foods: defaultFoods,
    recipes: defaultRecipes,
  }
}

/** Uzupełnia brakujące pola i dogrywa nowe dane startowe do starszych zapisów */
function migrate(raw: Partial<AppData>): AppData {
  const data: AppData = { ...emptyData(), ...raw }
  const oldSeed = raw.seedVersion ?? 1

  const defEx = new Map(defaultExercises.map((e) => [e.id, e]))
  data.exercises = data.exercises.map((e) => {
    const def = defEx.get(e.id)
    return def ? { ...def, ...e, pattern: e.pattern ?? def.pattern, equipment: e.equipment ?? def.equipment, compound: e.compound ?? def.compound, stress: e.stress ?? def.stress } : e
  })
  const defFood = new Map(defaultFoods.map((f) => [f.id, f]))
  data.foods = data.foods.map((f) => ({ ...f, flags: f.flags ?? defFood.get(f.id)?.flags ?? [] }))

  if (oldSeed < SEED_VERSION) {
    const has = (list: { id: string }[]) => new Set(list.map((x) => x.id))
    const ex = has(data.exercises)
    const fd = has(data.foods)
    const rc = has(data.recipes)
    data.exercises = [...data.exercises, ...defaultExercises.filter((e) => !ex.has(e.id))]
    data.foods = [...data.foods, ...defaultFoods.filter((f) => !fd.has(f.id))]
    data.recipes = [...data.recipes, ...defaultRecipes.filter((r) => !rc.has(r.id))]
  }

  data.diets = data.diets.map((d) => {
    if (d.target) return d
    const legacy = d as Diet & { targetKcal?: number }
    const kcal = legacy.targetKcal ?? 2000
    const client = data.clients.find((c) => c.id === d.clientId)
    const target = client && client.weightKg > 0 ? macroTargets(client, kcal) : { kcal, protein: 0, carbs: 0, fat: 0 }
    const rest = { ...legacy }
    delete rest.targetKcal
    return { ...rest, target }
  })

  data.seedVersion = SEED_VERSION
  return data
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch {
    // uszkodzone dane – startujemy od zera
  }
  return emptyData()
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return ['clients', 'plans', 'diets', 'exercises', 'foods'].every((k) => Array.isArray(v[k]))
}

export function newId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

interface StoreContext {
  data: AppData
  update: (fn: (data: AppData) => AppData) => void
  replaceAll: (data: AppData) => void
}

const Ctx = createContext<StoreContext | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  return (
    <Ctx.Provider value={{ data, update: setData, replaceAll: (d) => setData(migrate(d)) }}>{children}</Ctx.Provider>
  )
}

export function useStore(): StoreContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore musi być użyty wewnątrz StoreProvider')
  return ctx
}

/** Przesuwa element tablicy o jedno miejsce w górę (-1) lub w dół (+1) */
export function move<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (target < 0 || target >= arr.length) return arr
  const copy = [...arr]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}
