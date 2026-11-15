// Dependency-free SVG charts for the admin. Palette = validated categorical order (dark surface).
import { useEffect, useMemo, useRef, useState } from 'react'

export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const INK = 'rgba(255,255,255,0.86)'
const MUTED = 'rgba(255,255,255,0.45)'
const GRID = 'rgba(255,255,255,0.07)'
const SURFACE = '#14161c'

function useWidth() {
  const ref = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}

const niceMax = (v) => {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

export function Legend({ items }) {
  if (!items || items.length < 2) return null
  return (
    <div className="a-legend">
      {items.map((it) => (
        <span key={it.name}><i style={{ background: it.color }} />{it.name}</span>
      ))}
    </div>
  )
}

/**
 * series: [{ name, color?, data: [{ x: 'label', y: number }] }]  (all series share x order)
 * Hover/touch crosshair with a tooltip listing every series for that x.
 */
export function LineChart({ series, height = 240, yFormat = (v) => v, area = true, className = '' }) {
  const [ref, W] = useWidth()
  const [hi, setHi] = useState(null)
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? SERIES[i % SERIES.length] }))
  const n = Math.max(0, ...colored.map((s) => s.data.length))
  const M = { t: 14, r: 12, b: 26, l: 46 }
  const w = W - M.l - M.r
  const h = height - M.t - M.b
  const max = niceMax(Math.max(0, ...colored.flatMap((s) => s.data.map((d) => Number(d.y) || 0))))
  const X = (i) => M.l + (n <= 1 ? w / 2 : (i / (n - 1)) * w)
  const Y = (v) => M.t + h - (v / max) * h
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const labels = colored[0]?.data ?? []
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 70))))

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    const i = Math.round(((cx - M.l) / w) * (n - 1))
    setHi(Math.min(n - 1, Math.max(0, i)))
  }

  if (!n) return <div ref={ref} className="a-chart-empty" style={{ height }}>No data for this period</div>

  return (
    <div ref={ref} className={`a-chart ${className}`} style={{ position: 'relative' }}>
      <svg width={W} height={height} onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={() => setHi(null)} onTouchEnd={() => setHi(null)} role="img">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={Y(t)} y2={Y(t)} stroke={GRID} />
            <text x={M.l - 8} y={Y(t) + 4} textAnchor="end" fontSize="10" fill={MUTED}>{yFormat(t)}</text>
          </g>
        ))}
        {labels.map((d, i) => i % step === 0 && (
          <text key={i} x={X(i)} y={height - 8} textAnchor="middle" fontSize="10" fill={MUTED}>{d.x}</text>
        ))}
        {colored.map((s) => {
          const pts = s.data.map((d, i) => [X(i), Y(Number(d.y) || 0)])
          const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
          return (
            <g key={s.name}>
              {area && colored.length <= 2 && pts.length > 1 && (
                <path d={`${path} L${pts[pts.length - 1][0]},${M.t + h} L${pts[0][0]},${M.t + h} Z`} fill={s.color} opacity="0.12" />
              )}
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r="4" fill={s.color} />}
            </g>
          )
        })}
        {hi != null && (
          <g>
            <line x1={X(hi)} x2={X(hi)} y1={M.t} y2={M.t + h} stroke="rgba(255,255,255,0.25)" />
            {colored.map((s) => s.data[hi] && (
              <circle key={s.name} cx={X(hi)} cy={Y(Number(s.data[hi].y) || 0)} r="4.5" fill={s.color} stroke={SURFACE} strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hi != null && (
        <div className="a-tip" style={{ left: Math.min(W - 160, Math.max(0, X(hi) + 12)), top: 8 }}>
          <b>{labels[hi]?.x}</b>
          {colored.map((s) => (
            <div key={s.name}><i style={{ background: s.color }} />{s.name}<span>{yFormat(Number(s.data[hi]?.y) || 0)}</span></div>
          ))}
        </div>
      )}
      <Legend items={colored} />
    </div>
  )
}

/** data: [{ label, value, color?, sub? }] — vertical or horizontal bars with hover values. */
export function BarChart({ data, height = 240, horizontal = false, valueFormat = (v) => v, color = SERIES[0] }) {
  const [ref, W] = useWidth()
  const [hi, setHi] = useState(null)
  const max = niceMax(Math.max(0, ...data.map((d) => Number(d.value) || 0)))
  if (!data.length) return <div ref={ref} className="a-chart-empty" style={{ height: 120 }}>No data</div>

  if (horizontal) {
    return (
      <div ref={ref} className="a-hbars">
        {data.map((d, i) => (
          <div key={d.label + i} className="a-hbar" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
            <div className="a-hbar-top">
              <span className="a-hbar-label">{d.label}</span>
              <span className="a-hbar-val">{valueFormat(d.value)}</span>
            </div>
            <div className="a-hbar-track">
              <div style={{ width: `${Math.max(2, ((Number(d.value) || 0) / max) * 100)}%`, background: d.color ?? color, opacity: hi == null || hi === i ? 1 : 0.5 }} />
            </div>
            {d.sub && <div className="a-hbar-sub">{d.sub}</div>}
          </div>
        ))}
      </div>
    )
  }

  const M = { t: 12, r: 8, b: 28, l: 44 }
  const w = W - M.l - M.r, h = height - M.t - M.b
  const bw = Math.min(40, (w / data.length) * 0.62)
  const step = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 56))))
  return (
    <div ref={ref} className="a-chart" style={{ position: 'relative' }}>
      <svg width={W} height={height} onMouseLeave={() => setHi(null)}>
        {[0, 0.5, 1].map((t, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={M.t + h - t * h} y2={M.t + h - t * h} stroke={GRID} />
            <text x={M.l - 8} y={M.t + h - t * h + 4} textAnchor="end" fontSize="10" fill={MUTED}>{valueFormat(t * max)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = M.l + ((i + 0.5) / data.length) * w
          const bh = ((Number(d.value) || 0) / max) * h
          return (
            <g key={i} onMouseEnter={() => setHi(i)} onTouchStart={() => setHi(i)}>
              <rect x={cx - (w / data.length) / 2} y={M.t} width={w / data.length} height={h} fill="transparent" />
              <path d={`M${cx - bw / 2},${M.t + h} V${M.t + h - bh + 4} Q${cx - bw / 2},${M.t + h - bh} ${cx - bw / 2 + 4},${M.t + h - bh} H${cx + bw / 2 - 4} Q${cx + bw / 2},${M.t + h - bh} ${cx + bw / 2},${M.t + h - bh + 4} V${M.t + h} Z`}
                fill={d.color ?? color} opacity={hi == null || hi === i ? 1 : 0.5} />
              {i % step === 0 && <text x={cx} y={height - 9} textAnchor="middle" fontSize="10" fill={MUTED}>{d.label}</text>}
            </g>
          )
        })}
      </svg>
      {hi != null && (
        <div className="a-tip" style={{ left: Math.min(W - 150, Math.max(0, M.l + ((hi + 0.5) / data.length) * w + 10)), top: 8 }}>
          <b>{data[hi].label}</b><div>{valueFormat(data[hi].value)}</div>
        </div>
      )}
    </div>
  )
}

