import axios from 'axios'
import { usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { RiCompass3Line, RiGiftLine, RiCloseLine } from 'react-icons/ri'

/**
 * Floating scavenger-hunt progress pill. Mounted once in AppLayout; it only appears for logged-in buyers
 * while a live event with a hunt exists, and only on /events, /events/{id} and /shop.
 */
export default function HuntProgress() {
  const { auth } = usePage().props
  const [hunts, setHunts] = useState([])
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('hunt_hidden') === '1' } catch { return false } })

  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const relevant = /^\/(events|shop)/.test(path)

  useEffect(() => {
    if (!auth?.user || !relevant || hidden) return
    axios.get('/api/events/hunts').then((r) => setHunts((r.data.hunts || []).filter((h) => h.live))).catch(() => {})
  }, [auth?.user?.id, path, hidden])

  if (!auth?.user || !relevant || hidden || hunts.length === 0) return null
  const h = hunts[0]
  const pct = Math.min(100, Math.round((h.bought_from / h.target) * 100))

  const dismiss = () => { setHidden(true); try { sessionStorage.setItem('hunt_hidden', '1') } catch {} }

  return (
    <div style={{ position: 'fixed', left: 12, right: 12, bottom: 84, zIndex: 60, maxWidth: 420, margin: '0 auto' }}>
      <div style={{ background: 'rgba(17,17,17,0.97)', border: '1px solid rgba(255,107,53,0.35)', borderRadius: 18, padding: open ? 16 : '10px 14px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
          {h.rewarded ? <RiGiftLine size={20} color="#10B981" /> : <RiCompass3Line size={20} color="#FF6B35" />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{h.rewarded ? 'Hunt complete — reward unlocked!' : `Scavenger hunt: ${h.bought_from}/${h.target} sellers`}</div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginTop: 6 }}>
              <div style={{ width: `${h.rewarded ? 100 : pct}%`, height: '100%', borderRadius: 3, background: h.rewarded ? '#10B981' : '#FF6B35', transition: 'width .6s' }} />
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); dismiss() }} aria-label="Hide" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}><RiCloseLine size={18} /></button>
        </div>
        {open && (
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 12.5, lineHeight: 1.5 }}>
            {h.rewarded
              ? `You already earned your ₦${Number(h.reward).toLocaleString()} coupon from ${h.title}. Find it in your dashboard under Coupons.`
              : `Buy from ${h.remaining} more different seller${h.remaining === 1 ? '' : 's'} taking part in ${h.title} and you'll automatically get a ₦${Number(h.reward).toLocaleString()} coupon.`}
          </p>
        )}
      </div>
    </div>
  )
}
