import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AppData } from './types'
import { defaultExercises } from './data/exercises'
import { defaultFoods } from './data/foods'

const STORAGE_KEY = 'apka-plany-dieta:v1'

export function emptyData(): AppData {
  return {
    version: 1,
    clients: [],
    plans: [],
    diets: [],
    exercises: defaultExercises,
    foods: defaultFoods,
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyData(), ...JSON.parse(raw) }
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

  return <Ctx.Provider value={{ data, update: setData, replaceAll: setData }}>{children}</Ctx.Provider>
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
