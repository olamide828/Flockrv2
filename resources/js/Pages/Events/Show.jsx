import { useEffect, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import ProductCard from '@/Components/Product/ProductCard'
import axios from 'axios'
import { RiCheckLine, RiLoader4Line } from 'react-icons/ri'

export default function EventShow({ event, products = [], myParticipation }) {
  const { auth } = usePage().props
  const [countdown, setCountdown]   = useState('')
  const [joining, setJoining]       = useState(false)
  const [joined, setJoined]         = useState(myParticipation)

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

        {event.banner_image
          ? <img src={event.banner_image} alt={event.title} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: 180, background: `linear-gradient(135deg, ${event.theme_color ?? '#FF6B35'}, #111)` }} />
        }

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981' }}>
                  <RiCheckLine size={18} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>You're in with {joined.discount_percent}% off — your prices update automatically for this event.</span>
                </div>
              ) : (
                <>
                  <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Choose your discount tier to join:</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(event.discount_tiers ?? []).map(p => (
                      <button key={p} onClick={() => handleJoin(p)} disabled={joining} style={{ padding: '10px 20px', borderRadius: 12, background: event.theme_color ?? '#FF6B35', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                        {joining ? <RiLoader4Line size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : `${p}% off`}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

EventShow.layout = page => <AppLayout>{page}</AppLayout>