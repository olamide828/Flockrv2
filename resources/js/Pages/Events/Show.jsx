import { useEffect, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import { RiCheckLine, RiLoader4Line, RiArrowLeftLine } from 'react-icons/ri'

export default function EventShow({ event, products = [], myParticipation }) {
  const { auth } = usePage().props
  const [countdown, setCountdown]   = useState('')
  const [joining, setJoining]       = useState(false)
  const [joined, setJoined]         = useState(myParticipation)

  const [leaving, setLeaving] = useState(false)

const handleLeave = async () => {
  if (!confirm('Leave this event? Your prices will return to normal.')) return
  setLeaving(true)
  try {
    await axios.delete(`/api/events/${event.id}/join`)
    setJoined(null)
  } catch (e) {
    alert(e.response?.data?.message ?? 'Failed to leave event.')
  } finally {
    setLeaving(false)
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
    } catch (e) {
      alert(e.response?.data?.message ?? 'Failed to join event.')
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

          {isSeller && event.status !== 'ended' && (
  <div style={{ padding: '18px', background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, marginBottom: 24 }}>
    {joined ? (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', marginBottom: event.status !== 'active' ? 14 : 0 }}>
          <RiCheckLine size={18} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>You're in with {joined.discount_percent}% off — your prices update automatically for this event.</span>
        </div>
        {event.status !== 'active' && (
          <button onClick={handleLeave} disabled={leaving} style={{ padding: '9px 16px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {leaving ? 'Leaving…' : 'Leave event'}
          </button>
        )}
      </div>
    ) : (
      <>
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#fff', fontSize: 14, fontWeight: 700 }}>Why join {event.title}?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>🔥 Guaranteed placement in the event's discovery page — buyers browsing this event see your products, discount-free browsing doesn't</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>🏆 Top seller during the event wins an exclusive "{event.title} Champion" badge on their profile — permanently</p>
            {event.event_fee_percent != null && (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>💰 Reduced platform fee of {event.event_fee_percent}% during the event (instead of your normal rate)</p>
            )}
            {event.scavenger_hunt_target && (
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>🎯 Buyers are encouraged to shop {event.scavenger_hunt_target} different event sellers to unlock a reward — meaning more buyers are actively browsing beyond just one shop</p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 12, padding: '10px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6 }}>
            Picking a tier automatically discounts <strong style={{ color: '#fff' }}>all your active products</strong> for the event's duration only. You never edit prices manually, and everything reverts to your normal price the instant the event ends.
          </p>
        </div>

        <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Choose your discount tier:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(event.discount_tiers ?? []).map(p => (
            <button key={p} onClick={() => handleJoin(p)} disabled={joining} style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: event.theme_color ?? '#FF6B35', fontSize: 15, fontWeight: 800 }}>{p}% off</p>
                <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{tierNote(p)}</p>
              </div>
              {joining && <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} />}
            </button>
          ))}
        </div>
      </>
    )}
  </div>
)}

<h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700 }}>Deals in this event</h2>
{products.length === 0 ? (
  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No sellers have joined yet — check back soon.</p>
) : (
  <>
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', marginBottom: 32 }}>
      {products.map(p => <div key={p.id} style={{ flexShrink: 0, width: 160 }}><ProductCard product={p} /></div>)}
    </div>

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
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

EventShow.layout = page => <AppLayout>{page}</AppLayout>

function tierNote(percent) {
  if (percent <= 7)  return 'Barely noticeable to your margin — a safe way to get event visibility'
  if (percent <= 12) return 'The most common choice — a real discount buyers will notice, modest margin impact'
  return 'Your deepest discount — draws the most attention, but the biggest cut to your margin'
}