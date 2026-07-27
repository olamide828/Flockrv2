
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { RiCompassDiscoverLine, RiUserUnfollowLine } from 'react-icons/ri'

export default function UserGone() {
  const [hover, setHover] = useState(false)

  return (
    <>
      <Head title="Account unavailable — Flockr" />

      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,92,0,0.06) 0%, #0a0a0a 60%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          width: '100%', maxWidth: 360, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 28,
          padding: '40px 28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}>

          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,92,0,0.08)',
            border: '1.5px solid rgba(255,92,0,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <RiUserUnfollowLine size={28} color="#ff5c00" style={{ opacity: 0.8 }} />
          </div>

          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
            Account unavailable
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.65, margin: '0 0 28px' }}>
            This account has been deactivated or removed. There's plenty more to discover on Flockr.
          </p>

          <button
            onClick={() => router.visit('/')}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
              width: '100%', padding: '14px',
              background: hover ? '#ff7a2e' : '#ff5c00',
              border: 'none', borderRadius: 999,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: hover ? '0 0 36px rgba(255,92,0,0.5)' : '0 0 20px rgba(255,92,0,0.25)',
              transition: 'background 0.2s, box-shadow 0.2s',
            }}
          >
            <RiCompassDiscoverLine size={17} />
            Explore Flockr
          </button>
        </div>
      </div>
    </>
  )
}