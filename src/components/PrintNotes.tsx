import { Fragment } from 'react'

type Block =
  | { kind: 'table'; rows: [string, string][] }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'chips'; items: string[] }
  | { kind: 'text'; text: string }

const KV = /^([^:•]{2,40}):\s*(.+)$/

/**
 * Zamienia opis planu/diety (zwykły tekst) na czytelne elementy do PDF:
 * „Etykieta: treść” → wiersz tabeli, „•” → lista, „Nagłówek:” → nagłówek, „a · b · c” → etykiety.
 */
function parse(text: string): Block[][] {
  return text
    .split(/\n\s*\n/)
    .map((section) => {
      const blocks: Block[] = []
      const push = (b: Block) => {
        const last = blocks[blocks.length - 1]
        if (b.kind === 'table' && last?.kind === 'table') last.rows.push(...b.rows)
        else if (b.kind === 'list' && last?.kind === 'list') last.items.push(...b.items)
        else blocks.push(b)
      }
      for (const raw of section.split('\n')) {
        const line = raw.trim()
        if (!line) continue
        if (line.startsWith('•')) {
          push({ kind: 'list', items: [line.replace(/^•\s*/, '')] })
          continue
        }
        if (line.endsWith(':') && line.length < 60) {
          push({ kind: 'heading', text: line.slice(0, -1) })
          continue
        }
        const parts = line.split(' · ')
        if (parts.length > 1 && parts.every((p) => KV.test(p))) {
          push({ kind: 'table', rows: parts.map((p) => p.match(KV)!.slice(1, 3) as [string, string]) })
          continue
        }
        const kv = line.match(KV)
        if (kv) {
          push({ kind: 'table', rows: [[kv[1], kv[2]]] })
          continue
        }
        if (parts.length > 1) {
          push({ kind: 'chips', items: parts })
          continue
        }
        push({ kind: 'text', text: line })
      }
      return blocks
    })
    .filter((b) => b.length > 0)
}

export function PrintNotes({ text, title }: { text: string; title: string }) {
  const sections = parse(text)
  if (sections.length === 0) return null
  return (
    <section className="print-info">
      <h2 className="print-info-title">{title}</h2>
      {sections.map((blocks, si) => {
        // Sekcja z samym tekstem (np. własne uwagi trenera) – w wyróżnionej ramce
        const plain = blocks.every((b) => b.kind === 'text')
        return (
          <div key={si} className={`print-info-section ${plain ? 'note' : ''}`}>
            {plain && <span className="print-info-label">Uwagi trenera</span>}
            {blocks.map((b, bi) => (
              <Fragment key={bi}>
                {b.kind === 'table' && (
                  <table className="info-table">
                    <tbody>
                      {b.rows.map(([k, v], ri) => (
                        <tr key={ri}>
                          <th>{k}</th>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {b.kind === 'heading' && <h3 className="info-heading">{b.text}</h3>}
                {b.kind === 'list' && (
                  <ul className="info-list">
                    {b.items.map((it, ii) => (
                      <li key={ii}>{it}</li>
                    ))}
                  </ul>
                )}
                {b.kind === 'chips' && (
                  <div className="info-chips">
                    {b.items.map((it, ii) => (
                      <span key={ii}>{it}</span>
                    ))}
                  </div>
                )}
                {b.kind === 'text' && <p className="info-text">{b.text}</p>}
              </Fragment>
            ))}
          </div>
        )
      })}
    </section>
  )
}