/** data: [{ label, value, color? }] */
export function Donut({ data, size = 160, center, valueFormat = (v) => v }) {
  const [hi, setHi] = useState(null)
  const items = data.map((d, i) => ({ ...d, color: d.color ?? SERIES[i % SERIES.length] }))
  const total = items.reduce((a, d) => a + (Number(d.value) || 0), 0)
  const R = size / 2 - 6, r = R - 18, c = size / 2
  let a0 = -Math.PI / 2
  const arcs = items.map((d) => {
    const frac = total ? (Number(d.value) || 0) / total : 0
    const a1 = a0 + frac * Math.PI * 2 - (frac > 0.999 ? 0.0001 : 0.03 * (frac > 0 ? 1 : 0))
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (rad, a) => [c + rad * Math.cos(a), c + rad * Math.sin(a)]
    const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0)
    const path = frac > 0 ? `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z` : null
    a0 += frac * Math.PI * 2
    return { ...d, path, frac }
  })
  const active = hi != null ? arcs[hi] : null
  return (
    <div className="a-donut">
      <svg width={size} height={size} role="img">
        {total === 0 && <circle cx={c} cy={c} r={(R + r) / 2} fill="none" stroke={GRID} strokeWidth={R - r} />}
        {arcs.map((d, i) => d.path && (
          <path key={d.label} d={d.path} fill={d.color} opacity={hi == null || hi === i ? 1 : 0.4} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
        ))}
        <text x={c} y={c - 2} textAnchor="middle" fontSize="20" fontWeight="800" fill={INK}>{active ? valueFormat(active.value) : center?.value ?? valueFormat(total)}</text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize="10" fill={MUTED}>{active ? `${Math.round(active.frac * 100)}% · ${active.label}` : center?.label ?? 'Total'}</text>
      </svg>
      <div className="a-donut-legend">
        {items.map((d, i) => (
          <div key={d.label} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
            <i style={{ background: d.color }} /><span>{d.label}</span><b>{valueFormat(d.value)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ data = [], color = SERIES[0], height = 34, width = 110 }) {
  if (data.length < 2) return <svg width={width} height={height} />
  const max = Math.max(...data), min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (width - 4) + 2, height - 4 - ((v - min) / span) * (height - 8)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} aria-hidden="true">
      <path d={`${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** rows × cols grid, values[row][col]; single blue sequential ramp. */
export function Heatmap({ rowLabels, colLabels, values, valueFormat = (v) => v, unit = '' }) {
  const [hi, setHi] = useState(null)
  const max = Math.max(1, ...values.flat().map(Number))
  const ramp = (v) => {
    const t = v / max
    const a = 0.08 + t * 0.9
    return `rgba(57,135,229,${a.toFixed(2)})`
  }
  return (
    <div className="a-heat">
      <div className="a-heat-grid" style={{ gridTemplateColumns: `34px repeat(${colLabels.length}, 1fr)` }}>
        <span />
        {colLabels.map((c, i) => <span key={i} className="a-heat-col">{i % 3 === 0 ? c : ''}</span>)}
        {rowLabels.map((r, ri) => (
          <>
            <span key={'r' + ri} className="a-heat-row">{r}</span>
            {colLabels.map((c, ci) => {
              const v = Number(values[ri]?.[ci] ?? 0)
              return <span key={ri + '-' + ci} className="a-heat-cell" style={{ background: v ? ramp(v) : 'rgba(255,255,255,0.04)' }} onMouseEnter={() => setHi({ r, c, v })} onMouseLeave={() => setHi(null)} title={`${r} ${c}: ${valueFormat(v)}${unit}`} />
            })}
          </>
        ))}
      </div>
      <div className="a-heat-foot">{hi ? `${hi.r} · ${hi.c} — ${valueFormat(hi.v)}${unit}` : 'Hover a cell for details'}</div>
    </div>
  )
}

/** Ordinal funnel: stages [{label, value}] each bar scaled to the first. */
export function Funnel({ stages, valueFormat = (v) => v }) {
  const top = Math.max(1, Number(stages[0]?.value) || 1)
  return (
    <div className="a-funnel">
      {stages.map((s, i) => {
        const pct = ((Number(s.value) || 0) / top) * 100
        const drop = i > 0 && stages[i - 1].value ? Math.round((1 - s.value / stages[i - 1].value) * 100) : null
        return (
          <div key={s.label} className="a-funnel-row">
            <div className="a-funnel-top"><span>{s.label}</span><b>{valueFormat(s.value)}{drop != null && <em> −{drop}%</em>}</b></div>
            <div className="a-hbar-track"><div style={{ width: `${Math.max(2, pct)}%`, background: SERIES[0], opacity: 1 - i * 0.14 }} /></div>
          </div>
        )
      })}
    </div>
  )
}
