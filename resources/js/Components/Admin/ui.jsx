// Admin UI kit: layout primitives, table that becomes cards on mobile, drawer, dialogs.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmModal from '@/Components/Community/ConfirmModal'
import { useToast } from '@/Components/Toast'
import { STATUS_TONE, num } from './lib'

/* ───────── context: toast + confirm/prompt + nav badges ───────── */
const Ctx = createContext(null)
export const useAdmin = () => useContext(Ctx)

export function AdminProvider({ children, badges, refreshBadges }) {
  const { showToast, ToastComponent } = useToast()
  const [dlg, setDlg] = useState(null)
  const toast = useCallback((m, t = 'success') => showToast(m, t), [showToast])
  /** confirm({title,message,confirmLabel,danger,fields:[{key,label,value,multiline,required}]}) → Promise<values|null> */
  const confirm = useCallback((cfg) => new Promise((res) => setDlg({ cfg, res })), [])
  const close = (v) => { dlg?.res(v); setDlg(null) }
  return (
    <Ctx.Provider value={{ toast, confirm, badges: badges || {}, refreshBadges: refreshBadges || (() => {}) }}>
      {children}
      {ToastComponent}
      {dlg && <Dialog cfg={dlg.cfg} onDone={close} />}
    </Ctx.Provider>
  )
}

