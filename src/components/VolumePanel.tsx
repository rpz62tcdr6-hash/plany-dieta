import { fmt } from '../calc'
import { ALL_MUSCLES, MAIN_MUSCLES, volumeTarget, weeklyVolume } from '../generators/volume'
import type { Exercise, Level, PlanDay, TrainingGoal } from '../types'

/** Tygodniowa liczba serii na partię w porównaniu z zaleceniami z badań */
export function VolumePanel({
  days,
  exercises,
  goal,
  level,
}: {
  days: PlanDay[]
  exercises: Exercise[]
  goal: TrainingGoal
  level: Level
}) {
  const { sets, freq } = weeklyVolume(days, exercises)
  return (
    <div className="volume">
      {ALL_MUSCLES.map((m) => {
        const [lo, hi] = volumeTarget(m, goal, level)
        const v = sets[m]
        const status = v < lo ? 'under' : v > hi ? 'over' : 'ok'
        const max = Math.max(hi * 1.25, v)
        return (
          <div key={m} className={`volume-row ${status}`}>
            <span className="volume-name">{m}</span>
            <div className="volume-bar">
              <div className="volume-range" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
              <div className="volume-fill" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
            </div>
            <span className="volume-value">
              <strong>{fmt(v, v % 1 ? 1 : 0)}</strong> <span className="muted">/ {lo}–{hi}</span>
            </span>
            <span className={`volume-freq ${freq[m] < 2 && (MAIN_MUSCLES as readonly string[]).includes(m) ? 'warn' : ''}`}
              title="Ile dni w tygodniu partia pracuje (także jako mięsień pomocniczy)">
              {freq[m]}×/tydz.
            </span>
          </div>
        )
      })}
      <p className="muted small">
        Serie tygodniowo (ćwiczenia pomocnicze liczone jako ½ serii). Szary pasek = zalecany zakres dla wybranego celu i
        poziomu (Schoenfeld i wsp. 2017; ACSM 2009). Każda partia najlepiej min. 2×/tydz. (Schoenfeld i wsp. 2016).
      </p>
    </div>
  )
}
