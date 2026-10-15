import { useEffect, useState } from 'react'
import { fmt, formatDate } from '../calc'
import { swapExercise } from '../generators/plan'
import { estimateMinutes } from '../generators/volume'
import {
  agoLabel,
  formatSet,
  formatSets,
  previousFor,
  sessionTonnage,
  shortDate,
  sortedSessions,
  today,
  topSet,
} from '../sessions'
import { move, newId, useStore } from '../store'
import type { Exercise, PlanDay, PlanExercise, SetEntry, TrainingPlan, WorkoutSession } from '../types'
import { ExerciseSelect } from './ExerciseSelect'
import { NumberInput } from './NumberInput'

type Mode = 'view' | 'workout' | 'edit'

/** Plan na karcie podopiecznego: lista treningów, każdy rozwija się po kliknięciu */
export function PlanPreview({ plan }: { plan: TrainingPlan }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="plan-preview">
      {plan.days.map((day) => (
        <DayAccordion
          key={day.id}
          plan={plan}
          day={day}
          open={open === day.id}
          onToggle={() => setOpen((o) => (o === day.id ? null : day.id))}
        />
      ))}
    </div>
  )
}

function usePlanUpdate(planId: string) {
  const { update } = useStore()
  return (fn: (p: TrainingPlan) => TrainingPlan) =>
    update((d) => ({ ...d, plans: d.plans.map((p) => (p.id === planId ? fn(p) : p)) }))
}

function DayAccordion({
  plan,
  day,
  open,
  onToggle,
}: {
  plan: TrainingPlan
  day: PlanDay
  open: boolean
  onToggle: () => void
}) {
  const { data } = useStore()
  const [mode, setMode] = useState<Mode>('view')
  const byId = new Map(data.exercises.map((e) => [e.id, e]))
  const sessions = sortedSessions(plan).filter((s) => s.dayId === day.id)
  const last = sessions[0]

  return (
    <div className={`training ${open ? 'open' : ''}`}>
      <button type="button" className="training-head" onClick={onToggle} aria-expanded={open}>
        <span className="training-arrow">{open ? '▾' : '▸'}</span>
        <span className="training-title">
          <strong>{day.name}</strong>
          <span className="muted small">
            {day.exercises.length} ćwiczeń · ok. {estimateMinutes(day.exercises, data.exercises)} min
            {last ? ` · ostatnio ${shortDate(last.date)} (${agoLabel(last.date)})` : ' · jeszcze nie wykonany'}
          </span>
        </span>
        {sessions.length > 0 && <span className="badge dark">{sessions.length}× zrobiony</span>}
      </button>

      {open && (
        <div className="training-body">
          {mode === 'view' && (
            <>
              <div className="training-actions">
                <button className="primary" onClick={() => setMode('workout')}>
                  ▶ Zapisz trening
                </button>
                <button onClick={() => setMode('edit')}>✎ Edytuj ćwiczenia</button>
              </div>
              {day.exercises.length === 0 && <p className="muted small">Brak ćwiczeń – kliknij „Edytuj ćwiczenia”.</p>}
              {day.exercises.map((pe, i) => (
                <ExerciseView key={pe.id} index={i + 1} plan={plan} pe={pe} ex={byId.get(pe.exerciseId)} />
              ))}
              {sessions.length > 0 && <History plan={plan} sessions={sessions} byId={byId} />}
            </>
          )}
          {mode === 'workout' && <WorkoutForm plan={plan} day={day} byId={byId} onDone={() => setMode('view')} />}
          {mode === 'edit' && <DayEdit plan={plan} day={day} onDone={() => setMode('view')} />}
        </div>
      )}
    </div>
  )
}

function scheme(pe: PlanExercise, cardio: boolean) {
  const parts = [cardio ? pe.reps : `${pe.sets} × ${pe.reps}`]
  if (pe.rest && pe.rest !== '—') parts.push(`przerwa ${pe.rest}`)
  if (pe.notes) parts.push(pe.notes)
  if (pe.weight) parts.push(`cel: ${pe.weight}`)
  return parts.join(' · ')
}

