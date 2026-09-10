import { Link } from '@inertiajs/react'
import { RiCloseLine, RiArrowRightLine } from 'react-icons/ri'

export default function EventAnnounceModal({ event, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 28, overflow: 'hidden' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 1 }}>
          <RiCloseLine size={18} />
        </button>
        {event.banner_image
          ? <img src={event.banner_image} alt={event.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: 140, background: `linear-gradient(135deg, ${event.theme_color ?? '#FF6B35'}, #111)` }} />
        }
        <div style={{ padding: '20px 22px 24px' }}>
          <p style={{ margin: '0 0 6px', color: event.theme_color ?? '#FF6B35', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Happening now</p>
          <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: 21, fontWeight: 800 }}>{event.title}</h2>
          {event.description && <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6 }}>{event.description}</p>}
          <Link href={`/events/${event.id}`} onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', background: event.theme_color ?? '#FF6B35', borderRadius: 14, color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Explore {event.title} <RiArrowRightLine size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}