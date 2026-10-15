import { fmt } from '../calc'

/**
 * Białko w posiłku: ok. 0,25 g/kg (min. ~20 g) na główny posiłek pobudza syntezę białek mięśniowych
 * (ISSN – Jäger i wsp. 2017; Schoenfeld i Aragon 2018).
 */
export function ProteinBadge({ protein, weightKg, snack }: { protein: number; weightKg: number; snack: boolean }) {
  if (snack) return <span className="badge">B {fmt(protein)} g</span>
  const min = Math.max(20, weightKg * 0.25)
  const ok = protein >= min - 1
  return (
    <span className={`badge ${ok ? 'ok' : 'low'}`} title={`Zalecane min. ok. ${fmt(min)} g białka w głównym posiłku`}>
      B {fmt(protein)} g {ok ? '✓' : `· min ${fmt(min)} g`}
    </span>
  )
}

