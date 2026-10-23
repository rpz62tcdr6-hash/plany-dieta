import { useEffect, useRef, useState } from 'react'
import { hasApiKey } from '../ai/key'
import { href } from '../router'

interface Props {
  placeholder: string
  examples: string[]
  buttonLabel: string
  /** Wywołanie AI; rzuca błąd, który pokażemy po polsku */
  run: (prompt: string, signal: AbortSignal) => Promise<void>
  initial?: string
}

/** Pole na polecenie dla AI z przykładami, licznikiem czasu i możliwością anulowania */
export function AiPrompt({ placeholder, examples, buttonLabel, run, initial = '' }: Props) {
  const [prompt, setPrompt] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  useEffect(() => () => abort.current?.abort(), [])

  if (!hasApiKey()) {
    return (
      <div className="ai-box disabled">
        <p>
          <b>Asystent AI jest wyłączony.</b> Dodaj klucz API w <a href={href({ name: 'backup' })}>Ustawieniach</a>, żeby układać
          plany z opisu słowami.
        </p>
      </div>
    )
  }

  async function go() {
    if (!prompt.trim() || busy) return
    setBusy(true)
    setError('')
    setSeconds(0)
    abort.current = new AbortController()
    try {
      await run(prompt, abort.current.signal)
    } catch (e) {
      const { describeError } = await import('../ai/client')
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-box">
      <textarea
        rows={5}
        placeholder={placeholder}
        value={prompt}
        disabled={busy}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className="chips compact ai-examples">
        {examples.map((ex) => (
          <button key={ex} type="button" className="chip" disabled={busy} onClick={() => setPrompt((p) => (p ? `${p}\n${ex}` : ex))}>
            + {ex}
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="primary big" onClick={go} disabled={busy || !prompt.trim()}>
          {busy ? `✨ AI pracuje… ${seconds} s` : buttonLabel}
        </button>
        {busy && (
          <button type="button" onClick={() => abort.current?.abort()}>
            Anuluj
          </button>
        )}
      </div>
      {busy && <p className="muted small">Układanie planu trwa zwykle 20–90 sekund. Nie zamykaj tej strony.</p>}
      {error && <p className="warn-text small">⚠ {error}</p>}
    </div>
  )
}