function ExerciseView({ index, plan, pe, ex }: { index: number; plan: TrainingPlan; pe: PlanExercise; ex?: Exercise }) {
  const cardio = ex?.pattern === 'cardio'
  const prev = previousFor(plan, pe)
  const before = prev ? previousFor(plan, pe, prev.date) : null
  const a = prev && topSet(prev.sets)
  const b = before && topSet(before.sets)
  const diff = a && b && a.weight !== null && b.weight !== null ? a.weight - b.weight : 0
  return (
    <div className="ex-row">
      <div className="ex-info">
        <span className="ex-index">{index}</span>
        <div>
          <strong>{ex?.name ?? '—'}</strong>
          <div className="muted small">{scheme(pe, cardio)}</div>
        </div>
      </div>
      <div className="ex-last">
        {prev ? (
          <>
            <span className="muted small">
              {shortDate(prev.date)} · {agoLabel(prev.date)}
            </span>
            <strong>
              {formatSets(prev.sets, cardio)}
              {diff !== 0 && (
                <span className={diff > 0 ? 'up' : 'down'}>
                  {diff > 0 ? ` ▲ +${fmt(diff, 1)} kg` : ` ▼ ${fmt(diff, 1)} kg`}
                </span>
              )}
            </strong>
          </>
        ) : (
          <span className="muted small">Brak wpisów</span>
        )}
      </div>
    </div>
  )
}