function Dialog({ cfg, onDone }) {
  const fields = cfg.fields || []
  const [vals, setVals] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ''])))
  const missing = fields.some((f) => f.required && !String(vals[f.key] ?? '').trim())
  const set = (k, v) => setVals((x) => ({ ...x, [k]: v }))

  useEffect(() => {
    if (fields.length === 0) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => e.key === 'Escape' && onDone(null)
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc) }
  }, [])

  // Plain confirm (no inputs): keep the small centred modal.
  if (fields.length === 0) {
    return (
      <ConfirmModal
        title={cfg.title} message={cfg.message || ''} confirmLabel={cfg.confirmLabel || 'Confirm'}
        danger={cfg.danger !== false}
        onConfirm={() => onDone(vals)} onClose={() => onDone(null)}
      />
    )
  }

  // Forms: a real bottom sheet. Header and buttons stay put, ONLY the middle scrolls.
  const vars = { '--surf': '#14161c', '--surf2': '#1a1d25', '--line': 'rgba(255,255,255,.08)', '--ink': 'rgba(255,255,255,.9)', '--mute': 'rgba(255,255,255,.5)', '--acc': '#FF6B35', '--bad': '#ef6a6a' }
  return createPortal(
    <div onClick={() => onDone(null)} style={{ ...vars, position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', background: '#14161c', color: 'var(--ink)', borderRadius: '20px 20px 0 0', border: '1px solid var(--line)', boxShadow: '0 -12px 40px rgba(0,0,0,.5)' }}
      >
        <div style={{ padding: '10px 18px 0', flexShrink: 0 }}>
          <div style={{ width: 38, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.2)', margin: '0 auto 12px' }} />
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{cfg.title}</h3>
          {cfg.message ? <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--mute)', lineHeight: 1.5 }}>{cfg.message}</p> : null}
        </div>

        <div className="a-stack" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
          {fields.map((f) => (
            <label key={f.key} className="a-field">
              <span>{f.label}{f.required && ' *'}</span>
              {f.options ? (
                <select value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                </select>
              ) : f.multiline ? (
                <textarea rows={3} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input type={f.type || 'text'} value={vals[f.key]} onChange={(e) => set(f.key, e.target.value)} style={{ fontSize: 16 }} />
              )}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '12px 18px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--line)', flexShrink: 0 }}>
          <button type="button" className="a-btn" style={{ flex: 1 }} onClick={() => onDone(null)}>Cancel</button>
          <button
            type="button" disabled={missing}
            className={`a-btn ${cfg.danger === false ? 'primary' : 'danger'}`} style={{ flex: 1, opacity: missing ? 0.5 : 1 }}
            onClick={() => { if (!missing) onDone(vals) }}
          >{cfg.confirmLabel || 'Confirm'}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ───────── primitives ───────── */
export const PageHeader = ({ title, sub, actions, back }) => (
  <div className="a-ph">
    <div>
      {back && <a href={back.href} className="a-back">← {back.label}</a>}
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    {actions && <div className="a-ph-actions">{actions}</div>}
  </div>
)

export const Card = ({ title, sub, actions, children, pad = true, className = '' }) => (
  <section className={`a-card ${className}`}>
    {(title || actions) && (
      <header className="a-card-h">
        <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
        {actions && <div className="a-card-actions">{actions}</div>}
      </header>
    )}
    <div className={pad ? 'a-card-b' : ''}>{children}</div>
  </section>
)

export const Stat = ({ label, value, sub, tone, spark, onClick }) => (
  <div className={`a-stat ${onClick ? 'click' : ''} ${tone ? 'tone-' + tone : ''}`} onClick={onClick}>
    <span className="a-stat-l">{label}</span>
    <b className="a-stat-v">{value}</b>
    {sub != null && <span className="a-stat-s">{sub}</span>}
    {spark && <div className="a-stat-spark">{spark}</div>}
  </div>
)
export const StatGrid = ({ children }) => <div className="a-stats">{children}</div>

export const Pill = ({ tone, children }) => <span className={`a-pill tone-${tone || 'mute'}`}>{children}</span>
export const StatusPill = ({ status }) => (
  <Pill tone={STATUS_TONE[status] || 'mute'}>{String(status ?? '—').replace(/_/g, ' ')}</Pill>
)

export const Btn = ({ kind = 'ghost', size, busy, children, ...p }) => (
  <button {...p} disabled={p.disabled || busy} className={`a-btn ${kind} ${size || ''} ${p.className || ''}`}>
    {busy ? '…' : children}
  </button>
)

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="a-tabs" role="tablist">
    {tabs.map((t) => {
      const [k, label, count] = Array.isArray(t) ? t : [t.key, t.label, t.count]
      return (
        <button key={k} role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}{count ? <em>{count}</em> : null}
        </button>
      )
    })}
  </div>
)

export const Segmented = ({ options, value, onChange }) => (
  <div className="a-seg">
    {options.map((o) => {
      const [k, l] = Array.isArray(o) ? o : [o, o]
      return <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>
    })}
  </div>
)

export const SearchInput = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="a-search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
    <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
)

export const Select = ({ value, onChange, options, label }) => (
  <label className="a-select">
    {label && <span>{label}</span>}
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => { const [k, l] = Array.isArray(o) ? o : [o, o]; return <option key={k} value={k}>{l}</option> })}
    </select>
  </label>
)

export const Field = ({ label, hint, children }) => (
  <label className="a-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
)
export const Input = (p) => <input {...p} className="a-input" />
export const Textarea = (p) => <textarea rows={3} {...p} className="a-input" />

export const KV = ({ items }) => (
  <dl className="a-kv">
    {items.filter(Boolean).map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v ?? '—'}</dd></div>))}
  </dl>
)

