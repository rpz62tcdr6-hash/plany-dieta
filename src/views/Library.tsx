import { useState } from 'react'
import { fmt } from '../calc'
import { EQUIPMENT, MUSCLE_GROUPS, PATTERN_LABELS } from '../data/exercises'
import { NumberInput } from '../components/NumberInput'
import { newId, useStore } from '../store'
import type { Equipment, Food, FoodFlag, Pattern } from '../types'

export function Library() {
  const [tab, setTab] = useState<'exercises' | 'foods'>('exercises')
  return (
    <div>
      <div className="page-head">
        <h1>Biblioteka</h1>
      </div>
      <div className="tabs">
        <button className={tab === 'exercises' ? 'active' : ''} onClick={() => setTab('exercises')}>
          Ćwiczenia
        </button>
        <button className={tab === 'foods' ? 'active' : ''} onClick={() => setTab('foods')}>
          Produkty spożywcze
        </button>
      </div>
      {tab === 'exercises' ? <Exercises /> : <Foods />}
    </div>
  )
}

function Exercises() {
  const { data, update } = useStore()
  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState(MUSCLE_GROUPS[0])
  const [pattern, setPattern] = useState<Pattern | ''>('')
  const [equipment, setEquipment] = useState<Equipment>('hantle')

  function add() {
    if (!name.trim()) return
    const ex = {
      id: newId(),
      name: name.trim(),
      muscle,
      equipment,
      ...(pattern ? { pattern, compound: ['squat', 'hinge', 'lunge', 'push-h', 'push-v', 'pull-h', 'pull-v'].includes(pattern) } : {}),
    }
    update((d) => ({ ...d, exercises: [...d.exercises, ex] }))
    setName('')
  }

  function remove(id: string, label: string) {
    const used = data.plans.some((p) => p.days.some((day) => day.exercises.some((e) => e.exerciseId === id)))
    if (used) return alert(`Ćwiczenie „${label}” jest używane w planie treningowym – najpierw usuń je z planów.`)
    if (confirm(`Usunąć ćwiczenie „${label}”?`)) update((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }))
  }

  return (
    <>
      <section className="card">
        <h2>Dodaj ćwiczenie</h2>
        <p className="muted small">Podaj typ ruchu, żeby generator planów mógł używać tego ćwiczenia.</p>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input placeholder="Nazwa ćwiczenia" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern | '')} title="Typ ruchu">
            <option value="">Typ ruchu (dla generatora)…</option>
            {(Object.keys(PATTERN_LABELS) as Pattern[]).map((p) => (
              <option key={p} value={p}>
                {PATTERN_LABELS[p]}
              </option>
            ))}
          </select>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)} title="Sprzęt">
            {EQUIPMENT.map((eq) => (
              <option key={eq}>{eq}</option>
            ))}
          </select>
          <button className="primary" type="submit">
            Dodaj
          </button>
        </form>
      </section>

      {MUSCLE_GROUPS.map((g) => {
        const items = data.exercises.filter((e) => e.muscle === g).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
        if (items.length === 0) return null
        return (
          <section className="card" key={g}>
            <h2>{g}</h2>
            <ul className="list">
              {items.map((e) => (
                <li key={e.id}>
                  <span>
                    {e.name}
                    {e.equipment && <span className="tag outline">{e.equipment}</span>}
                    {!e.pattern && <span className="tag">poza generatorem</span>}
                  </span>
                  <button className="danger" onClick={() => remove(e.id, e.name)}>
                    Usuń
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}

const emptyFood = (): Food => ({ id: '', name: '', kcal: 0, protein: 0, carbs: 0, fat: 0, flags: [] })

const FLAG_LABELS: Record<FoodFlag, string> = { mieso: 'mięso/ryby', laktoza: 'laktoza', gluten: 'gluten' }

function Foods() {
  const { data, update } = useStore()
  const [draft, setDraft] = useState<Food>(emptyFood)
  const [query, setQuery] = useState('')

  function add() {
    if (!draft.name.trim()) return
    update((d) => ({ ...d, foods: [...d.foods, { ...draft, id: newId(), name: draft.name.trim() }] }))
    setDraft(emptyFood())
  }

  function remove(f: Food) {
    const used = data.diets.some((d) => d.meals.some((m) => m.items.some((i) => i.foodId === f.id)))
    if (used) return alert(`Produkt „${f.name}” jest używany w diecie – najpierw usuń go z diet.`)
    if (data.recipes.some((r) => r.ingredients.some((i) => i.foodId === f.id)))
      return alert(`Produkt „${f.name}” jest składnikiem przepisu – najpierw usuń go z przepisów.`)
    if (confirm(`Usunąć produkt „${f.name}”?`)) update((d) => ({ ...d, foods: d.foods.filter((x) => x.id !== f.id) }))
  }

  const foods = data.foods
    .filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'))

  return (
    <>
      <section className="card">
        <h2>Dodaj produkt</h2>
        <p className="muted small">Wartości na 100 g – znajdziesz je na etykiecie produktu.</p>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input placeholder="Nazwa produktu" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <label className="inline">
            kcal
            <NumberInput className="narrow" value={draft.kcal} onChange={(kcal) => setDraft({ ...draft, kcal })} />
          </label>
          <label className="inline">
            B
            <NumberInput className="narrow" step={0.1} value={draft.protein} onChange={(protein) => setDraft({ ...draft, protein })} />
          </label>
          <label className="inline">
            W
            <NumberInput className="narrow" step={0.1} value={draft.carbs} onChange={(carbs) => setDraft({ ...draft, carbs })} />
          </label>
          <label className="inline">
            T
            <NumberInput className="narrow" step={0.1} value={draft.fat} onChange={(fat) => setDraft({ ...draft, fat })} />
          </label>
          {(Object.keys(FLAG_LABELS) as FoodFlag[]).map((flag) => (
            <label key={flag} className="inline check">
              <input
                type="checkbox"
                checked={draft.flags?.includes(flag) ?? false}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    flags: e.target.checked
                      ? [...(draft.flags ?? []), flag]
                      : (draft.flags ?? []).filter((x) => x !== flag),
                  })
                }
              />
              {FLAG_LABELS[flag]}
            </label>
          ))}
          <button className="primary" type="submit">
            Dodaj
          </button>
        </form>
      </section>

      <section className="card">
        <input className="search" placeholder="Szukaj produktu…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="table-wrap">
          <table className="edit-table">
            <thead>
              <tr>
                <th>Produkt (100 g)</th>
                <th className="num">kcal</th>
                <th className="num">B</th>
                <th className="num">W</th>
                <th className="num">T</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {foods.map((f) => (
                <tr key={f.id}>
                  <td>
                    {f.name}{' '}
                    {f.flags?.map((x) => (
                      <span key={x} className="tag outline">
                        {FLAG_LABELS[x]}
                      </span>
                    ))}
                  </td>
                  <td className="num">{fmt(f.kcal)}</td>
                  <td className="num">{fmt(f.protein, 1)}</td>
                  <td className="num">{fmt(f.carbs, 1)}</td>
                  <td className="num">{fmt(f.fat, 1)}</td>
                  <td className="row-actions">
                    <button className="danger" onClick={() => remove(f)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