function History({
  plan,
  sessions,
  byId,
}: {
  plan: TrainingPlan
  sessions: WorkoutSession[]
  byId: Map<string, Exercise>
}) {
  const setPlan = usePlanUpdate(plan.id)
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <div className="history">
      <h3>Historia treningów</h3>
      {sessions.map((s) => (
        <div key={s.id} className="history-item">
          <button type="button" className="history-head" onClick={() => setOpenId((o) => (o === s.id ? null : s.id))}>
            <strong>{formatDate(s.date)}</strong>
            <span className="muted small">
              {agoLabel(s.date)} · {s.exercises.length} ćw. · objętość {fmt(sessionTonnage(s))} kg
            </span>
            <span className="training-arrow">{openId === s.id ? '▾' : '▸'}</span>
          </button>
          {openId === s.id && (
            <div className="history-body">
              {s.exercises.map((e) => (
                <p key={e.planExerciseId + e.exerciseId}>
                  <b>{byId.get(e.exerciseId)?.name ?? '—'}:</b>{' '}
                  {formatSets(e.sets, byId.get(e.exerciseId)?.pattern === 'cardio')}
                </p>
              ))}
              {s.note && <p className="muted">📝 {s.note}</p>}
              <button
                className="link danger small"
                onClick={() =>
                  confirm(`Usunąć trening z ${formatDate(s.date)}?`) &&
                  setPlan((p) => ({ ...p, sessions: (p.sessions ?? []).filter((x) => x.id !== s.id) }))
                }
              >
                Usuń ten trening
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ——— Zapis treningu ——— */

interface DraftSet {
  weight: string
  reps: string
}
type Draft = Record<string, DraftSet[]>

const draftKey = (planId: string, dayId: string) => `trening-szkic:${planId}:${dayId}`

function loadDraft(planId: string, dayId: string): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(planId, dayId))
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

const toNum = (v: string): number | null => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}

function WorkoutForm({
  plan,
  day,
  byId,
  onDone,
}: {
  plan: TrainingPlan
  day: PlanDay
  byId: Map<string, Exercise>
  onDone: () => void
}) {
  const setPlan = usePlanUpdate(plan.id)
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState<Draft>(
    () =>
      loadDraft(plan.id, day.id) ??
      Object.fromEntries(
        day.exercises.map((pe) => [
          pe.id,
          Array.from({ length: Math.max(1, byId.get(pe.exerciseId)?.pattern === 'cardio' ? 1 : pe.sets) }, () => ({
            weight: '',
            reps: '',
          })),
        ]),
      ),
  )

  // Szkic zapisuje się na bieżąco – nic nie zginie po przypadkowym zamknięciu
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(plan.id, day.id), JSON.stringify(draft))
    } catch {
      // brak miejsca / tryb prywatny – trudno, szkic tylko w pamięci
    }
  }, [draft, plan.id, day.id])

  const setSet = (peId: string, i: number, patch: Partial<DraftSet>) =>
    setDraft((d) => ({ ...d, [peId]: (d[peId] ?? []).map((s, k) => (k === i ? { ...s, ...patch } : s)) }))

  function copyPrevious(pe: PlanExercise, sets: SetEntry[]) {
    setDraft((d) => {
      const rows = [...(d[pe.id] ?? [])]
      sets.forEach((s, i) => {
        rows[i] = { weight: s.weight !== null ? String(s.weight) : '', reps: s.reps !== null ? String(s.reps) : '' }
      })
      return { ...d, [pe.id]: rows }
    })
  }

  function clearDraft() {
    try {
      localStorage.removeItem(draftKey(plan.id, day.id))
    } catch {
      // ignorujemy
    }
  }

  function save() {
    const exercises = day.exercises
      .map((pe) => ({
        planExerciseId: pe.id,
        exerciseId: pe.exerciseId,
        sets: (draft[pe.id] ?? [])
          .map((s) => ({ weight: toNum(s.weight), reps: toNum(s.reps) }))
          .filter((s) => s.weight !== null || s.reps !== null),
      }))
      .filter((e) => e.sets.length > 0)
    if (exercises.length === 0) return alert('Wpisz wynik przynajmniej jednej serii.')
    setPlan((p) => {
      const all = p.sessions ?? []
      const same = all.find((s) => s.dayId === day.id && s.date === date)
      if (!same) {
        const session: WorkoutSession = { id: newId(), dayId: day.id, date, exercises, note: note.trim() }
        return { ...p, sessions: [...all, session] }
      }
      // Ten sam trening tego samego dnia – dopisujemy/podmieniamy ćwiczenia w istniejącym zapisie
      const ids = new Set(exercises.map((e) => e.planExerciseId))
      const merged: WorkoutSession = {
        ...same,
        exercises: [...same.exercises.filter((e) => !ids.has(e.planExerciseId)), ...exercises],
        note: [same.note, note.trim()].filter(Boolean).join(' · '),
      }
      return { ...p, sessions: all.map((s) => (s.id === same.id ? merged : s)) }
    })
    clearDraft()
    onDone()
  }

  return (
    <div className="workout">
      <div className="workout-head">
        <label className="inline">
          Data treningu
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <span className="muted small">Szare wartości w polach = wynik z poprzedniego treningu</span>
      </div>

      {day.exercises.map((pe, i) => {
        const ex = byId.get(pe.exerciseId)
        const cardio = ex?.pattern === 'cardio'
        const prev = previousFor(plan, pe, date)
        const rows = draft[pe.id] ?? []
        return (
          <div key={pe.id} className="workout-ex">
            <div className="workout-ex-head">
              <span className="ex-index">{i + 1}</span>
              <div>
                <strong>{ex?.name ?? '—'}</strong>
                <div className="muted small">{scheme(pe, cardio)}</div>
              </div>
            </div>

            {prev ? (
              <div className="prev-box">
                <span>
                  <b>{agoLabel(prev.date)}</b> ({shortDate(prev.date)}): {formatSets(prev.sets, cardio)}
                </span>
                <button type="button" className="small-btn" onClick={() => copyPrevious(pe, prev.sets)}>
                  ↺ Wpisz to samo
                </button>
              </div>
            ) : (
              <div className="prev-box empty">Pierwszy raz – brak poprzedniego wyniku</div>
            )}

            <div className="set-rows">
              {rows.map((s, k) => {
                const p = prev?.sets[k]
                return (
                  <div key={k} className="set-row">
                    <span className="set-no">{cardio ? 'Czas' : `S${k + 1}`}</span>
                    {!cardio && (
                      <label className="set-field">
                        <input
                          inputMode="decimal"
                          placeholder={p?.weight != null ? String(p.weight).replace('.', ',') : 'kg'}
                          value={s.weight}
                          onChange={(e) => setSet(pe.id, k, { weight: e.target.value })}
                          aria-label={`${ex?.name} – seria ${k + 1} – kg`}
                        />
                        <small>kg</small>
                      </label>
                    )}
                    <label className="set-field">
                      <input
                        inputMode="numeric"
                        placeholder={p?.reps != null ? String(p.reps) : cardio ? 'min' : 'powt.'}
                        value={s.reps}
                        onChange={(e) => setSet(pe.id, k, { reps: e.target.value })}
                        aria-label={`${ex?.name} – seria ${k + 1} – ${cardio ? 'minuty' : 'powtórzenia'}`}
                      />
                      <small>{cardio ? 'min' : 'powt.'}</small>
                    </label>
                    {p && !cardio && <span className="set-prev">było {formatSet(p)}</span>}
                  </div>
                )
              })}
              {!cardio && (
                <div className="set-tools">
                  <button
                    type="button"
                    className="link small"
                    onClick={() => setDraft((d) => ({ ...d, [pe.id]: [...rows, { weight: '', reps: '' }] }))}
                  >
                    + seria
                  </button>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="link small"
                      onClick={() => setDraft((d) => ({ ...d, [pe.id]: rows.slice(0, -1) }))}
                    >
                      − seria
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      <label className="block">
        Notatka do treningu (samopoczucie, ból, uwagi)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="sticky-actions">
        <button
          className="ghost"
          onClick={() => {
            if (confirm('Anulować? Wpisane wartości zostaną usunięte.')) {
              clearDraft()
              onDone()
            }
          }}
        >
          Anuluj
        </button>
        <button className="primary big" onClick={save}>
          💾 Zapisz trening
        </button>
      </div>
    </div>
  )
}

/* ——— Edycja ćwiczeń w treningu ——— */

function DayEdit({ plan, day, onDone }: { plan: TrainingPlan; day: PlanDay; onDone: () => void }) {
  const { data } = useStore()
  const setPlan = usePlanUpdate(plan.id)

  const setDay = (fn: (d: PlanDay) => PlanDay) =>
    setPlan((p) => ({ ...p, days: p.days.map((d) => (d.id === day.id ? fn(d) : d)) }))
  const setEx = (id: string, patch: Partial<PlanExercise>) =>
    setDay((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  function swap(pe: PlanExercise) {
    const current = data.exercises.find((e) => e.id === pe.exerciseId)
    const next = swapExercise(current, data.exercises, day.exercises.map((e) => e.exerciseId))
    if (!next) return alert('Brak innego ćwiczenia tego typu w bibliotece.')
    setEx(pe.id, { exerciseId: next.id })
  }

  return (
    <div className="day-edit">
      <label className="block">
        Nazwa treningu
        <input value={day.name} onChange={(e) => setDay((d) => ({ ...d, name: e.target.value }))} />
      </label>
      {day.exercises.map((pe, i) => (
        <div key={pe.id} className="edit-ex">
          <div className="edit-ex-top">
            <span className="ex-index">{i + 1}</span>
            <ExerciseSelect
              exercises={data.exercises}
              value={pe.exerciseId}
              onChange={(exerciseId) => setEx(pe.id, { exerciseId })}
            />
            <button type="button" className="swap" title="Zamień na podobne ćwiczenie" onClick={() => swap(pe)}>
              ⇄
            </button>
          </div>
          <div className="edit-ex-fields">
            <label>
              Serie
              <NumberInput value={pe.sets} onChange={(sets) => setEx(pe.id, { sets })} />
            </label>
            <label>
              Powt.
              <input value={pe.reps} onChange={(e) => setEx(pe.id, { reps: e.target.value })} />
            </label>
            <label>
              Przerwa
              <input value={pe.rest} onChange={(e) => setEx(pe.id, { rest: e.target.value })} />
            </label>
            <label>
              Cel (ciężar)
              <input placeholder="np. 60 kg" value={pe.weight} onChange={(e) => setEx(pe.id, { weight: e.target.value })} />
            </label>
            <label className="wide-field">
              Uwagi
              <input value={pe.notes} onChange={(e) => setEx(pe.id, { notes: e.target.value })} />
            </label>
          </div>
          <div className="edit-ex-actions">
            <button
              type="button"
              disabled={i === 0}
              onClick={() => setDay((d) => ({ ...d, exercises: move(d.exercises, i, -1) }))}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={i === day.exercises.length - 1}
              onClick={() => setDay((d) => ({ ...d, exercises: move(d.exercises, i, 1) }))}
            >
              ↓
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => setDay((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== pe.id) }))}
            >
              Usuń
            </button>
          </div>
        </div>
      ))}
      <div className="training-actions">
        <button
          type="button"
          onClick={() =>
            setDay((d) => ({
              ...d,
              exercises: [
                ...d.exercises,
                {
                  id: newId(),
                  exerciseId: data.exercises[0]?.id ?? '',
                  sets: 3,
                  reps: '8–12',
                  weight: '',
                  rest: '90 s',
                  notes: '',
                },
              ],
            }))
          }
        >
          + Dodaj ćwiczenie
        </button>
        <button type="button" className="primary" onClick={onDone}>
          ✓ Gotowe
        </button>
      </div>
      <p className="muted small">Zmiany zapisują się od razu. Wcześniej zapisane treningi zostają w historii.</p>
    </div>
  )
}