export const Avatar = ({ src, name, size = 32 }) => (
  src ? <img className="a-av" src={src} alt="" style={{ width: size, height: size }} />
      : <span className="a-av ph" style={{ width: size, height: size, fontSize: size * 0.4 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>
)
export const UserCell = ({ user, href, sub }) => user ? (
  <a className="a-usercell" href={href ?? `/admin/users/${user.id}`}>
    <Avatar src={user.avatar_url ?? user.avatar} name={user.name} />
    <span><b>{user.name}</b><small>{sub ?? (user.username ? '@' + user.username : user.email)}</small></span>
  </a>
) : <span className="a-mute">—</span>

export const Empty = ({ title = 'Nothing here', sub, action }) => (
  <div className="a-empty"><div className="a-empty-ic">∅</div><b>{title}</b>{sub && <p>{sub}</p>}{action}</div>
)
export const Skeleton = ({ rows = 5 }) => (
  <div className="a-skel">{Array.from({ length: rows }).map((_, i) => <div key={i} style={{ width: `${70 + ((i * 13) % 30)}%` }} />)}</div>
)
export const ErrorBox = ({ error, onRetry }) => error ? (
  <div className="a-error">{error}{onRetry && <Btn size="sm" onClick={onRetry}>Retry</Btn>}</div>
) : null

/** Progress bar: value 0..1 */
export const Meter = ({ value, tone = 'info' }) => (
  <div className="a-meter"><div className={`tone-${tone}`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></div>
)

/* ───────── data table: desktop table, mobile cards ─────────
   columns: [{ key, label, render(row), mobile: 'title'|'sub'|'hide'|undefined, align, width }] */
export function DataTable({ columns, rows, loading, error, onRetry, rowKey = (r) => r.id, empty, onRowClick, rowActions }) {
  if (error) return <ErrorBox error={error} onRetry={onRetry} />
  if (loading && !rows.length) return <Skeleton />
  if (!rows.length) return empty ?? <Empty />
  const title = columns.find((c) => c.mobile === 'title') ?? columns[0]
  const subs = columns.filter((c) => c !== title && c.mobile !== 'hide')
  return (
    <div className={`a-tw ${loading ? 'busy' : ''}`}>
      <table className="a-table">
        <thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align, width: c.width }}>{c.label}</th>)}{rowActions && <th />}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={onRowClick ? 'click' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => <td key={c.key} style={{ textAlign: c.align }}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              {rowActions && <td className="a-ra" onClick={(e) => e.stopPropagation()}>{rowActions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="a-cards">
        {rows.map((r) => (
          <div key={rowKey(r)} className="a-rc" onClick={onRowClick ? () => onRowClick(r) : undefined}>
            <div className="a-rc-top">{title.render ? title.render(r) : r[title.key]}</div>
            <div className="a-rc-grid">
              {subs.map((c) => (
                <div key={c.key}><small>{c.label}</small><div>{c.render ? c.render(r) : r[c.key] ?? '—'}</div></div>
              ))}
            </div>
            {rowActions && <div className="a-rc-actions" onClick={(e) => e.stopPropagation()}>{rowActions(r)}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

export const Pager = ({ meta, onPage }) => {
  if (!meta || !meta.last_page || meta.last_page <= 1) return meta?.total != null ? <div className="a-pager"><span>{num(meta.total)} total</span></div> : null
  const p = meta.current_page, L = meta.last_page
  return (
    <div className="a-pager">
      <span>{num(meta.total)} total · page {p} of {L}</span>
      <div>
        <Btn size="sm" disabled={p <= 1} onClick={() => onPage(p - 1)}>← Prev</Btn>
        <Btn size="sm" disabled={p >= L} onClick={() => onPage(p + 1)}>Next →</Btn>
      </div>
    </div>
  )
}

/** Right-side drawer on desktop, bottom sheet on mobile. */
export function Drawer({ open, onClose, title, children, width = 520 }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="a-drawer-wrap" onClick={onClose}>
      <aside className="a-drawer" style={{ '--w': width + 'px' }} onClick={(e) => e.stopPropagation()}>
        <header><h3>{title}</h3><button onClick={onClose} aria-label="Close">✕</button></header>
        <div className="a-drawer-b">{children}</div>
      </aside>
    </div>
  )
}

export const Toolbar = ({ children }) => <div className="a-toolbar">{children}</div>
export const Grid = ({ cols = 2, children }) => <div className={`a-grid c${cols}`}>{children}</div>
export const Timeline = ({ items }) => (
  <ol className="a-tl">
    {items.map((it, i) => (
      <li key={i} className={it.done === false ? 'todo' : ''}><i /><div><b>{it.title}</b>{it.sub && <small>{it.sub}</small>}</div></li>
    ))}
  </ol>
)
