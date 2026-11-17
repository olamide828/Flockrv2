import axios from 'axios'
import { router, usePage } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { RiTrophyFill, RiCloseLine } from 'react-icons/ri'

/**
 * "Your event has ended" pop-up. Shown once per event to sellers who took part, with their rank and a button
 * to the full results page. Mounted once in AppLayout.
 */
const seenKey = (id) => `flockr_event_seen_${id}`
const wasSeen = (id) => { try { return localStorage.getItem(seenKey(id)) === '1' } catch { return false } }
const markSeen = (id) => { try { localStorage.setItem(seenKey(id), '1') } catch {} }
const naira = (n) => '₦' + Number(n || 0).toLocaleString()

export default function EventEndedModal() {
  const { auth } = usePage().props
  const [item, setItem] = useState(null)

  useEffect(() => {
    if (!auth?.user || auth.user.role !== 'seller') return
    axios.get('/api/events/my-ended').then((r) => {
      const next = (r.data.events || []).find((e) => !wasSeen(e.event_id))
      if (next) setItem(next)
    }).catch(() => {})
  }, [auth?.user?.id])

  if (!item) return null
  const close = () => { markSeen(item.event_id); setItem(null) }
  const open = () => { markSeen(item.event_id); setItem(null); router.visit(`/seller/events/${item.event_id}/results`) }
  const s = item.stats || {}
  const champion = s.rank === 1 && s.revenue > 0

  return (
    <div role="dialog" aria-modal="true" onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: '#141414', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '28px 22px 22px', textAlign: 'center', position: 'relative', color: '#fff' }}>
        <button onClick={close} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 999, width: 32, height: 32, color: '#fff', cursor: 'pointer' }}><RiCloseLine size={18} /></button>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 14px', background: item.color || '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RiTrophyFill size={32} /></div>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: 1.4, fontWeight: 800, color: 'rgba(255,255,255,.5)' }}>EVENT ENDED</p>
        <h3 style={{ margin: '6px 0 10px', fontSize: 20, fontWeight: 800 }}>{item.title}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}>
          {champion ? '🏆 You were the top seller! The Champion badge is on your profile.' : `You finished #${s.rank} of ${s.total_sellers} sellers.`}
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.05)', borderRadius: 14, padding: 12 }}><b style={{ display: 'block', fontSize: 18 }}>{s.orders_count ?? 0}</b><small style={{ color: 'rgba(255,255,255,.5)' }}>Sales</small></div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.05)', borderRadius: 14, padding: 12 }}><b style={{ display: 'block', fontSize: 18 }}>{naira(s.revenue)}</b><small style={{ color: 'rgba(255,255,255,.5)' }}>Revenue</small></div>
        </div>
        <button onClick={open} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 14, background: '#FF6B35', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>See my results</button>
      </div>
    </div>
  )
}
