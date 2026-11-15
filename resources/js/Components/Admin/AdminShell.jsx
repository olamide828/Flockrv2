import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import {
  RiDashboardLine, RiLineChartLine, RiShoppingBag3Line, RiScalesLine, RiBankLine, RiBookletLine, RiCouponLine,
  RiVipCrownLine, RiCalendarEventLine, RiGroupLine, RiFlagLine, RiCustomerService2Line, RiAlarmWarningLine,
  RiForbidLine, RiMovieLine, RiShoppingCartLine, RiMusic2Line, RiChat3Line, RiMedalLine, RiEqualizerLine,
  RiHeartPulseLine, RiHistoryLine, RiMenuLine, RiMoreLine, RiSearchLine,
} from 'react-icons/ri'
import css from './styles'
import { AdminProvider } from './ui'
import { useDebounced } from './lib'

export const NAV = [
  ['Overview', [
    ['dashboard', 'Dashboard', RiDashboardLine], ['analytics', 'Analytics', RiLineChartLine],
  ]],
  ['Commerce', [
    ['orders', 'Orders', RiShoppingBag3Line, 'orders'], ['disputes', 'Disputes', RiScalesLine, 'disputes'],
    ['payouts', 'Payouts', RiBankLine, 'payouts'], ['ledger', 'Ledger', RiBookletLine],
    ['coupons', 'Coupons', RiCouponLine], ['subscriptions', 'Subscriptions', RiVipCrownLine], ['events', 'Events', RiCalendarEventLine],
  ]],
  ['People', [
    ['users', 'Users', RiGroupLine], ['flagged-sellers', 'Flagged sellers', RiFlagLine, 'flagged'],
    ['support', 'Support tickets', RiCustomerService2Line, 'tickets'], ['reports', 'Reports', RiAlarmWarningLine, 'reports'],
    ['blocks', 'Blocks', RiForbidLine],
  ]],
  ['Content', [
    ['videos', 'Videos', RiMovieLine, 'videos'], ['products', 'Products', RiShoppingCartLine], ['music', 'Music', RiMusic2Line, 'claims'],
    ['rooms', 'Rooms', RiChat3Line], ['badges', 'Badges', RiMedalLine], ['feed', 'Feed controls', RiEqualizerLine],
  ]],
  ['System', [
    ['system', 'System health', RiHeartPulseLine, 'failed_jobs'], ['audit', 'Audit log', RiHistoryLine],
  ]],
]

const TABS = [['dashboard', 'Home', RiDashboardLine], ['orders', 'Orders', RiShoppingBag3Line, 'orders'], ['users', 'Users', RiGroupLine], ['reports', 'Reports', RiAlarmWarningLine, 'reports']]

const current = () => (typeof window === 'undefined' ? '' : window.location.pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'dashboard')

function GlobalSearch() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState([])
  const [open, setOpen] = useState(false)
  const d = useDebounced(q, 250)
  const ref = useRef(null)
  useEffect(() => {
    if (d.trim().length < 2) { setRes([]); return }
    let live = true
    axios.get('/api/admin/search', { params: { q: d } }).then((r) => live && setRes(r.data.results || [])).catch(() => {})
    return () => { live = false }
  }, [d])
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus() } }
    const c = (e) => { if (!e.target.closest?.('.a-gsw')) setOpen(false) }
    window.addEventListener('keydown', k); window.addEventListener('click', c)
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('click', c) }
  }, [])
  return (
    <div className="a-gsw a-gs">
      <div className="a-search" style={{ maxWidth: 'none' }}>
        <RiSearchLine size={15} />
        <input ref={ref} value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }} placeholder="Search users, orders, products… (Ctrl K)" />
      </div>
      {open && q.trim().length >= 2 && (
        <div className="a-gsr">
          {res.length === 0 ? <div className="a-empty" style={{ padding: 20 }}>No matches</div> : res.map((r, i) => (
            <a key={i} href={r.href}><span className="t">{r.type}</span><span><b>{r.label}</b><small>{r.sub}</small></span></a>
          ))}
        </div>
      )}
    </div>
  )
}


// Your logo lives at public/flockr_logo_orange.<ext>. We try the common extensions, then fall back to the text mark.
const LOGO_EXTS = ['png', 'svg', 'webp', 'jpg']
function BrandLogo() {
  const [i, setI] = useState(0)
  const failed = i >= LOGO_EXTS.length
  return (
    <div className="a-brand">
      {failed
        ? <><i /><span>Flockr<small>Admin</small></span></>
        : <><img src={`/flockr_logo_orange.${LOGO_EXTS[i]}`} alt="Flockr" onError={() => setI(i + 1)} /><small className="a-tag">Admin</small></>}
    </div>
  )
}

export default function AdminShell({ children }) {
  const [open, setOpen] = useState(false)
  const [badges, setBadges] = useState({})
  const here = current()

  const refreshBadges = useCallback(() => {
    axios.get('/api/admin/badges').then((r) => setBadges(r.data || {})).catch(() => {})
  }, [])
  useEffect(() => { refreshBadges(); const t = setInterval(refreshBadges, 60000); return () => clearInterval(t) }, [refreshBadges])

  const Item = ({ slug, label, Icon, badge }) => (
    <a href={`/admin/${slug}`} className={`a-nav ${here === slug ? 'on' : ''}`} onClick={() => setOpen(false)}>
      <Icon size={17} />{label}{badges[badge] > 0 && <em>{badges[badge]}</em>}
    </a>
  )

  return (
    <AdminProvider badges={badges} refreshBadges={refreshBadges}>
      <div className="adm">
        <style>{css}</style>
        {open && <div className="a-scrim" onClick={() => setOpen(false)} />}
        <aside className={`a-side ${open ? 'open' : ''}`}>
          <BrandLogo />
          {NAV.map(([group, items]) => (
            <div key={group} className="a-navg"><span>{group}</span>{items.map(([s, l, I, b]) => <Item key={s} slug={s} label={l} Icon={I} badge={b} />)}</div>
          ))}
          <div style={{ flex: 1 }} />
          <div className="a-navg"><a className="a-nav" href="/">← Back to app</a></div>
        </aside>
        <div className="a-main">
          <div className="a-bar">
            <button className="a-burger" onClick={() => setOpen(true)} aria-label="Menu"><RiMenuLine size={22} /></button>
            <GlobalSearch />
          </div>
          <div className="a-content">{children}</div>
        </div>
        <nav className="a-tabbar">
          {TABS.map(([s, l, I, b]) => (
            <a key={s} href={`/admin/${s}`} className={here === s ? 'on' : ''}><I size={20} />{l}{badges[b] > 0 && <em>{badges[b]}</em>}</a>
          ))}
          <button onClick={() => setOpen(true)}><RiMoreLine size={20} />More</button>
        </nav>
      </div>
    </AdminProvider>
  )
}
