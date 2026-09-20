import { useEffect, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import AppLayout from '@/Layouts/AppLayout'
import axios from 'axios'
import { RiCalendarEventLine, RiArrowRightLine, RiLoader4Line } from 'react-icons/ri'

export default function EventsIndex() {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    axios.get('/api/events').then(r => setEvents(r.data)).catch(() => setEvents([]))
  }, [])

  return (
    <>
      <Head title="Events" />
      <div style={{ height: '100%', overflowY: 'auto', background: '#0A0A0A', color: '#fff', fontFamily: '"DM Sans", sans-serif', padding: '20px 20px 100px' }}>
        <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800 }}>Events</h1>

        {events === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <RiLoader4Line size={28} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <RiCalendarEventLine size={40} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>No events right now — check back soon.</p>
          </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {events.filter(e => e.state !== 'ended').map(e => (
              <Link key={e.id} href={`/events/${e.id}`} style={{ display: 'block', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
                {e.banner_image
                  ? <img src={e.banner_image} alt={e.title} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: 100, background: `linear-gradient(135deg, ${e.theme_color ?? '#FF6B35'}, #111)` }} />
                }
                <div style={{ padding: '14px 18px', background: '#111' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ padding: '2px 10px', borderRadius: 999, background: e.state === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: e.state === 'live' ? '#10B981' : '#3B82F6', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                      {e.state === 'live' ? 'Live now' : 'Upcoming'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{e.participants_count} sellers joined</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{e.title}</h2>
                    <RiArrowRightLine size={18} color="rgba(255,255,255,0.3)" />
                  </div>
                </div>
              </Link>
            ))}

               {events.some(e => e.state === 'ended') && (
              <>
                <p style={{ margin: '20px 0 4px', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700 }}>Past Events</p>
                {events.filter(e => e.state === 'ended').map(e => (
                  <Link key={e.id} href={`/events/${e.id}`} style={{ display: 'block', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', opacity: 0.5, filter: 'grayscale(1)' }}>
                    {e.banner_image
                      ? <img src={e.banner_image} alt={e.title} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: 80, background: '#1a1a1a' }} />
                    }
                    <div style={{ padding: '12px 16px', background: '#111' }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{e.title}</p>
                      <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Ended</p>
                    </div>
                  </Link>
                ))}
              </>
            )}

          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

EventsIndex.layout = page => <AppLayout>{page}</AppLayout>