import { useRef } from 'react'
import { isAppData, useStore } from '../store'

export function Backup() {
  const { data, replaceAll } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plany-dieta-kopia-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importData(file: File) {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isAppData(parsed)) throw new Error('zły format')
      if (confirm('Wczytanie kopii zastąpi WSZYSTKIE obecne dane. Kontynuować?')) {
        replaceAll(parsed)
        alert('Kopia została wczytana.')
      }
    } catch {
      alert('Nie udało się wczytać pliku – to nie jest prawidłowa kopia zapasowa.')
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Kopia zapasowa</h1>
      </div>
      <section className="card">
        <p>
          Wszystkie dane są zapisywane <strong>tylko w tej przeglądarce</strong> na tym urządzeniu. Jeśli wyczyścisz
          dane przeglądarki albo zmienisz komputer – znikną. Dlatego regularnie pobieraj kopię zapasową (np. raz w
          tygodniu) i trzymaj ją np. na Dysku Google.
        </p>
        <p className="muted small">
          Podopieczni: {data.clients.length} · Plany: {data.plans.length} · Diety: {data.diets.length}
        </p>
        <div className="actions">
          <button className="primary" onClick={exportData}>
            Pobierz kopię zapasową
          </button>
          <button onClick={() => fileRef.current?.click()}>Wczytaj kopię z pliku…</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importData(file)
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
