import { useState } from 'react'
import { AI_MODEL, getApiKey, setApiKey } from '../ai/key'

export function AiSettings() {
  const [saved, setSaved] = useState(getApiKey())
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!draft.trim()) return
    setApiKey(draft)
    setSaved(draft.trim())
    setDraft('')
    await check()
  }

  async function check() {
    setBusy(true)
    setStatus(null)
    const { describeError, testConnection } = await import('../ai/client')
    try {
      const name = await testConnection()
      setStatus({ ok: true, text: `Połączono – model ${name} gotowy.` })
    } catch (e) {
      setStatus({ ok: false, text: describeError(e) })
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    if (!confirm('Usunąć klucz API z tego urządzenia?')) return
    setApiKey('')
    setSaved('')
    setStatus(null)
  }

  return (
    <section className="card">
      <h2>✨ Asystent AI (Claude)</h2>
      <p>
        Asystent układa i poprawia plany treningowe na podstawie Twojego opisu słowami. Działa na modelu Claude ({AI_MODEL}) firmy
        Anthropic i potrzebuje Twojego klucza API.
      </p>
      <ol className="steps-list">
        <li>
          Załóż konto na <b>console.anthropic.com</b>, doładuj saldo (np. 5 $) i wygeneruj klucz w sekcji <b>API Keys</b>.
        </li>
        <li>Wklej klucz poniżej i kliknij „Zapisz i sprawdź”.</li>
      </ol>
      {saved ? (
        <p className="ok-text">
          ✓ Klucz zapisany: <code>{saved.slice(0, 10)}…{saved.slice(-4)}</code>
        </p>
      ) : (
        <p className="warn-text">Brak klucza – asystent jest wyłączony.</p>
      )}
      <div className="link-row">
        <input
          type="password"
          autoComplete="off"
          placeholder={saved ? 'Wklej nowy klucz, żeby go zmienić' : 'sk-ant-…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="primary" onClick={save} disabled={!draft.trim() || busy}>
          Zapisz i sprawdź
        </button>
      </div>
      <div className="actions">
        {saved && (
          <button onClick={check} disabled={busy}>
            {busy ? 'Sprawdzam…' : 'Sprawdź połączenie'}
          </button>
        )}
        {saved && (
          <button className="danger" onClick={remove}>
            Usuń klucz
          </button>
        )}
      </div>
      {status && <p className={`small ${status.ok ? 'ok-text' : 'warn-text'}`}>{status.ok ? '✓ ' : '⚠ '}{status.text}</p>}
      <p className="muted small">
        Klucz jest zapisany tylko w tej przeglądarce na tym urządzeniu – nie trafia do kopii zapasowej ani nigdzie indziej poza
        zapytaniami do Anthropic. Nie udostępniaj tego urządzenia osobom, którym nie ufasz. Koszt: ułożenie lub poprawka planu to
        zwykle kilkadziesiąt groszy do ok. 1 zł (płacisz Anthropic za faktyczne użycie). Do AI wysyłane są: dane podopiecznego (bez
        imienia i nazwiska), jego notatki, ostatnie wyniki, Twoja prośba i lista ćwiczeń.
      </p>
    </section>
  )
}
