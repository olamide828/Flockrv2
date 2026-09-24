import { useEffect, useRef, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import { RiCheckLine, RiLoader4Line, RiArrowLeftLine, RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'
import ConfirmModal from '@/Components/Community/ConfirmModal'
import { useToast } from '@/Components/Toast'

function HScroller({ children }) {
  const ref = useRef(null)
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => scroll(-1)} className="hscroller-arrow hscroller-left"><RiArrowLeftSLine size={18} /></button>
      <div ref={ref} style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        {children}
      </div>
      <button onClick={() => scroll(1)} className="hscroller-arrow hscroller-right"><RiArrowRightSLine size={18} /></button>
    </div>
  )
}

export default function EventShow({ event, products = [], myParticipation }) {
  const { auth } = usePage().props
  const [countdown, setCountdown]   = useState('')
  const [joining, setJoining]       = useState(false)
  const [joined, setJoined]         = useState(myParticipation)
const { showToast, ToastComponent } = useToast()
const [confirmLeave, setConfirmLeave] = useState(false)
const [showJoinSheet, setShowJoinSheet] = useState(false);


  const [leaving, setLeaving] = useState(false)


const handleLeave = async () => {
  try {
    await axios.delete(`/api/events/${event.id}/join`)
    setJoined(null)
    showToast('You left the event.', 'success')
  } catch (e) {
    showToast(e.response?.data?.message ?? 'Failed to leave event.', 'error')
  }
}

const byCategory = products.reduce((acc, p) => {
  const cat = p.category?.name ?? 'Other'
  ;(acc[cat] ??= []).push(p)
  return acc
}, {})

  useEffect(() => {
    const target = event.status === 'active' ? event.ends_at : event.starts_at
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setCountdown('—'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [event])

  const isSeller = auth?.user?.role === 'seller'

  const handleJoin = async (percent) => {
  setJoining(true)
  try {
    const { data } = await axios.post(`/api/events/${event.id}/join`, { discount_percent: percent })
    setJoined(data.participant)
    showToast(`You're in with ${percent}% off!`, 'success')
  } catch (e) {
    showToast(e.response?.data?.message ?? 'Failed to join event.', 'error')
  } finally {
    setJoining(false)
  }
}

  return (
    <>
      <Head title={event.title} />
      <div style={{ height: '100%', overflowY: 'auto', background: '#0A0A0A', color: '#fff', fontFamily: '"DM Sans", sans-serif', paddingBottom: 100 }}>

        <div style={{ position: 'relative' }}>
  {event.banner_image
    ? <img src={event.banner_image} alt={event.title} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
    : <div style={{ width: '100%', height: 180, background: `linear-gradient(135deg, ${event.theme_color ?? '#FF6B35'}, #111)` }} />
  }
  <button onClick={() => window.history.back()} style={{ position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
    <RiArrowLeftLine size={19} />
  </button>
</div>

        <div style={{ padding: '20px 20px 0', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ padding: '3px 12px', borderRadius: 999, background: event.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: event.status === 'active' ? '#10B981' : '#3B82F6', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
              {event.status === 'active' ? 'Live now' : 'Upcoming'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              {event.status === 'active' ? 'Ends in' : 'Starts in'} <strong style={{ color: '#fff' }}>{countdown}</strong>
            </span>
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 26, fontWeight: 800 }}>{event.title}</h1>
          {event.description && <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>{event.description}</p>}
          {event.max_sellers && (
  <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
    {event.participants_count}/{event.max_sellers} sellers joined{event.participants_count >= event.max_sellers ? ' — full' : ''}
  </p>
)}
          {isSeller && event.status !== 'ended' && (
  <div style={{ padding: '18px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, marginBottom: 24 }}>
    {joined ? (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', marginBottom: event.status === 'scheduled' ? 10 : 0 }}>
      <RiCheckLine size={18} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        You're in with {joined.discount_percent}% off — your prices update automatically for this event.
      </span>
    </div>
    {event.status === 'scheduled' && (
      <button
        onClick={() => setConfirmLeave(true)}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#EF4444',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Leave event
      </button>
    )}
  </div>
) : (
  <button
    onClick={() => setShowJoinSheet(true)}
    style={{
      padding: '11px 24px',
      borderRadius: 12,
      background: event.theme_color ?? '#FF6B35',
      border: 'none',
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
    }}
  >
    Join Event
  </button>
)}
  </div>
)}

{event.status !== 'ended' && (
  <>
    <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Deals in this event</h2>
    {products.length === 0 ? (
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No sellers have joined yet — check back soon.</p>
    ) : (
      <>
        <HScroller>
          {products.map(p => <div key={p.id} style={{ flexShrink: 0, width: 160 }}><ProductCard product={p} /></div>)}
        </HScroller>

        {Object.entries(byCategory).map(([catName, catProducts]) => (
          <div key={catName} style={{ marginBottom: 32 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{catName}</h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
              {catProducts.map(p => <div key={p.id} style={{ flexShrink: 0, width: 160 }}><ProductCard product={p} /></div>)}
            </div>
          </div>
        ))}
      </>
    )}
  </>
)}

{event.status === 'ended' && (
  <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
    <p style={{ margin: 0, fontSize: 14 }}>This event has ended — thanks to everyone who joined!</p>
  </div>
)}

{ToastComponent}
{confirmLeave && (
  <ConfirmModal
    title="Leave this event?"
    message="You can rejoin later if it hasn't started yet."
    confirmLabel="Leave Event"
    danger
    onConfirm={handleLeave}
    onClose={() => setConfirmLeave(false)}
  />
)}

{showJoinSheet && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
    {/* Backdrop */}
    <div onClick={() => setShowJoinSheet(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />

    {/* Sheet Content */}
    <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: '#111', borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', zIndex: 1 }}>
      <h3 style={{ margin: '0 0 12px', color: '#fff', fontSize: 17, fontWeight: 800 }}>Why join {event.title}?</h3>

      {/* Perks List */}
      <ul style={{ margin: '0 0 18px', paddingLeft: 18, color: 'rgba(255,255,255,0.65)', fontSize: 12.5, lineHeight: 1.8 }}>
        <li>🔥 Guaranteed placement on the event page & main shop banner</li>
        <li>🏆 Top seller wins an exclusive <strong style={{ color: '#fff' }}>"{event.title} Champion"</strong> badge</li>
        {event.event_fee_percent != null && (
          <li>💰 Reduced platform fee of <strong style={{ color: '#fff' }}>{event.event_fee_percent}%</strong> during the event</li>
        )}
        {event.scavenger_hunt_target && (
          <li>🎯 Buyers encouraged to shop across <strong style={{ color: '#fff' }}>{event.scavenger_hunt_target}</strong> sellers</li>
        )}
      </ul>

      {/* Information Box */}
      <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 1.5 }}>
          Picking a tier automatically discounts <strong style={{ color: '#fff' }}>all active listings</strong> for the event duration and reverts instantly when it ends.
        </p>
      </div>

      <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>Select discount tier:</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(event.discount_tiers ?? []).map(p => (
          <button
            key={p}
            onClick={() => {
              handleJoin(p);
              setShowJoinSheet(false);
            }}
            disabled={joining}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              background: event.theme_color ?? '#FF6B35',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {p}% off
          </button>
        ))}
      </div>
    </div>
  </div>
)}
        </div>
      </div>
      <style>{`
      @keyframes spin{to{transform:rotate(360deg)}}
     .hscroller-arrow { display: none; }
@media (min-width: 768px) {
  .hscroller-arrow { display: flex; align-items: center; justify-content: center; position: absolute; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; cursor: pointer; z-index: 2; }
  .hscroller-left { left: -6px; }
  .hscroller-right { right: -6px; }
}
      `}</style>
    </>
  )
}

EventShow.layout = page => <AppLayout>{page}</AppLayout>

function tierNote(percent) {
  if (percent <= 7)  return 'Barely noticeable to your margin — a safe way to get event visibility'
  if (percent <= 12) return 'The most common choice — a real discount buyers will notice, modest margin impact'
  return 'Your deepest discount — draws the most attention, but the biggest cut to your margin'
}