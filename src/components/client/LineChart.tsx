import { useLayoutEffect, useRef, useState } from 'react'
import { fmt } from '../../calc'
import { shortDate } from '../../sessions'

export interface Point {
  date: string
  value: number
}

/**
 * Wykres liniowy jednej miary w czasie (np. waga). Jedna seria → bez legendy, tytuł nazywa miarę.
 * Najechanie/dotknięcie pokazuje wartość najbliższego punktu.
 */
export function LineChart({ points, unit, height = 200 }: { points: Point[]; unit: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const data = [...points].sort((a, b) => a.date.localeCompare(b.date))
  if (data.length === 0) return null
  // Pierwsze wyrenderowanie: najpierw mierzymy kontener, potem rysujemy
  if (width === 0) return <div className="chart" ref={ref} style={{ height }} />

  const pad = { top: 16, right: 16, bottom: 28, left: 44 }
  const w = width - pad.left - pad.right
  const h = height - pad.top - pad.bottom
  const t = (d: string) => new Date(d).getTime()
  const t0 = t(data[0].date)
  const t1 = t(data[data.length - 1].date)
  const values = data.map((p) => p.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.05)
  lo -= span * 0.15
  hi += span * 0.15
  const x = (d: string) => pad.left + (t1 === t0 ? w / 2 : ((t(d) - t0) / (t1 - t0)) * w)
  const y = (v: number) => pad.top + h - ((v - lo) / (hi - lo)) * h
  const ticks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * (i + 0.5)) / 4)
  const path = data.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const digits = span < 5 ? 1 : 0

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let best = 0
    data.forEach((p, i) => {
      if (Math.abs(x(p.date) - px) < Math.abs(x(data[best].date) - px)) best = i
    })
    setHover(best)
  }

  const hp = hover !== null ? data[hover] : null

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={height}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Wykres: ${data.length} pomiarów`}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={pad.left + w} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={pad.left - 8} y={y(v)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
              {fmt(v, digits)}
            </text>
          </g>
        ))}
        <text x={pad.left} y={height - 8} className="chart-axis" textAnchor="start">
          {shortDate(data[0].date)}
        </text>
        {data.length > 1 && (
          <text x={pad.left + w} y={height - 8} className="chart-axis" textAnchor="end">
            {shortDate(data[data.length - 1].date)}
          </text>
        )}
        {hp && <line x1={x(hp.date)} x2={x(hp.date)} y1={pad.top} y2={pad.top + h} className="chart-cross" />}
        <path d={path} className="chart-line" />
        {data.map((p, i) => (
          <circle
            key={p.date + i}
            cx={x(p.date)}
            cy={y(p.value)}
            r={hover === i ? 6 : 4}
            className={i === data.length - 1 ? 'chart-dot last' : 'chart-dot'}
          />
        ))}
      </svg>
      {hp && (
        <div
          className="chart-tip"
          style={{ left: Math.min(width - 120, Math.max(0, x(hp.date) - 60)), top: Math.max(0, y(hp.value) - 52) }}
        >
          <strong>
            {fmt(hp.value, 1)} {unit}
          </strong>
          <span>{shortDate(hp.date)}</span>
        </div>
      )}
    </div>
  )
}
